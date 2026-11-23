// The Mastra demo's agent runtime, grader and "agent learning" logic. Pure JS with no CSS and
// no network, shared by the page and the API routes. The model call is passed in (callModel), so
// the same loop runs live on the server and is replayed from recorded traces in the browser.
//
// Shapes are Mastra-style on purpose: an agent is instructions + tools (id, description, input
// schema) + memory options (lastMessages) + a step budget (maxSteps); a run is a trace of spans
// (agent, memory, model step, tool call). The demo runs them with this small runner instead of
// @mastra/core (see README: it keeps the site's Next 12 build and lockfile untouched).
import {
  BASELINE_CONFIG,
  CASES,
  CATEGORIES,
  CUSTOMERS,
  ORDERS,
  POLICY,
  TODAY,
  TODAY_LABEL,
  TOOL_ORDER,
} from './data';

// ---------------------------------------------------------------------------------------------
// Dates and text helpers

const DAY = 86_400_000;
const addDays = (iso, days) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
const isIso = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
const clip = (text, max) => {
  const value = String(text ?? '');
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
};
export const normalize = text =>
  String(text || '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .toLowerCase();

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_RE =
  '(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';

function isoFrom(year, month, day) {
  const y = year ? Number(String(year).length === 2 ? `20${year}` : year) : month >= 6 ? 2026 : 2027;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Every calendar date written in a text, as YYYY-MM-DD (year defaults around the store's today). */
export function extractDates(text) {
  const source = String(text || '');
  const found = new Set();
  for (const match of source.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) found.add(`${match[1]}-${match[2]}-${match[3]}`);
  const monthDay = new RegExp(`\\b${MONTH_RE}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:,?\\s+(\\d{4}))?`, 'g');
  for (const match of source.matchAll(monthDay)) {
    const iso = isoFrom(match[3], MONTHS.indexOf(match[1].slice(0, 3).toLowerCase()) + 1, Number(match[2]));
    if (iso) found.add(iso);
  }
  const dayMonth = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH_RE}\\b(?:,?\\s+(\\d{4}))?`, 'g');
  for (const match of source.matchAll(dayMonth)) {
    const iso = isoFrom(match[3], MONTHS.indexOf(match[2].slice(0, 3).toLowerCase()) + 1, Number(match[1]));
    if (iso) found.add(iso);
  }
  for (const match of source.matchAll(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g)) {
    const iso = isoFrom(match[3], Number(match[1]), Number(match[2]));
    if (iso) found.add(iso);
  }
  return [...found];
}

const amounts = text =>
  [...String(text || '').matchAll(/\$\s?(\d[\d,]*(?:\.\d{1,2})?)/g)].map(match => Number(match[1].replace(/,/g, '')));

// ---------------------------------------------------------------------------------------------
// Tools: plain functions over the sample data (no model ever produces a tool result)

function orderView(order) {
  const total = order.items.reduce((sum, line) => sum + line.price, 0);
  return {
    orderId: order.orderId,
    status: order.status,
    placedOn: order.placedOn,
    items: order.items.map(line => ({
      sku: line.sku,
      name: line.name,
      category: line.category,
      price: line.price,
      ...(line.finalSale && { finalSale: true }),
    })),
    total,
    carrier: order.carrier || null,
    tracking: order.tracking || null,
    shippedOn: order.shippedOn || null,
    estimatedDelivery: order.estimatedDelivery || null,
    deliveredOn: order.deliveredOn || null,
    ...(order.note && { note: order.note }),
  };
}

const findOrder = id => ORDERS.find(order => order.orderId === String(id || '').trim());

function rmaFor(orderId, sku) {
  let hash = 7;
  for (const char of `${orderId}:${sku}`) hash = (hash * 31 + char.charCodeAt(0)) % 90000;
  return `RMA-${10000 + hash}`;
}

function pickItem(order, wanted) {
  const words = normalize(wanted).split(/[^a-z0-9]+/).filter(word => word.length > 2);
  let best = null;
  let bestScore = 0;
  for (const line of order.items) {
    const hay = normalize(`${line.name} ${line.category} ${line.sku}`);
    const score = words.filter(word => hay.includes(word) || (word.endsWith('s') && hay.includes(word.slice(0, -1)))).length;
    if (score > bestScore) {
      best = line;
      bestScore = score;
    }
  }
  return best || (order.items.length === 1 ? order.items[0] : null);
}

const TOOL_IMPL = {
  lookupOrder({ orderId }) {
    const order = findOrder(orderId);
    if (!order) return { error: `No order found with id "${clip(orderId, 40)}".` };
    return orderView(order);
  },
  findOrders({ email }) {
    const key = normalize(email).trim();
    const orders = ORDERS.filter(order => order.email === key)
      .sort((a, b) => b.placedOn.localeCompare(a.placedOn))
      .map(order => ({ orderId: order.orderId, placedOn: order.placedOn, itemCount: order.items.length }));
    return { email: key, customer: CUSTOMERS[key] || null, orders };
  },
  returnPolicy({ category, deliveredOn }) {
    const policy = POLICY[category];
    if (!policy) return { error: `Unknown category "${clip(category, 30)}".` };
    const result = {
      category,
      windowDays: policy.windowDays,
      condition: policy.condition,
      finalSale: 'Final-sale items cannot be returned.',
    };
    if (isIso(deliveredOn)) {
      result.returnBy = addDays(deliveredOn, policy.windowDays);
      result.windowOpen = result.returnBy >= TODAY;
    }
    return result;
  },
  startReturn({ orderId, item, reason }) {
    const order = findOrder(orderId);
    if (!order) return { error: `No order found with id "${clip(orderId, 40)}".` };
    const line = pickItem(order, item);
    if (!line) return { error: `No item matching "${clip(item, 40)}" in ${order.orderId}.` };
    if (order.status !== 'delivered')
      return { ok: false, reason: 'not_delivered', message: `${order.orderId} has not been delivered yet, so it cannot be returned.` };
    if (line.finalSale)
      return { ok: false, reason: 'final_sale', message: `${line.name} was a final-sale item and cannot be returned.` };
    const policy = POLICY[line.category];
    const returnBy = addDays(order.deliveredOn, policy.windowDays);
    if (returnBy < TODAY)
      return {
        ok: false,
        reason: 'outside_window',
        returnBy,
        message: `The ${policy.windowDays}-day return window for ${line.name} ended on ${returnBy}.`,
      };
    return {
      ok: true,
      rma: rmaFor(order.orderId, line.sku),
      item: line.name,
      refund: line.price,
      labelSentTo: order.email,
      returnBy,
      reason: clip(reason, 120),
    };
  },
};

/** Checks arguments against the config's input schema, as a schema-validating tool runner would. */
export function validateArgs(config, name, args) {
  const tool = config.tools[name];
  if (!tool) return `Unknown tool "${clip(name, 40)}".`;
  const problems = [];
  for (const [param, spec] of Object.entries(tool.params)) {
    const value = args?.[param];
    if (value == null || value === '') {
      if (tool.required.includes(param)) problems.push(`${param} is required`);
      continue;
    }
    if (typeof value !== 'string') {
      problems.push(`${param} must be a string`);
      continue;
    }
    if (spec.enum && !spec.enum.includes(value)) problems.push(`${param} must be one of ${spec.enum.join(', ')}`);
    if (spec.pattern) {
      let ok = true;
      try {
        ok = new RegExp(spec.pattern).test(value);
      } catch {
        ok = true;
      }
      if (!ok) problems.push(`${param} must match ${spec.pattern} (got "${clip(value, 30)}")`);
    }
  }
  return problems.length ? `Invalid arguments: ${problems.join('; ')}.` : null;
}

/** Runs one tool call: schema check, then the function. status: ok | error | refused. */
export function executeTool(config, name, args) {
  const invalid = validateArgs(config, name, args);
  if (invalid) return { result: { error: invalid }, status: 'error', validation: true };
  const result = TOOL_IMPL[name](args || {});
  if (result.error) return { result, status: 'error' };
  if (result.ok === false) return { result, status: 'refused' };
  return { result, status: 'ok' };
}

/** The config's tools as OpenAI-style function definitions (what the model sees). */
export function toolDefs(config) {
  return TOOL_ORDER.map(name => {
    const tool = config.tools[name];
    const properties = {};
    for (const [param, spec] of Object.entries(tool.params)) {
      properties[param] = {
        type: 'string',
        description: spec.description,
        ...(spec.enum && { enum: spec.enum }),
        ...(spec.pattern && { pattern: spec.pattern }),
      };
    }
    return {
      type: 'function',
      function: { name, description: tool.description, parameters: { type: 'object', properties, required: tool.required } },
    };
  });
}

export const systemPrompt = config => `${config.instructions}\n\nToday is ${TODAY_LABEL}.`;

/** What memory hands the model: the last `lastMessages` messages of the thread. */
export const memoryWindow = (thread, lastMessages) => thread.slice(-Math.max(1, lastMessages));

// ---------------------------------------------------------------------------------------------
// The agent loop

/**
 * Runs one case. callModel({ system, messages, tools }) -> { content, toolCalls: [{ id, name, args }],
 * usage: { input, output }, finishReason }. now() gives ms (performance.now on the server).
 * Returns a trace: { spans, final, stop, steps, tokens, ms }.
 */
export async function runAgent({ config, testCase, callModel, now = () => Date.now() }) {
  const t0 = now();
  const at = () => Math.round(now() - t0);
  const window = memoryWindow(testCase.thread, config.memory.lastMessages);
  const spans = [
    {
      id: 'mem',
      kind: 'memory',
      name: 'memory.recall',
      start: 0,
      ms: 0,
      kept: window.length,
      dropped: testCase.thread.length - window.length,
      lastMessages: config.memory.lastMessages,
    },
  ];
  const messages = window.map(message => ({ role: message.role, content: message.content }));
  const tools = toolDefs(config);
  const system = systemPrompt(config);
  const tokens = { input: 0, output: 0 };
  let final = null;
  let stop = 'step-limit';
  let steps = 0;

  for (let step = 1; step <= config.maxSteps; step++) {
    steps = step;
    const start = at();
    let reply;
    try {
      reply = await callModel({ system, messages, tools });
    } catch (error) {
      spans.push({ id: `m${step}`, kind: 'model', name: `model step ${step}`, start, ms: at() - start, error: clip(error?.message, 160) });
      stop = 'error';
      break;
    }
    tokens.input += reply.usage?.input || 0;
    tokens.output += reply.usage?.output || 0;
    const calls = (reply.toolCalls || []).slice(0, 4).map((call, index) => ({
      id: call.id || `call_${step}_${index}`,
      name: call.name,
      args: call.args && typeof call.args === 'object' ? call.args : {},
    }));
    spans.push({
      id: `m${step}`,
      kind: 'model',
      name: `model step ${step}`,
      start,
      ms: at() - start,
      tokens: { input: reply.usage?.input || 0, output: reply.usage?.output || 0 },
      finish: calls.length ? 'tool-calls' : 'stop',
      text: clip(reply.content, 1200),
      calls: calls.map(call => call.name),
    });
    if (!calls.length) {
      final = String(reply.content || '').trim();
      stop = 'answer';
      break;
    }
    messages.push({
      role: 'assistant',
      content: reply.content || '',
      tool_calls: calls.map(call => ({ id: call.id, type: 'function', function: { name: call.name, arguments: JSON.stringify(call.args) } })),
    });
    for (const call of calls) {
      const toolStart = at();
      const { result, status, validation } = executeTool(config, call.name, call.args);
      spans.push({
        id: `t${step}${call.id.slice(-4)}${spans.length}`,
        kind: 'tool',
        name: call.name,
        step,
        start: toolStart,
        ms: Math.max(0, at() - toolStart),
        args: call.args,
        result,
        status,
        ...(validation && { validation: true }),
      });
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }

  const ms = at();
  return {
    spans: [{ id: 'run', kind: 'agent', name: 'agent.generate', start: 0, ms, steps, maxSteps: config.maxSteps }, ...spans],
    final,
    stop,
    steps,
    tokens,
    ms,
  };
}

// ---------------------------------------------------------------------------------------------
// Grading and failure causes (all in code)

export const CAUSES = {
  memory: {
    label: 'Missing memory or context',
    short: 'Lost context',
    signal: 'The answer needed a fact from an earlier message, and the memory window dropped it.',
    fix: 'the memory window (lastMessages)',
  },
  wrong_tool: {
    label: 'Wrong tool chosen',
    short: 'Wrong tool',
    signal: 'Called a tool the request did not ask for, or never called the one it needed.',
    fix: 'tool descriptions that say what each tool returns and when to use it, or instructions on tool use',
  },
  bad_args: {
    label: 'Bad tool arguments',
    short: 'Bad arguments',
    signal: 'A tool call failed validation or found nothing because of its arguments.',
    fix: 'the parameter schema: a description of the expected format and a pattern',
  },
  early_stop: {
    label: 'Stopped early',
    short: 'Stopped early',
    signal: 'The run used up its step budget with a tool call pending, or answered before the last lookup.',
    fix: 'the step budget (maxSteps), or an instruction to finish the lookup before answering',
  },
  hallucination: {
    label: 'Hallucinated field',
    short: 'Made-up field',
    signal: 'The answer states a date, amount or tracking number that no tool returned.',
    fix: 'instructions about stating only facts that tool results contain',
  },
  answer: {
    label: 'Incomplete answer',
    short: 'Incomplete',
    signal: 'Called the right tools but left out what the customer asked for.',
    fix: 'instructions',
  },
};

export const CAUSE_ORDER = ['wrong_tool', 'bad_args', 'hallucination', 'memory', 'early_stop', 'answer'];

const toolSpans = trace => trace.spans.filter(span => span.kind === 'tool');

/** Facts in the answer that appear in no tool result and no message: dates, ids, amounts, day counts. */
export function inventedFacts(testCase, trace) {
  const text = trace.final || '';
  if (!text) return [];
  const results = toolSpans(trace).map(span => JSON.stringify(span.result)).join(' ');
  const thread = testCase.thread.map(message => message.content).join(' ');
  const hay = `${results} ${thread} ${TODAY}`;
  const allowedDates = new Set([...extractDates(hay), TODAY]);
  const numbers = new Set([...hay.matchAll(/\b\d+(?:\.\d+)?\b/g)].map(match => Number(match[0])));
  const invented = [];
  for (const date of extractDates(text)) if (!allowedDates.has(date)) invented.push({ kind: 'date', value: date });
  for (const match of text.matchAll(/\b(1Z[0-9A-Z]{8,}|9\d{15,25}|\d{12})\b/g))
    if (!hay.includes(match[1])) invented.push({ kind: 'tracking number', value: match[1] });
  for (const match of text.matchAll(/\bRMA-\d+\b/g)) if (!hay.includes(match[0])) invented.push({ kind: 'return id', value: match[0] });
  for (const value of amounts(text)) if (!numbers.has(value)) invented.push({ kind: 'amount', value: `$${value}` });
  for (const match of text.matchAll(/\b(\d+)(?:\s*(?:-|–|to)\s*(\d+))?[\s-]*(?:business\s+|working\s+)?days?\b/gi)) {
    const values = [match[1], match[2]].filter(Boolean).map(Number);
    if (values.some(value => !numbers.has(value))) invented.push({ kind: 'day count', value: match[0].trim() });
  }
  return invented;
}

function hasFact(text, fact) {
  const said = normalize(text);
  if (fact.any) return fact.any.some(phrase => said.includes(normalize(phrase)));
  if (fact.date) return extractDates(text).includes(fact.date);
  if (fact.money != null) return amounts(text).includes(fact.money) || said.includes(`${fact.money}.00`);
  return false;
}

const factLabel = fact =>
  fact.date ? `States ${fact.date}` : fact.money != null ? `States $${fact.money}` : `Says "${clip(fact.any[0], 28)}"${fact.any.length > 1 ? ' or similar' : ''}`;

const sameValue = (a, b) => normalize(a).trim() === normalize(b).trim();

/**
 * Grades one trace against its case. Returns { pass, cause, checks, signal }: checks are rows for
 * a check list ({ id, label, status, detail }), cause is the primary failure cause (CAUSES key).
 */
export function grade(testCase, trace) {
  const expect = testCase.expect;
  const calls = toolSpans(trace);
  const forbid = expect.forbid || (expect.tools.includes('startReturn') ? [] : ['startReturn']);
  const finished = trace.stop === 'answer' && Boolean(trace.final);
  const forbidden = calls.filter(call => forbid.includes(call.name));
  const missingTools = expect.tools.filter(name => !calls.some(call => call.name === name && call.status !== 'error'));
  const argMisses = Object.entries(expect.args || {}).filter(
    ([name, want]) =>
      !calls.some(call => call.name === name && Object.entries(want).every(([key, value]) => sameValue(call.args?.[key], value)))
  );
  const failedCalls = calls.filter(call => call.status === 'error');
  const recallUsed = expect.recall
    ? calls.some(call => normalize(JSON.stringify(call.args)).includes(normalize(expect.recall)))
    : true;
  const memorySpan = trace.spans.find(span => span.kind === 'memory');
  const invented = inventedFacts(testCase, trace);
  const missingFacts = finished ? (expect.facts || []).filter(fact => !hasFact(trace.final, fact)) : expect.facts || [];

  const checks = [];
  if (expect.recall)
    checks.push({
      id: 'context',
      label: 'Uses the earlier message',
      status: recallUsed ? 'pass' : 'fail',
      detail: recallUsed
        ? `Passed ${expect.recall} to a tool.`
        : `Memory kept ${memorySpan?.kept ?? '?'} of ${testCase.thread.length} messages; ${expect.recall} never reached a tool.`,
    });
  checks.push({
    id: 'tools',
    label: 'Right tools',
    status: forbidden.length || missingTools.length ? 'fail' : 'pass',
    detail: forbidden.length
      ? `Called ${forbidden.map(call => call.name).join(', ')} on a question${forbidden.some(call => call.status === 'ok') ? ' (and it went through)' : ''}.`
      : missingTools.length && !calls.length
      ? `Called no tool; ${missingTools.join(', ')} was needed.`
      : missingTools.length
      ? `Never got a result from ${missingTools.join(', ')}.`
      : `Called ${[...new Set(calls.map(call => call.name))].join(', ') || 'no tools'}.`,
  });
  if (expect.args)
    checks.push({
      id: 'args',
      label: 'Valid arguments',
      status: argMisses.length ? 'fail' : failedCalls.length ? 'warn' : 'pass',
      detail: argMisses.length
        ? failedCalls.length
          ? `${failedCalls[0].name}(${clip(JSON.stringify(failedCalls[0].args), 60)}): ${clip(failedCalls[0].result?.error, 90)}`
          : `Expected ${argMisses.map(([name, want]) => `${name}(${JSON.stringify(want)})`).join(', ')}.`
        : failedCalls.length
        ? `Recovered after ${failedCalls.length} rejected call${failedCalls.length > 1 ? 's' : ''}.`
        : 'Every call matched the expected arguments.',
    });
  checks.push({
    id: 'finished',
    label: 'Finished with an answer',
    status: finished ? 'pass' : 'fail',
    detail: finished
      ? `Answered at step ${trace.steps} of ${trace.spans[0].maxSteps}.`
      : trace.stop === 'error'
      ? 'The model call failed.'
      : `Step budget (${trace.spans[0].maxSteps}) ran out with a tool call pending.`,
  });
  checks.push({
    id: 'grounded',
    label: 'Only facts from tool results',
    status: !finished ? 'na' : invented.length ? 'fail' : 'pass',
    detail: !finished
      ? 'No answer to check.'
      : invented.length
      ? `Not in any tool result: ${invented.map(item => `${item.kind} ${item.value}`).join(', ')}.`
      : 'Every date, id and amount traced to a tool result.',
  });
  checks.push({
    id: 'facts',
    label: 'Answers the question',
    status: !finished ? 'na' : missingFacts.length ? 'fail' : 'pass',
    detail: !finished
      ? 'No answer to check.'
      : missingFacts.length
      ? `Missing: ${missingFacts.map(factLabel).join('; ')}.`
      : (expect.facts || []).map(factLabel).join('; '),
  });

  // The primary cause: the first that applies, in the order a fix would have to happen
  const calledWrongArgs = argMisses.filter(([name]) => calls.some(call => call.name === name));
  const progressed = calls.some(call => expect.tools.includes(call.name) && call.status === 'ok');
  let cause = null;
  let signal = null;
  if (!recallUsed) cause = 'memory';
  else if (forbidden.length) cause = 'wrong_tool';
  else if (calledWrongArgs.length) cause = 'bad_args';
  else if (!finished) cause = 'early_stop';
  else if (missingTools.length && progressed) {
    cause = 'early_stop';
    signal = `Answered after ${calls.map(call => call.name).join(', ')} without calling ${missingTools.join(', ')}.`;
  } else if (missingTools.length) {
    cause = 'wrong_tool';
    signal = calls.length
      ? `Called ${calls.map(call => call.name).join(', ')}; never called ${missingTools.join(', ')}.`
      : `Called no tool and asked the customer instead of using ${missingTools.join(', ')}.`;
  } else if (invented.length) cause = 'hallucination';
  else if (missingFacts.length) cause = 'answer';
  const pass = !cause;
  const failing = checks.find(check => check.status === 'fail');
  return { pass, cause, checks, signal: pass ? null : signal || failing?.detail || CAUSES[cause].signal };
}

/** Failures grouped by cause, largest first. results: { [caseId]: { trace, grade } }. */
export function clusterResults(results) {
  const groups = {};
  for (const [caseId, result] of Object.entries(results)) {
    if (!result?.grade || result.grade.pass) continue;
    (groups[result.grade.cause] ||= []).push(caseId);
  }
  return Object.entries(groups)
    .map(([cause, caseIds]) => ({ cause, caseIds: caseIds.sort() }))
    .sort((a, b) => b.caseIds.length - a.caseIds.length || CAUSE_ORDER.indexOf(a.cause) - CAUSE_ORDER.indexOf(b.cause));
}

/** Pass count, tokens and time for a set of results. */
export function summarize(results) {
  const list = Object.values(results).filter(result => result?.grade);
  const sum = pick => list.reduce((total, result) => total + pick(result), 0);
  const n = list.length || 1;
  return {
    n: list.length,
    pass: list.filter(result => result.grade.pass).length,
    tokens: Math.round(sum(result => result.trace.tokens.input + result.trace.tokens.output) / n),
    ms: Math.round(sum(result => result.trace.ms) / n),
    steps: Math.round((sum(result => result.trace.steps) / n) * 10) / 10,
    llmCalls: sum(result => result.trace.spans.filter(span => span.kind === 'model').length),
  };
}

/**
 * Before / after over the same cases: per-cluster fixes, regressions (passed before, fail after)
 * and the gate: promote only if the pass count rises and nothing that passed now fails.
 */
export function compareRuns(before, after) {
  const ids = Object.keys(before).filter(id => before[id]?.grade && after[id]?.grade).sort();
  const pick = (results, list) => Object.fromEntries(list.map(id => [id, results[id]]));
  const b = summarize(pick(before, ids));
  const a = summarize(pick(after, ids));
  const clusters = clusterResults(pick(before, ids)).map(cluster => ({
    ...cluster,
    fixed: cluster.caseIds.filter(id => after[id].grade.pass),
    still: cluster.caseIds.filter(id => !after[id].grade.pass).map(id => ({ id, cause: after[id].grade.cause })),
  }));
  const regressions = ids
    .filter(id => before[id].grade.pass && !after[id].grade.pass)
    .map(id => ({ id, cause: after[id].grade.cause, signal: after[id].grade.signal }));
  const gain = a.pass - b.pass;
  const verdict = gain > 0 && !regressions.length ? 'promote' : gain > 0 ? 'review' : 'hold';
  return { ids, before: b, after: a, clusters, regressions, gain, verdict };
}

// ---------------------------------------------------------------------------------------------
// Config: validation, suggested changes, the Mastra-style rendering and a line diff

/** Clamps a config from the browser to the known shape (tools and params cannot be added). */
export function normalizeConfig(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const int = (value, min, max, fallback) => {
    const number = Math.round(Number(value));
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  };
  const tools = {};
  for (const name of TOOL_ORDER) {
    const base = BASELINE_CONFIG.tools[name];
    const given = source.tools?.[name] || {};
    const params = {};
    for (const [param, spec] of Object.entries(base.params)) {
      const next = given.params?.[param] || {};
      const pattern = clip(next.pattern || '', 80);
      params[param] = {
        type: 'string',
        description: clip(next.description ?? spec.description, 240),
        ...(spec.enum && { enum: CATEGORIES }),
        ...(pattern && compiles(pattern) && { pattern }),
      };
    }
    tools[name] = { description: clip(given.description ?? base.description, 320), params, required: base.required };
  }
  return {
    version: clip(source.version || 'v1', 16),
    instructions: clip(source.instructions ?? BASELINE_CONFIG.instructions, 2400),
    tools,
    memory: { lastMessages: int(source.memory?.lastMessages, 1, 20, BASELINE_CONFIG.memory.lastMessages) },
    maxSteps: int(source.maxSteps, 1, 8, BASELINE_CONFIG.maxSteps),
  };
}

function compiles(pattern) {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

const clone = value => JSON.parse(JSON.stringify(value));

/**
 * Applies suggested changes to a config. Each change is checked: known tool and param, a regex
 * that compiles, numbers in range. Returns { config, applied, rejected: [{ change, why }] }.
 */
export function applyChanges(config, changes) {
  const next = clone(config);
  const applied = [];
  const rejected = [];
  for (const change of Array.isArray(changes) ? changes : []) {
    const why = applyOne(next, change);
    if (why) rejected.push({ change, why });
    else applied.push(change);
  }
  return { config: next, applied, rejected };
}

function applyOne(config, change) {
  switch (change?.kind) {
    case 'instructions': {
      const remove = String(change.remove || '').trim();
      const add = clip(String(change.add || '').trim(), 400);
      if (!remove && !add) return 'empty change';
      const lines = config.instructions.split('\n');
      let index = -1;
      if (remove) {
        index = lines.findIndex(line => normalize(line).trim() === normalize(remove));
        if (index < 0) index = lines.findIndex(line => normalize(line).includes(normalize(remove)) && remove.length > 12);
        if (index < 0) return 'line to remove not found';
      }
      if (index >= 0) lines.splice(index, 1, ...(add ? [add] : []));
      else lines.splice(Math.max(1, lines.length - 1), 0, add);
      config.instructions = lines.join('\n');
      return null;
    }
    case 'tool_description': {
      const tool = config.tools[change.tool];
      const text = clip(String(change.text || '').trim(), 320);
      if (!tool) return `unknown tool ${change.tool}`;
      if (!text) return 'empty description';
      tool.description = text;
      return null;
    }
    case 'param': {
      const spec = config.tools[change.tool]?.params?.[change.param];
      if (!spec) return `unknown parameter ${change.tool}.${change.param}`;
      const description = clip(String(change.description || '').trim(), 240);
      const pattern = String(change.pattern || '').trim();
      if (pattern && (pattern.length > 80 || !compiles(pattern))) return 'pattern does not compile';
      if (!description && !pattern) return 'empty change';
      if (description) spec.description = description;
      if (pattern) spec.pattern = pattern;
      return null;
    }
    case 'memory': {
      const value = Math.round(Number(change.lastMessages));
      if (!(value >= 2 && value <= 20)) return 'lastMessages must be 2-20';
      config.memory.lastMessages = value;
      return null;
    }
    case 'max_steps': {
      const value = Math.round(Number(change.value));
      if (!(value >= 2 && value <= 8)) return 'maxSteps must be 2-8';
      config.maxSteps = value;
      return null;
    }
    default:
      return `unknown change kind ${clip(change?.kind, 20)}`;
  }
}

const quote = text => {
  const value = String(text).replace(/\\/g, '\\\\');
  if (value.includes("'") && !value.includes('"')) return `"${value}"`;
  return `'${value.replace(/'/g, "\\'")}'`;
};

/** The config as Mastra-style TypeScript, one fact per line so diffs stay small. */
export function renderConfig(config) {
  const lines = [
    "export const supportAgent = new Agent({",
    "  name: 'fernway-support',",
    '  instructions: [',
    ...config.instructions.split('\n').filter(Boolean).map(line => `    ${quote(line)},`),
    "  ].join('\\n'),",
    '  model: llm,',
    `  tools: { ${TOOL_ORDER.join(', ')} },`,
    `  memory: new Memory({ options: { lastMessages: ${config.memory.lastMessages} } }),`,
    `  defaultGenerateOptions: { maxSteps: ${config.maxSteps} },`,
    '});',
  ];
  for (const name of TOOL_ORDER) {
    const tool = config.tools[name];
    lines.push('', `export const ${name} = createTool({`, `  id: ${quote(name)},`, `  description: ${quote(tool.description)},`, '  inputSchema: z.object({');
    for (const [param, spec] of Object.entries(tool.params)) {
      const base = spec.enum ? `z.enum([${spec.enum.map(quote).join(', ')}])` : 'z.string()';
      const regex = spec.pattern ? `.regex(/${spec.pattern.replace(/\//g, '\\/')}/)` : '';
      const optional = tool.required.includes(param) ? '' : '.optional()';
      lines.push(`    ${param}: ${base}${regex}${optional}.describe(${quote(spec.description)}),`);
    }
    lines.push('  }),', `  execute: ${name}Impl,`, '});');
  }
  return lines.join('\n');
}

/** Unified line diff (LCS) with `context` lines around each change. Returns { text, added, removed }. */
export function diffText(before, after, context = 1) {
  const a = before.split('\n');
  const b = after.split('\n');
  const n = a.length;
  const m = b.length;
  const table = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push([' ', a[i]]);
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) ops.push(['-', a[i++]]);
    else ops.push(['+', b[j++]]);
  }
  while (i < n) ops.push(['-', a[i++]]);
  while (j < m) ops.push(['+', b[j++]]);
  const keep = ops.map((op, index) => op[0] !== ' ' || ops.slice(Math.max(0, index - context), index + context + 1).some(near => near[0] !== ' '));
  const out = [];
  let gap = false;
  ops.forEach((op, index) => {
    if (!keep[index]) {
      gap = true;
      return;
    }
    if (gap && out.length) out.push('  …');
    gap = false;
    out.push(`${op[0]} ${op[1].trimStart() === op[1] ? op[1] : op[1].replace(/^ {2}/, '')}`);
  });
  return {
    text: out.join('\n'),
    added: ops.filter(op => op[0] === '+').length,
    removed: ops.filter(op => op[0] === '-').length,
  };
}

/** One failing case, condensed for the suggestion prompt (the server clamps it again). */
export function condense(testCase, result) {
  return {
    case: testCase.id,
    thread: testCase.thread.map(message => `${message.role}: ${clip(message.content, 200)}`),
    memoryKept: result.trace.spans.find(span => span.kind === 'memory')?.kept,
    calls: toolSpans(result.trace).map(span => ({
      tool: span.name,
      args: span.args,
      result: clip(JSON.stringify(span.result), 220),
    })),
    stop: result.trace.stop,
    why: result.grade.signal,
    answer: clip(result.trace.final || '', 260),
    failed: result.grade.checks.filter(check => check.status === 'fail').map(check => `${check.label}: ${clip(check.detail, 160)}`),
  };
}

/** Up to four tool calls that worked in passing cases, as `name(args)`: contrast for the suggester. */
export function workingCalls(results, caseIds) {
  const wanted = new Set(caseIds.flatMap(id => CASES.find(testCase => testCase.id === id)?.expect.tools || []));
  const seen = new Set();
  const out = [];
  for (const result of Object.values(results)) {
    if (!result?.grade?.pass) continue;
    for (const span of toolSpans(result.trace)) {
      const line = `${span.name}(${JSON.stringify(span.args)})`;
      if (span.status !== 'ok' || !wanted.has(span.name) || seen.has(span.name) || out.length >= 4) continue;
      seen.add(span.name);
      out.push(clip(line, 140));
    }
  }
  return out;
}

export const caseText =testCase => testCase.thread[testCase.thread.length - 1].content;
export { CASES };

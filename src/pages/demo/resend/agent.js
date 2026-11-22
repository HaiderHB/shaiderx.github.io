// The agent loop and the agent UX report. The model is injected (turn), so this file is plain
// logic: the prompt, the tool loop over tools.js, the run reducer the page uses, and the report
// that compares two runs (steps, errors, retries, tokens, outcome), all computed in code.
import { AUDIENCES, TEST_INBOX, WORKSPACE, callTool, describeNow, modelTools, newWorld, templateVersion, tomorrowAt } from './tools.js';

export const MAX_TURNS = 14;
export const MAX_CALLS = 26;
const MAX_CALLS_PER_TURN = 4;

export const HERO_TASK =
  'Send our beta users a launch email for the new dashboard, with a plain-text version, tomorrow 9am ET.';

export const PRESETS = [
  { id: 'launch', label: 'Dashboard launch', task: HERO_TASK },
  {
    id: 'funnels',
    label: 'Live funnels note',
    task: 'Email the internal team list a short note that live funnels ship on Monday, plain text included, Monday 10am ET.',
  },
];

export function systemPrompt(nowMs) {
  return `You are an email agent for the ${WORKSPACE.company} team. You work only through the email tool server's tools.
Now: ${describeNow(nowMs)}. Times the team gives are New York time (ET) unless they say otherwise.

Workspace (facts you may use; never invent others):
${JSON.stringify(WORKSPACE, null, 1)}

How to work:
- Do the whole task with the tools, step by step. Take ids from tool results; never guess one.
- Write the copy yourself: short, plain and friendly, no hype.
- Before any send, preview and lint the email, and fix everything lint flags (errors and warnings).
- When you are done, reply in two short sentences: what you did, and what now waits for a person.`;
}

/**
 * Runs one task. models: { turn({ system, messages, tools }) -> { content, toolCalls, usage, ms } }.
 * emit gets every event. Returns { events, world }.
 */
export async function runAgent({ task, variant = 'clear', now = Date.now(), budgetMs = Infinity }, models, emit) {
  const events = [];
  const send = event => {
    events.push(event);
    emit?.(event);
  };
  const started = Date.now();
  let world = newWorld(now);
  const system = systemPrompt(now);
  const tools = modelTools(variant);
  const messages = [{ role: 'user', content: task }];
  let calls = 0;
  let final = '';
  send({ t: 'start', variant, task, now });

  let outOfTime = false;
  for (let n = 1; n <= MAX_TURNS && calls < MAX_CALLS; n++) {
    // A time budget keeps a run inside the serverless function's limit; a slow run stops, it is not cut off
    if (Date.now() - started > budgetMs) {
      outOfTime = true;
      break;
    }
    const out = await models.turn({ system, messages, tools });
    const usage = out.usage || estimateUsage(system, messages, out);
    send({ t: 'turn', n, ms: out.ms ?? null, tokensIn: usage.inputTokens, tokensOut: usage.outputTokens, estimated: !out.usage, content: trim(out.content, 600) });
    const toolCalls = (out.toolCalls || []).slice(0, MAX_CALLS_PER_TURN);
    if (!toolCalls.length) {
      final = trim(out.content, 600);
      break;
    }
    messages.push({
      role: 'assistant',
      content: out.content || '',
      tool_calls: toolCalls.map(call => ({ id: call.id, type: 'function', function: { name: call.name, arguments: JSON.stringify(call.args || {}) } })),
    });
    for (const call of toolCalls) {
      calls += 1;
      const id = `c${calls}`;
      send({ t: 'call', id, n, name: call.name, args: call.args || {} });
      const begun = Date.now();
      const ran = callTool(world, call.name, call.args, variant);
      world = ran.world;
      send({ t: 'result', id, isError: ran.isError, code: ran.code || null, result: ran.result, ms: Date.now() - begun });
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(ran.result) });
    }
  }
  send({ t: 'final', text: final || (outOfTime ? 'Stopped at the time budget.' : 'Stopped at the step budget.') });
  send({ t: 'done', ms: Date.now() - started });
  return { events, world };
}

const trim = (value, max) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);

// When a provider returns no usage, count about four characters a token (flagged as estimated)
function estimateUsage(system, messages, out) {
  const chars = system.length + JSON.stringify(messages).length;
  return { inputTokens: Math.round(chars / 4), outputTokens: Math.round((String(out.content || '').length + JSON.stringify(out.toolCalls || []).length) / 4) };
}

// ---- run state for the page: the same reducer for live streams and recorded runs -------------

export function emptyRun(kind = 'example') {
  return { kind, variant: 'clear', task: '', now: null, world: null, calls: [], turns: [], final: '', done: false, ms: null, error: null, cached: false };
}

/** Folds one event in. Tool results are recomputed in the browser from the recorded call (callTool is pure). */
export function reduceRun(run, event) {
  switch (event.t) {
    case 'meta':
      return { ...run, cached: Boolean(event.cached) };
    case 'start':
      return { ...run, variant: event.variant, task: event.task, now: event.now, world: newWorld(event.now), calls: [], turns: [], final: '', done: false };
    case 'turn':
      return { ...run, turns: [...run.turns, event] };
    case 'call':
      return { ...run, calls: [...run.calls, { id: event.id, n: event.n, name: event.name, args: event.args, status: 'running' }] };
    case 'result': {
      const call = run.calls.find(item => item.id === event.id);
      const ran = call && run.world ? callTool(run.world, call.name, call.args, run.variant) : null;
      return {
        ...run,
        world: ran ? ran.world : run.world,
        calls: run.calls.map(item =>
          item.id === event.id ? { ...item, status: event.isError ? 'error' : 'ok', isError: event.isError, code: event.code, result: event.result } : item
        ),
      };
    }
    case 'final':
      return { ...run, final: event.text };
    case 'done':
      return { ...run, done: true, ms: event.ms };
    case 'error':
      return { ...run, error: event.message, done: true };
    default:
      return run;
  }
}

export const foldRun = events => events.reduce(reduceRun, emptyRun());

// ---- the agent UX report ---------------------------------------------------------------------

/** The template the run ended on: the latest version of the template it last touched. */
export function finalTemplate(run) {
  const world = run.world;
  if (!world) return null;
  const lastCall = [...run.calls].reverse().find(call => !call.isError && call.result?.template_id);
  const id = lastCall?.result?.template_id || Object.keys(world.templates)[0];
  return id ? { id, ...templateVersion(world, id) } : null;
}

const formatShort = ms =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(ms));

/**
 * Outcome checks for the hero task, in code, against the run's final world: what a person would
 * check before approving. Every check: { id, label, expected, actual, pass }.
 */
export function outcomeChecks(run) {
  const world = run.world;
  if (!world) return [];
  const template = finalTemplate(run);
  const lint = template ? world.lints[`${template.id}@${template.version}`] : null;
  const broadcast = world.broadcasts[world.broadcasts.length - 1] || null;
  const dryRuns = run.calls.filter(call => call.name === 'schedule_broadcast' && call.result?.dry_run).length;
  const expectedAt = tomorrowAt(world.now);
  const tested = template && world.outbox.some(message => message.template_id === template.id && message.version === template.version);
  const beta = AUDIENCES[0];
  return [
    {
      id: 'text',
      label: 'Plain-text part',
      expected: 'present',
      actual: template?.text?.trim() ? `${template.text.trim().length} characters` : 'missing',
      pass: Boolean(template?.text?.trim()),
    },
    {
      id: 'lint',
      label: 'Lint on the final version',
      expected: '0 errors',
      actual: lint ? `${lint.errors} errors, ${lint.warnings} warnings` : 'not linted',
      pass: Boolean(lint && lint.errors === 0),
    },
    {
      id: 'test',
      label: 'Test of the final version',
      expected: TEST_INBOX,
      actual: tested ? 'in the sandbox outbox' : 'none',
      pass: Boolean(tested),
    },
    {
      id: 'queued',
      label: 'Broadcast queued for approval',
      expected: 'yes',
      actual: broadcast ? broadcast.broadcast_id : dryRuns ? `only ${dryRuns} dry run${dryRuns > 1 ? 's' : ''}` : 'no',
      pass: Boolean(broadcast),
    },
    {
      id: 'audience',
      label: 'Audience',
      expected: `${beta.name} (${beta.id})`,
      actual: broadcast ? `${broadcast.audience_name} (${broadcast.audience_id})` : '–',
      pass: broadcast?.audience_id === beta.id,
    },
    {
      id: 'time',
      label: 'Send time',
      expected: formatShort(expectedAt),
      actual: broadcast ? formatShort(Date.parse(broadcast.send_at_utc)) : '–',
      pass: Boolean(broadcast && Date.parse(broadcast.send_at_utc) === expectedAt),
    },
    {
      id: 'key',
      label: 'Idempotency key',
      expected: 'set once',
      actual: broadcast ? broadcast.idempotency_key : '–',
      pass: Boolean(broadcast?.idempotency_key),
    },
  ];
}

const STUMBLE = {
  invalid_args: 'Wrong arguments',
  missing_field: 'Missing field',
  not_found: 'Guessed an id',
  precondition: 'Skipped a step',
  conflict: 'Key reused',
  unknown_tool: 'Unknown tool',
};

/** Steps, errors, retries and tokens of one run, and each stumble with what the agent did next. */
export function analyseRun(run) {
  const calls = run.calls;
  const errors = calls.filter(call => call.isError);
  const retries = calls.filter((call, index) => index > 0 && calls[index - 1].isError && calls[index - 1].name === call.name).length;
  const tokensIn = run.turns.reduce((sum, turn) => sum + (turn.tokensIn || 0), 0);
  const tokensOut = run.turns.reduce((sum, turn) => sum + (turn.tokensOut || 0), 0);
  const checks = outcomeChecks(run);
  const stumbles = errors.map(call => {
    const index = calls.indexOf(call);
    const next = calls[index + 1];
    // What the agent said in the turn after it read the error: its guess at the fix
    const thought = run.turns.find(turn => turn.n === call.n + 1)?.content || '';
    return {
      thought,
      id: call.id,
      name: call.name,
      kind: STUMBLE[call.code] || 'Error',
      code: call.code,
      message: call.result?.error || '',
      args: call.args,
      next: next ? `${next.name}${next.isError ? ' (failed again)' : ''}` : 'stopped',
      recovered: Boolean(next && next.name === call.name && !next.isError),
    };
  });
  return {
    turns: run.turns.length,
    steps: calls.length,
    errors: errors.length,
    retries,
    wrongArgs: errors.filter(call => call.code === 'invalid_args' || call.code === 'unknown_tool').length,
    missing: errors.filter(call => call.code === 'missing_field').length,
    guessed: errors.filter(call => call.code === 'not_found').length,
    skipped: errors.filter(call => call.code === 'precondition').length,
    tokensIn,
    tokensOut,
    tokens: tokensIn + tokensOut,
    estimated: run.turns.some(turn => turn.estimated),
    ms: run.ms,
    checks,
    passed: checks.filter(check => check.pass).length,
    stumbles,
  };
}

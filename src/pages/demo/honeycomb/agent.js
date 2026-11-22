// The investigation: three agents, one shared canvas, one coordinator. Model calls are
// injected (turn / rank / coordinate), so this file is plain logic: prompts, the loop, the
// canvas, the grounding check and the grader. Tool results come from tools.js, never a model.
import { ALL_ATTRIBUTES, SERVICE_NAMES, STANDARD_ATTRIBUTES, dataset } from './data.js';
import { TOOL_NAMES, alertFor, runTool, triage, verify } from './tools.js';

export const MAX_QUERIES = 3; // per agent
export const MAX_TURNS = 4; // per agent, the last one must publish
export const MAX_SKILLS = 6;
const NEAR_TIE = 5; // evidence-score points within which the simpler culprit wins
const FOLLOW_UP_BELOW = 70; // evidence score under which the coordinator runs one follow-up query
export const MAX_SKILL_TEXT = 320;

export const HYPOTHESES = [
  {
    id: 'deploy',
    letter: 'D',
    title: 'Deploy regression',
    claim: 'A recent code deploy made a service slow or failing, maybe only behind a flag or for some users',
  },
  {
    id: 'tenant',
    letter: 'T',
    title: 'Noisy tenant',
    claim: "One tenant's traffic or request shape is causing the slowness",
  },
  {
    id: 'infra',
    letter: 'I',
    title: 'Infra: pod or region',
    claim: 'One pod, node, region or regional dependency is slow whatever the build',
  },
];
const hypothesisById = id => HYPOTHESES.find(item => item.id === id);

export const DEFAULT_SKILLS = [
  {
    id: 'S1',
    title: 'Synthetic traffic',
    text: 'Tenants named load-test-* are our own load tests. Exclude them (exclude tenant.id = load-test-*) before judging customer impact, and never name one as the root cause. A real tenant can be the cause: if its requests are the slow ones while other tenants around it are healthy, name it.',
  },
  {
    id: 'S2',
    title: 'How we ship',
    text: 'Feature flags live in app.feature_flag.*. Most of our regressions ship behind a flag or hit one user.tier: when a build looks slow, run attribute_diff inside that build on app.feature_flag.*, user.tier and region before you publish.',
  },
  {
    id: 'S3',
    title: 'What is normal',
    text: 'payment-svc p99 over 800 ms pages on-call. cart-svc and inventory-svc p99 under 500 ms is normal, even under load.',
  },
  {
    id: 'S4',
    title: 'Deploys replace pods',
    text: 'A deploy replaces every pod of that service, so new pod names after a deploy are expected. Blame a pod only if its siblings on the same build are healthy; blame a build only if it is slow in every region it runs in, unless a flag or user attribute explains the gap.',
  },
];

/** Skills as they arrive from the page: trimmed, capped, ids S1..Sn kept stable. */
export function cleanSkills(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map(skill => ({
      id: String(skill?.id || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 4),
      title: String(skill?.title || '').replace(/\s+/g, ' ').trim().slice(0, 40),
      text: String(skill?.text || '').replace(/\s+/g, ' ').trim().slice(0, MAX_SKILL_TEXT),
    }))
    .filter(skill => skill.id && skill.text)
    .slice(0, MAX_SKILLS);
}

const FILTER_SCHEMA = {
  type: 'object',
  description: 'attribute -> value. A value may end in * to match a prefix.',
};
const BECAUSE = {
  type: 'string',
  description:
    "Why this query, in under 14 words. Name what prompted it: a team skill id (e.g. S2) or another agent's result id (e.g. T1).",
};

export const TOOL_SPECS = [
  {
    name: 'query',
    description:
      'Group spans by one or two attributes and get count, p50, p99 and error rate per group (top 7).',
    parameters: {
      type: 'object',
      properties: {
        group_by: { type: 'array', items: { type: 'string' }, description: 'One or two attribute names.' },
        where: FILTER_SCHEMA,
        exclude: FILTER_SCHEMA,
        window: { type: 'string', enum: ['incident', 'baseline', 'all'], description: 'incident = since the burn began (default).' },
        order_by: { type: 'string', enum: ['p99_ms', 'count', 'error_pct'] },
        because: BECAUSE,
      },
      required: ['group_by', 'because'],
    },
  },
  {
    name: 'before_after',
    description:
      'Compare each group before and after a pivot: the burn start (default) or a deploy marker id. Returns count, p50, p99, error rate on both sides and the p99 change.',
    parameters: {
      type: 'object',
      properties: {
        group_by: { type: 'array', items: { type: 'string' }, description: 'One or two attribute names.' },
        where: FILTER_SCHEMA,
        exclude: FILTER_SCHEMA,
        pivot: { type: 'string', description: 'A deploy marker id from the alert, or omit for the burn start.' },
        because: BECAUSE,
      },
      required: ['group_by', 'because'],
    },
  },
  {
    name: 'attribute_diff',
    description:
      'BubbleUp-style: which attribute values are over-represented in slow or failed spans since the burn began, versus all other matching spans. Compares the standard attributes unless you pass `attributes` (names, or a prefix such as "app.*").',
    parameters: {
      type: 'object',
      properties: {
        where: FILTER_SCHEMA,
        exclude: FILTER_SCHEMA,
        attributes: { type: 'array', items: { type: 'string' }, description: 'Attributes to compare; default is the standard set.' },
        slower_than_ms: { type: 'number', description: 'What counts as slow. Default: baseline p99 of the selection.' },
        because: BECAUSE,
      },
      required: ['where', 'because'],
    },
  },
  {
    name: 'get_trace',
    description: 'Fetch one exemplar slow trace since the burn began, with every span, its service, build, pod and self time.',
    parameters: {
      type: 'object',
      properties: {
        where: FILTER_SCHEMA,
        exclude: FILTER_SCHEMA,
        pick: { type: 'string', enum: ['typical_slow', 'slowest'] },
        because: BECAUSE,
      },
      required: ['where', 'because'],
    },
  },
  {
    name: 'list_attributes',
    description: 'List attribute names (optionally by prefix) with how many distinct values each has.',
    parameters: {
      type: 'object',
      properties: { prefix: { type: 'string' }, because: BECAUSE },
      required: ['because'],
    },
  },
  {
    name: 'publish_finding',
    description: 'Publish your finding to the shared canvas. This ends your part of the investigation.',
    parameters: {
      type: 'object',
      properties: {
        verdict: { type: 'string', enum: ['supported', 'ruled_out', 'inconclusive'] },
        headline: { type: 'string', description: 'Under 16 words, with the one number that matters.' },
        detail: { type: 'string', description: 'Under 45 words: what the data showed. Numbers only from tool results.' },
        evidence: { type: 'string', description: 'The id of your query that shows it, e.g. D2.' },
        culprit: {
          type: 'object',
          description:
            'If the data points at a cause (yours or not): the narrowest attribute -> value pairs, e.g. {"service.name":"x","build.id":"y"}.',
        },
        narrow_exclude: { type: 'object', description: 'Optional: attribute -> value the other agents can stop looking at.' },
      },
      required: ['verdict', 'headline', 'detail'],
    },
  },
];

export const toolsForModel = () =>
  TOOL_SPECS.map(spec => ({ type: 'function', function: spec }));

function skillsBlock(skills) {
  if (!skills.length) return 'Team skills: none loaded. You only know what the data shows.';
  return `Team skills (this team's own knowledge; follow them and name the id when one guides you):\n${skills
    .map(skill => `${skill.id} ${skill.title}: ${skill.text}`)
    .join('\n')}`;
}

function agentSystem(hypothesis, skills) {
  return `You are one of three investigation agents sharing one canvas. An SLO burn alert just fired and no human has looked yet.
Your hypothesis: "${hypothesis.title}: ${hypothesis.claim}". Prove it or rule it out with data, fast.

Rules
- Every number you write must come from a tool result. Never estimate.
- You have ${MAX_QUERIES} queries in total. Call one or two tools per turn, then publish_finding.
- The canvas is shared: you see the other agents' query results and findings as they land. Build on them. Never repeat a query another agent already ran, and publish early if their results already settle your hypothesis.
- verdict "supported" only when your hypothesis is the cause of the slow checkouts. If the data clears it, "ruled_out". If what you found is only a slice of another agent's cause, or points elsewhere, rule yours out and put what you saw in culprit.
- A caller's duration includes the services it calls. Start from the service whose own time grew (TRIAGE names it); frontend and checkout-svc usually just pass the slowness along.
- Find the narrowest split that separates slow from healthy. If a region is slow only for one tenant, pod, build or flag, that is the cause, not the region. Check the siblings before you blame.
- A traffic spike is not a cause unless those requests are the slow ones or they make other requests slow.

Data: spans with ${STANDARD_ATTRIBUTES.join(', ')}, duration_ms. Services: ${SERVICE_NAMES.join(', ')}. Application attributes sit under app.* (list_attributes shows them). Tenant, region, tier and app.* attributes are on every span of a trace; build.id and k8s.pod.name belong to the span's own service.
Filters: where = every pair must match; exclude = drop spans matching any pair.

${skillsBlock(skills)}`;
}

function brief(alert, triageRows, canvas) {
  const lines = [
    `ALERT ${alert.slo} SLO (${alert.target} of ${alert.sli}). Burn rate ${alert.burn_rate}x since ${alert.burn_started}; fired ${alert.fired_at}. ${alert.bad_since_start} of ${alert.checkouts_since_start} checkouts bad since the burn began (${alert.bad_pct_before}% before).`,
    `TRIAGE own-time p99 per service (downstream calls excluded), before -> after burn start: ${triageRows
      .map(row => `${row.service} ${row.before_p99} -> ${row.after_p99} ms (${row.change}x)`)
      .join('; ')}. Own time grew most in ${triageRows[0].service}.`,
    `DEPLOY MARKERS: ${
      alert.markers.map(marker => `${marker.id} at ${marker.at} (from ${marker.from})`).join('; ') || 'none'
    }.`,
    canvas.length ? canvasText(canvas) : 'SHARED CANVAS: empty so far.',
  ];
  return lines.join('\n');
}

/** Canvas entries as the agents read them: other agents' query results and findings. */
function canvasText(entries) {
  return `SHARED CANVAS (from the other agents):\n${entries
    .map(entry =>
      entry.kind === 'note'
        ? `- [${entry.id}] ${hypothesisById(entry.agent).title} agent ran ${entry.name} ${JSON.stringify(entry.args)} -> ${entry.summary}`
        : `- [${entry.id}] FINDING, ${hypothesisById(entry.agent).title}: ${entry.verdict}. ${entry.headline} ${entry.detail}${
            entry.culprit ? ` culprit ${JSON.stringify(entry.culprit)}` : ''
          }${entry.narrow_exclude ? ` others can skip ${JSON.stringify(entry.narrow_exclude)}` : ''}`
    )
    .join('\n')}`;
}

/** What one query showed, in a line the other agents can act on. */
function noteLine(name, result) {
  if (result.error) return result.error;
  if (name === 'query')
    return result.groups
      .slice(0, 4)
      .map(group => `${group.group}: p99 ${group.p99_ms} ms (n=${group.count})`)
      .join('; ');
  if (name === 'before_after')
    return result.groups
      .slice(0, 4)
      .map(group => `${group.group}: p99 ${group.before.p99_ms ?? '-'} -> ${group.after.p99_ms ?? '-'} ms`)
      .join('; ');
  if (name === 'attribute_diff')
    return (
      (result.top_differences || [])
        .slice(0, 4)
        .map(item => `${item.attribute}=${item.value} ${item.slow_pct}% of slow vs ${item.baseline_pct}%`)
        .join('; ') || result.note || 'nothing stands out'
    );
  return oneLine(name, result);
}

const cleanText = (value, max) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);

function cleanPairs(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const out = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!ALL_ATTRIBUTES.includes(key) || raw == null || typeof raw === 'object') continue;
    out[key] = String(raw).slice(0, 60);
  }
  return Object.keys(out).length ? out : null;
}

/** Every number in a JSON value, for the grounding check. */
function numbersIn(value, into = new Set()) {
  if (typeof value === 'number') into.add(value);
  else if (typeof value === 'string') {
    for (const match of value.match(/\d+(?:\.\d+)?/g) || []) into.add(Number(match));
  } else if (Array.isArray(value)) value.forEach(item => numbersIn(item, into));
  else if (value && typeof value === 'object') Object.values(value).forEach(item => numbersIn(item, into));
  return into;
}

/**
 * Grounding check: every figure in an agent's text must appear in a tool result (or the
 * alert). Build ids, pod names and small counts are skipped. Returns { checked, traced, missing }.
 */
export function groundCheck(text, sources) {
  const known = numbersIn(sources);
  // "2,917 ms" is one figure: drop thousands separators before splitting on punctuation
  const tokens = String(text || '')
    .replace(/(\d),(?=\d{3}(?!\d))/g, '$1')
    .split(/[\s(),;:]+/);
  let checked = 0;
  const missing = [];
  for (const raw of tokens) {
    const token = raw.replace(/^[~<>≈]+/, '').replace(/[.!?]+$/, '');
    const match = token.match(/^(\d[\d,]*(?:\.\d+)?)(ms|s|%|x|×)?$/i);
    if (!match) continue;
    const value = Number(match[1].replace(/,/g, ''));
    const unit = (match[2] || '').toLowerCase();
    if (!unit && value < 10) continue;
    checked += 1;
    const candidates = unit === 's' ? [value * 1000, value] : [value];
    const ok = candidates.some(candidate =>
      [...known].some(number => Math.abs(number - candidate) <= Math.max(0.5, candidate * (unit === 's' ? 0.06 : 0.006)))
    );
    if (!ok) missing.push(token);
  }
  return { checked, traced: checked - missing.length, missing: missing.slice(0, 4) };
}

/** Grades an answer against the planted cause: 'correct' | 'partial' | 'wrong'. Code, no model. */
export function grade(truth, answer) {
  const pairs = Object.entries(answer?.culprit || {}).map(([key, value]) => `${key}=${String(value).toLowerCase()}`);
  const has = pair => pairs.includes(pair.toLowerCase());
  const serviceOk = truth.anyService || answer?.service === truth.service;
  const blamedLoadTest = pairs.some(pair => pair.startsWith('tenant.id=load-test'));
  const forbidden = (truth.forbid || []).some(has) || blamedLoadTest;
  const found = truth.must.filter(has).length;
  let result = 'wrong';
  if (serviceOk && found === truth.must.length && !forbidden) result = 'correct';
  else if (!blamedLoadTest && (truth.anyService ? found > 0 : serviceOk) && (found > 0 || !forbidden)) result = 'partial';
  return { result, found, needed: truth.must.length, expected: truth.text };
}

function oneLine(name, result) {
  if (result.error) return result.error;
  if (name === 'query') {
    const top = result.groups[0];
    return top ? `${result.groups.length} groups · top ${top.group}: p99 ${top.p99_ms} ms` : 'no groups';
  }
  if (name === 'before_after') {
    const top = result.groups[0];
    return top && top.after.p99_ms != null
      ? `${top.group}: p99 ${top.before.p99_ms ?? '–'} → ${top.after.p99_ms} ms`
      : 'no groups';
  }
  if (name === 'attribute_diff') {
    const top = result.top_differences?.[0];
    return top
      ? `${top.attribute} = ${top.value}: ${top.slow_pct}% of slow vs ${top.baseline_pct}%`
      : result.note || 'nothing stands out';
  }
  if (name === 'get_trace') return `trace ${result.trace_id}: ${result.duration_ms} ms, ${result.spans.length} spans`;
  if (name === 'list_attributes') return `${result.attributes.length} attributes`;
  return '';
}

/**
 * Runs one investigation and emits events as it goes.
 * models: { turn({ system, messages, tools, force }), rank(state), coordinate({ system, user }) }.
 * Returns { answer, grade, queries, llmCalls, ms }.
 */
export async function investigate({ scenarioId, skills }, models, emit) {
  const started = Date.now();
  const data = dataset(scenarioId);
  const alert = alertFor(scenarioId);
  const triageRows = triage(scenarioId, alert);
  const canvas = []; // published findings
  const shared = []; // everything on the canvas, in order: query notes and findings
  const everyResult = []; // every tool result on the canvas, for the grounding check
  let queries = 0;
  let llmCalls = 0;

  emit({ t: 'alert', alert, scenario: { id: data.scenario.id, title: data.scenario.title } });
  emit({ t: 'triage', rows: triageRows });

  const rankState = () => ({
    alert: `${alert.slo} SLO burning at ${alert.burn_rate}x since ${alert.burn_started}`,
    own_time_p99_by_service_before_after: triageRows.map(row => `${row.service}: ${row.before_p99} -> ${row.after_p99} ms`),
    deploys: alert.markers.map(marker => `${marker.service} ${marker.build} at ${marker.at}`),
    findings: canvas.map(finding => ({
      hypothesis: hypothesisById(finding.agent).title,
      verdict: finding.verdict,
      finding: `${finding.headline} ${finding.detail}`,
    })),
  });
  let rankChain = Promise.resolve();
  const rerank = stage => {
    rankChain = rankChain.then(async () => {
      try {
        const begun = Date.now();
        const answer = await models.rank(rankState());
        emit({ t: 'rank', stage, findings: canvas.length, ...answer, ms: Date.now() - begun });
        return answer;
      } catch (error) {
        emit({ t: 'rank', stage, findings: canvas.length, failed: true });
        return null;
      }
    });
    return rankChain;
  };
  await rerank('prior');

  const tools = toolsForModel();

  async function runAgent(hypothesis) {
    emit({ t: 'claim', agent: hypothesis.id });
    const system = agentSystem(hypothesis, skills);
    const messages = [{ role: 'user', content: brief(alert, triageRows, []) }];
    const results = [];
    let used = 0;
    let seen = 0;
    const news = () => {
      const fresh = shared.slice(seen).filter(entry => entry.agent !== hypothesis.id);
      seen = shared.length;
      return fresh.length ? `\n\n${canvasText(fresh)}` : '';
    };
    let finding = null;

    for (let turnIndex = 0; turnIndex < MAX_TURNS && !finding; turnIndex++) {
      const force = turnIndex === MAX_TURNS - 1 || used >= MAX_QUERIES;
      llmCalls += 1;
      const out = await models.turn({ system, messages, tools, force: force ? 'publish_finding' : null });
      const calls = out.toolCalls.filter(call => call.name === 'publish_finding' || TOOL_NAMES.includes(call.name));
      if (!calls.length) {
        messages.push({ role: 'assistant', content: out.content || '(no tool call)' });
        messages.push({ role: 'user', content: 'Call a tool, or publish_finding if you already know.' });
        continue;
      }
      const publish = calls.find(call => call.name === 'publish_finding');
      const work = publish && (used > 0 || force) ? [] : calls.filter(call => call.name !== 'publish_finding').slice(0, 2);
      if (!work.length && publish) {
        finding = publish.args || {};
        break;
      }
      messages.push({
        role: 'assistant',
        content: out.content || '',
        tool_calls: work.map(call => ({
          id: call.id,
          type: 'function',
          function: { name: call.name, arguments: JSON.stringify(call.args || {}) },
        })),
      });
      work.forEach((call, index) => {
        let content;
        if (used >= MAX_QUERIES) {
          content = JSON.stringify({ error: 'Query budget used. Publish your finding.' });
        } else {
          used += 1;
          queries += 1;
          const id = `${hypothesis.letter}${used}`;
          const because = cleanText(call.args?.because, 120);
          const ran = runTool(scenarioId, alert, call.name, call.args);
          results.push({ id, name: call.name, args: ran.args, result: ran.result });
          everyResult.push(ran.result);
          shared.push({ kind: 'note', id, agent: hypothesis.id, name: call.name, args: ran.args, summary: noteLine(call.name, ran.result) });
          emit({ t: 'call', agent: hypothesis.id, id, name: call.name, args: ran.args, because });
          emit({ t: 'result', agent: hypothesis.id, id, result: ran.result, summary: oneLine(call.name, ran.result), ms: ran.ms });
          content = JSON.stringify({ id, ...ran.result });
        }
        // News from the other agents rides along with the last tool result of the turn
        if (index === work.length - 1) {
          content += news();
          content += `\n\n${MAX_QUERIES - used} of ${MAX_QUERIES} queries left.`;
        }
        messages.push({ role: 'tool', tool_call_id: call.id, content });
      });
    }

    const verdict = ['supported', 'ruled_out', 'inconclusive'].includes(finding?.verdict) ? finding.verdict : 'inconclusive';
    const headline = cleanText(finding?.headline, 160) || 'No finding published in the turn budget.';
    const detail = cleanText(finding?.detail, 360);
    const evidenceId = results.find(item => item.id === String(finding?.evidence || '').trim())?.id || results.at(-1)?.id || null;
    const published = {
      id: `F${canvas.length + 1}`,
      agent: hypothesis.id,
      verdict,
      headline,
      detail,
      evidence: evidenceId,
      culprit: cleanPairs(finding?.culprit),
      narrow_exclude: cleanPairs(finding?.narrow_exclude),
      grounded: groundCheck(`${headline} ${detail}`, [everyResult, alert, triageRows]),
      queries: used,
    };
    canvas.push(published);
    shared.push({ kind: 'finding', ...published });
    emit({ t: 'finding', ...published });
    rerank('update');
    return { published, results };
  }

  const agents = await Promise.all(HYPOTHESES.map(runAgent));
  await rankChain;

  // Candidates: the agents choose where to look, code decides what the data says. Every
  // attribute value that stands out in any tool result on the canvas becomes a candidate, next
  // to the culprits the agents named; the best ones are combined (up to three attributes).
  // Each is scored over the spans: coverage = share of the bad checkouts it explains,
  // precision = share of the checkouts it matches that are bad. The best balance wins.
  // No model picks the root cause.
  const proposals = [];
  const SKIP = ['service.name', 'http.route', 'status_code', 'app.cart.items'];
  const propose = (from, service, pairs) => {
    const entries = Object.entries(pairs)
      .filter(([key]) => !SKIP.includes(key) && ALL_ATTRIBUTES.includes(key))
      .map(([key, value]) => [key, String(value)])
      .sort(([a], [b]) => a.localeCompare(b));
    if (!entries.length || entries.length > 3) return null;
    const key = JSON.stringify([service, entries]);
    const known = proposals.find(item => item.key === key);
    if (known) return known;
    const scored = verify(scenarioId, alert, { service, pairs: Object.fromEntries(entries) });
    const coverage = scored.explained_pct;
    const precision = scored.matching.bad_pct;
    const proposal = {
      key,
      from,
      service,
      culprit: Object.fromEntries(entries),
      coverage,
      precision,
      score: coverage + precision ? Math.round((2 * coverage * precision) / (coverage + precision)) : 0,
      matching: scored.matching.checkouts,
    };
    proposals.push(proposal);
    return proposal;
  };
  const allResults = agents.flatMap(agent => agent.results);
  const serviceOf = (args, group) =>
    SERVICE_NAMES.includes(args?.where?.['service.name'])
      ? args.where['service.name']
      : SERVICE_NAMES.find(name => group && String(group).split(' | ').includes(name)) || triageRows[0].service;
  // 1. What the agents named
  for (const { published } of agents) {
    if (!published.culprit) continue;
    const { 'service.name': named, ...pairs } = published.culprit;
    const service = SERVICE_NAMES.includes(named) ? named : triageRows[0].service;
    propose(published.id, service, pairs);
    for (const [key, value] of Object.entries(pairs)) propose(published.id, service, { [key]: value });
  }
  // 2. What changed: every deploy marker on the alert is a candidate for its own service
  for (const marker of alert.markers) propose('alert', marker.service, { 'build.id': marker.build });
  // 3. What stands out in the tool results themselves
  const mine = ({ id, name, args, result }) => {
    if (result.error) return;
    if (name === 'attribute_diff') {
      for (const item of (result.top_differences || []).filter(row => row.diff >= 25).slice(0, 4)) {
        propose(id, serviceOf(args), { [item.attribute]: item.value });
      }
    } else if (name === 'query' || name === 'before_after') {
      const p99 = group => (name === 'query' ? group.p99_ms : group.after.p99_ms) || 0;
      const groups = result.groups.filter(group => p99(group) > 0);
      const sorted = groups.map(p99).sort((a, b) => a - b);
      const median = sorted[Math.floor((sorted.length - 1) / 2)] || 0;
      for (const group of groups.slice(0, 2)) {
        const standsOut = groups.length === 1 ? false : p99(group) >= 2.5 * median;
        if (!standsOut) continue;
        const values = String(group.group).split(' | ');
        const pairs = Object.fromEntries(result.group_by.map((key, index) => [key, values[index]]));
        const service = serviceOf(args, group.group);
        propose(id, service, pairs);
        for (const [key, value] of Object.entries(pairs)) propose(id, service, { [key]: value });
      }
    }
  };
  allResults.forEach(mine);
  // 4. Combine the strongest: each of the top six extended by every compatible single, twice
  const combine = () => {
    const singles = proposals.filter(item => Object.keys(item.culprit).length === 1);
    let frontier = [...proposals].sort((a, b) => b.score - a.score).slice(0, 6);
    for (let round = 0; round < 2; round++) {
      const next = [];
      for (const base of frontier) {
        for (const single of singles) {
          const [key, value] = Object.entries(single.culprit)[0];
          if (single.service !== base.service || key in base.culprit) continue;
          const made = propose(`${base.from}+${single.from}`, base.service, { ...base.culprit, [key]: value });
          if (made) next.push(made);
        }
      }
      frontier = [...new Set(next)].sort((a, b) => b.score - a.score).slice(0, 6);
    }
  };
  combine();
  // Near ties (within NEAR_TIE points of the best) go to a culprit whose build was deployed within
  // three minutes of the burn start, since it also explains "why now"; then to the simpler one.
  const explainsOnset = item =>
    alert.markers.some(
      marker =>
        marker.service === item.service &&
        marker.build === item.culprit['build.id'] &&
        Math.abs(marker.minute - alert.burn_start_minute) <= 3
    );
  const rankProposals = () => {
    proposals.sort((a, b) => b.score - a.score);
    const near = proposals.filter(item => proposals[0].score - item.score <= NEAR_TIE);
    near.sort(
      (a, b) =>
        Number(explainsOnset(b)) - Number(explainsOnset(a)) ||
        Object.keys(a.culprit).length - Object.keys(b.culprit).length ||
        b.score - a.score
    );
    return [...near, ...proposals.filter(item => !near.includes(item))];
  };
  let ordered = rankProposals();
  // Follow-up: when even the best culprit scores poorly, nothing on the canvas explains the
  // burn yet. Code takes the broadest decent candidate (one that covers most of the damage),
  // runs one more attribute diff inside it over every attribute, and scores what narrows it.
  if (ordered[0] && ordered[0].score < FOLLOW_UP_BELOW) {
    const broad = proposals.filter(item => item.coverage >= 70).sort((a, b) => b.score - a.score)[0];
    const best = broad || ordered[0];
    const ran = runTool(scenarioId, alert, 'attribute_diff', {
      where: { 'service.name': best.service, ...best.culprit },
      attributes: ['*'],
    });
    queries += 1;
    const followUp = { id: 'C1', name: 'attribute_diff', args: ran.args, result: ran.result };
    allResults.push(followUp);
    everyResult.push(ran.result);
    emit({
      t: 'followup',
      ...followUp,
      summary: oneLine('attribute_diff', ran.result),
      ms: ran.ms,
      because: `No culprit scores well yet. This one covers ${best.coverage}% of the damage but only ${best.precision}% of what it matches is bad: look inside it.`,
    });
    mine(followUp);
    combine();
    ordered = rankProposals();
  }
  const candidates = ordered.slice(0, 5).map(({ key, ...item }) => item);
  const chosen = candidates[0] || null;
  emit({ t: 'candidates', candidates });

  // Coordinator: the LLM writes the summary for the culprit the scores picked
  llmCalls += 1;
  emit({ t: 'coordinating' });
  const evidenceText = agents
    .map(({ published }) => {
      const cited = allResults.find(item => item.id === published.evidence);
      return `[${published.id}] ${hypothesisById(published.agent).title} (${published.verdict}): ${published.headline} ${published.detail}\n  evidence ${published.evidence || 'none'}: ${cited ? JSON.stringify(cited.result).slice(0, 700) : 'none'}`;
    })
    .join('\n');
  const candidateText = candidates.length
    ? candidates
        .map(
          (item, index) =>
            `${index === 0 ? 'CHOSEN' : 'other'}: ${item.service} ${JSON.stringify(item.culprit)} explains ${item.coverage}% of bad checkouts; ${item.precision}% of the ${item.matching} checkouts it matches are bad`
        )
        .join('\n')
    : 'none proposed: name the culprit yourself from the evidence';
  const raw = await models.coordinate({
    system: `You are the coordinator of an incident investigation. Three agents each tested one hypothesis and published findings. Code then scored every culprit they proposed against the spans and chose the one that best explains the bad checkouts. Write the root cause summary for the on-call engineer.
Answer with JSON only:
{"statement":"under 40 words, plain: what is slow, for whom, since when, with the numbers that prove it","ruled_out":"under 25 words: what was cleared and why","next_step":"under 16 words: the safest first action"${
      chosen ? '' : `,"service":"one of ${SERVICE_NAMES.join(', ')}","culprit":{"attribute":"value"}`
    }}
Rules: write about the CHOSEN culprit. Use only values and numbers that appear in the alert, findings, evidence or candidate scores. Never blame something the findings cleared. In the statement, name only the attribute values of the CHOSEN culprit (no other segments). ruled_out must never clear a service, region, build or flag that is part of the CHOSEN culprit.

${skillsBlock(skills)}`,
    user: `${brief(alert, triageRows, [])}\n\nFINDINGS\n${evidenceText}\n\nCANDIDATE CULPRITS, scored by code\n${candidateText}`,
  });
  const culprit = chosen ? chosen.culprit : cleanPairs(raw?.culprit) || {};
  delete culprit['service.name'];
  const service = chosen ? chosen.service : SERVICE_NAMES.includes(raw?.service) ? raw.service : triageRows[0].service;
  const keys = Object.keys(culprit);
  const answer = {
    // Which hypothesis the culprit belongs to follows from its attributes
    hypothesis: keys.includes('build.id') ? 'deploy' : keys.includes('tenant.id') ? 'tenant' : 'infra',
    service,
    culprit,
    statement: cleanText(raw?.statement, 320),
    ruled_out: cleanText(raw?.ruled_out, 220),
    next_step: cleanText(raw?.next_step, 160),
  };
  const proof = verify(scenarioId, alert, { service: answer.service, pairs: answer.culprit });
  const exemplar = runTool(scenarioId, alert, 'get_trace', {
    where: { ...answer.culprit, ...(answer.service && { 'service.name': answer.service }) },
  }).result;
  canvas.push({
    agent: answer.hypothesis,
    verdict: 'scored by code',
    headline: `${answer.service} ${JSON.stringify(answer.culprit)} explains ${proof.explained_pct}% of the bad checkouts; ${proof.matching.bad_pct}% of the checkouts it matches are bad.`,
    detail: '',
  });
  const final = await rerank('final');
  canvas.pop();
  // Confidence is the evidence score of the chosen culprit (coverage and precision, in code).
  // The decision model's ranking is shown beside it; when the two disagree, the page says so.
  const confidence = chosen ? chosen.score / 100 : null;
  const agrees = final?.choice ? final.choice === answer.hypothesis : null;
  const graded = grade(data.truth, answer);
  const totals = { queries, llmCalls, ms: Date.now() - started, spans: data.spans.length };
  emit({
    t: 'summary',
    answer,
    proof,
    exemplar: exemplar.error ? null : exemplar,
    confidence,
    agrees,
    grounded: groundCheck(answer.statement, [allResults.map(item => item.result), alert, triageRows, proof, candidates]),
    grade: graded,
    totals,
  });
  return { answer, grade: graded, ...totals };
}

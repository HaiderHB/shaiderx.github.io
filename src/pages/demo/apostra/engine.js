// Apostra demo: the pure parts shared by the page and the API routes (no Node or browser APIs).
// The preset brief, the guardrails (code, not the model), the plan math and the reducer that turns
// the run's NDJSON events into page state. The sample sellers themselves live server-side in
// pages/api/demo/apostra/sellers.js.

export const PRESET_BRIEF =
  '$50K, CTV + podcast, US adults 25-44, Dec 1-31, brand-safe, no gambling adjacency, CPM ceiling $38';

export const PRESETS = [
  { id: 'holiday', label: 'Holiday CTV + podcast', brief: PRESET_BRIEF },
];

/** Ideas for a custom brief (live, needs the key). */
export const CUSTOM_IDEAS = [
  '$20K podcast only, US adults 25-44, Dec 1-31, no gambling or alcohol, CPM ceiling $32',
  '$80K CTV, US adults 25-54, Dec 1-31, brand-safe, CPM ceiling $45',
];

export const CHANNELS = ['ctv', 'podcast', 'online_video', 'audio', 'display'];
export const CHANNEL_LABEL = {
  ctv: 'CTV',
  podcast: 'Podcast',
  online_video: 'Online video',
  audio: 'Audio',
  display: 'Display',
};
export const EXCLUSIONS = ['gambling', 'alcohol', 'politics', 'adult', 'cannabis', 'firearms'];

// --- formatting -------------------------------------------------------------------------------------

export const money = (value, { cents = false } = {}) =>
  `$${Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  })}`;

export const compactMoney = value =>
  value >= 1000 ? `$${(value / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}K` : money(value);

export const impressions = value =>
  value >= 1e6
    ? `${(value / 1e6).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}M`
    : `${Math.round(value / 1000).toLocaleString('en-US')}K`;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const shortDate = iso => {
  const [, m, d] = String(iso).split('-').map(Number);
  return `${MONTHS[m - 1] || '?'} ${d}`;
};
export const flightLabel = flight =>
  flight ? `${shortDate(flight.start)} – ${shortDate(flight.end)}` : '';

// --- the brief ---------------------------------------------------------------------------------------

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const clampNumber = (value, min, max) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : null;
};

/**
 * Validates the brief the LLM read out of the text: known channels and exclusions only, sane
 * numbers, real dates. Returns { brief, errors }; errors means the run stops before any seller call.
 */
export function validateBrief(raw) {
  const errors = [];
  const budget = clampNumber(raw?.budget, 0, 500_000);
  if (!budget || budget < 1000) errors.push('a budget of at least $1,000');
  const cpmCeiling = clampNumber(raw?.cpm_ceiling, 0, 200);
  if (!cpmCeiling) errors.push('a CPM ceiling');
  const channels = [...new Set((raw?.channels || []).map(String))].filter(c => CHANNELS.includes(c));
  if (!channels.length) errors.push('at least one channel (CTV, podcast, online video, audio)');
  const start = String(raw?.flight?.start || '');
  const end = String(raw?.flight?.end || '');
  if (!ISO_DATE.test(start) || !ISO_DATE.test(end) || end < start) errors.push('flight dates');
  const ageMin = clampNumber(raw?.audience?.age_min, 13, 99) ?? 18;
  const ageMax = clampNumber(raw?.audience?.age_max, ageMin, 99) ?? 99;
  const exclusions = [...new Set((raw?.exclusions || []).map(String))].filter(e => EXCLUSIONS.includes(e));
  return {
    errors,
    brief: {
      budget: budget ? Math.round(budget) : 0,
      currency: 'USD',
      channels,
      audience: { geo: 'US', age_min: ageMin, age_max: ageMax },
      flight: { start, end },
      cpm_ceiling: cpmCeiling || 0,
      exclusions,
      brand_safe: raw?.brand_safe !== false,
    },
  };
}

export function briefChips(brief) {
  if (!brief) return [];
  return [
    { id: 'budget', label: 'Budget', value: money(brief.budget) },
    { id: 'channels', label: 'Channels', value: brief.channels.map(c => CHANNEL_LABEL[c] || c).join(' + ') },
    { id: 'audience', label: 'Audience', value: `US adults ${brief.audience.age_min}-${brief.audience.age_max}` },
    { id: 'flight', label: 'Flight', value: flightLabel(brief.flight) },
    { id: 'cpm', label: 'CPM ceiling', value: money(brief.cpm_ceiling) },
    {
      id: 'exclude',
      label: 'Exclude',
      value: brief.exclusions.length ? brief.exclusions.join(', ') : brief.brand_safe ? 'unsafe content' : 'none',
    },
  ];
}

// --- guardrails (code) ---------------------------------------------------------------------------

export const priceOf = product => product.pricing_options?.[0]?.fixed_price ?? null;
export const maxSpend = product =>
  Math.floor(((product.availability?.impressions || 0) * (priceOf(product) || 0)) / 1000 / 500) * 500;

/** Each product a seller returned, checked against the brief. Code decides; the model never does. */
export function checkProduct(brief, product) {
  const cpm = priceOf(product);
  const avail = product.availability || {};
  const age = product.audience || {};
  const blocked = (product.content_adjacency || []).filter(tag => brief.exclusions.includes(tag));
  const checks = [
    {
      id: 'channel',
      label: 'Channel',
      pass: (product.channels || []).some(c => brief.channels.includes(c)),
      detail: (product.channels || []).map(c => CHANNEL_LABEL[c] || c).join(', '),
    },
    {
      id: 'cpm',
      label: 'CPM ceiling',
      pass: cpm != null && cpm <= brief.cpm_ceiling,
      detail: cpm != null ? `${money(cpm, { cents: cpm % 1 !== 0 })} vs ${money(brief.cpm_ceiling)}` : 'no fixed price',
    },
    {
      id: 'flight',
      label: 'Flight dates',
      pass: avail.start <= brief.flight.start && avail.end >= brief.flight.end,
      detail: `delivers ${flightLabel(avail)}`,
    },
    {
      id: 'safety',
      label: 'Brand safety',
      pass: blocked.length === 0,
      detail: blocked.length ? `${blocked.join(', ')} adjacency` : 'no excluded adjacency',
    },
    {
      id: 'audience',
      label: 'Audience',
      pass: (age.age_min ?? 0) <= brief.audience.age_min && (age.age_max ?? 99) >= brief.audience.age_max,
      detail: `${(age.geo || []).join(', ')} ${age.age_min}-${age.age_max}`,
    },
  ];
  const failed = checks.filter(check => !check.pass);
  return { checks, eligible: failed.length === 0, reason: failed.map(check => check.label).join(', ') };
}

/** One plan line per booked or pending package. */
export function lineFor({ seller, sellerName, product, budget, cpm, status = 'planned', why, mediaBuyId }) {
  return {
    seller,
    sellerName,
    productId: product.product_id,
    productName: product.name,
    channel: product.channels?.[0],
    budget,
    cpm,
    impressions: Math.round((budget / cpm) * 1000),
    status,
    why,
    mediaBuyId: mediaBuyId || null,
  };
}

/** Plan-level guardrails over the lines that are booked or about to be. */
export function planChecks(brief, lines, { excluded = [] } = {}) {
  const live = lines.filter(line => line.status !== 'declined' && line.status !== 'dropped');
  const total = live.reduce((sum, line) => sum + line.budget, 0);
  const top = live.reduce((max, line) => Math.max(max, line.cpm), 0);
  const overCeiling = live.filter(line => line.cpm > brief.cpm_ceiling && !line.override);
  const overrides = live.filter(line => line.override);
  const safety = excluded.filter(item => item.checks.some(check => check.id === 'safety' && !check.pass));
  return [
    {
      id: 'budget',
      label: 'Budget cap',
      status: total <= brief.budget ? 'pass' : 'fail',
      detail: `${money(total)} of ${money(brief.budget)}`,
    },
    {
      id: 'cpm',
      label: 'CPM ceiling',
      status: overCeiling.length ? 'fail' : overrides.length ? 'fixed' : 'pass',
      detail: overCeiling.length
        ? `${overCeiling.map(line => `${line.sellerName} at ${money(line.cpm)}`).join(', ')} over ${money(brief.cpm_ceiling)}`
        : overrides.length
        ? `${overrides.map(line => `${line.sellerName} at ${money(line.cpm)}`).join(', ')}: approved by a person`
        : `highest ${money(top)} of ${money(brief.cpm_ceiling)}`,
    },
    {
      id: 'safety',
      label: 'Brand safety',
      status: 'pass',
      detail: safety.length
        ? `${safety.length} ${safety.length === 1 ? 'product' : 'products'} with excluded adjacency kept out`
        : 'no excluded adjacency in the plan',
    },
    {
      id: 'flight',
      label: 'Flight dates',
      status: 'pass',
      detail: `every line delivers ${flightLabel(brief.flight)}`,
    },
  ];
}

export function planTotals(lines) {
  const booked = lines.filter(line => line.status === 'booked');
  const pending = lines.filter(line => line.status === 'awaiting');
  const spend = booked.reduce((sum, line) => sum + line.budget, 0);
  const imps = booked.reduce((sum, line) => sum + line.impressions, 0);
  return {
    booked: spend,
    pending: pending.reduce((sum, line) => sum + line.budget, 0),
    impressions: imps,
    blendedCpm: imps ? (spend / imps) * 1000 : 0,
    sellers: new Set(booked.map(line => line.seller)).size,
  };
}

// --- run state from events ---------------------------------------------------------------------

export const emptyRun = (kind = 'example', extra = {}) => ({
  kind,
  status: 'idle',
  runId: null,
  brief: null,
  briefMs: null,
  sellers: [],
  calls: [],
  messages: [],
  products: [],
  shortlist: null,
  scores: null,
  scoresMs: null,
  riskLimit: 0.6,
  lines: [],
  checks: [],
  escalation: null,
  error: null,
  started: null,
  finished: null,
  ...extra,
});

/**
 * Events (one JSON object per line from /api/demo/apostra/run/):
 * meta, brief, call (an MCP tools/call, request + response), message (agent to agent),
 * products (the seller's products with guardrail checks), shortlist, scores, plan (lines +
 * plan checks), booking (a create_media_buy outcome), escalate, done, error.
 */
export function applyEvent(run, event) {
  switch (event.t) {
    case 'meta':
      return { ...run, runId: event.runId, sellers: event.sellers, status: 'running', started: event.at };
    case 'brief':
      return { ...run, brief: event.brief, briefMs: event.ms ?? null };
    case 'call': {
      const index = run.calls.findIndex(call => call.id === event.call.id);
      const next = { at: event.at, ...event.call };
      const calls = index >= 0 ? run.calls.map((call, i) => (i === index ? next : call)) : [...run.calls, next];
      return { ...run, calls };
    }
    case 'message':
      return { ...run, messages: [...run.messages, event.message] };
    case 'products':
      return { ...run, products: [...run.products, ...event.products] };
    case 'shortlist':
      return { ...run, shortlist: event.shortlist };
    case 'scores':
      return { ...run, scores: event.scores, scoresMs: event.ms ?? null, riskLimit: event.riskLimit ?? run.riskLimit };
    case 'plan':
      return { ...run, lines: event.lines, checks: event.checks };
    case 'booking':
      return {
        ...run,
        lines: run.lines.map(line =>
          line.seller === event.seller ? { ...line, ...event.patch } : line
        ),
      };
    case 'escalate':
      return { ...run, escalation: event.escalation };
    case 'checks':
      return { ...run, checks: event.checks };
    case 'done':
      return { ...run, status: 'done', finished: event.at };
    case 'error':
      return { ...run, status: 'error', error: event.message, finished: event.at };
    default:
      return run;
  }
}

/** A JSON-RPC tools/call request and its MCP result, as the buyer agent's MCP client sees them. */
export const rpcCall = (id, name, args) => ({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } });
export const rpcResult = (id, structuredContent, isError = false) => ({
  jsonrpc: '2.0',
  id,
  result: isError
    ? { isError: true, content: [{ type: 'text', text: structuredContent }] }
    : { isError: false, structuredContent },
});

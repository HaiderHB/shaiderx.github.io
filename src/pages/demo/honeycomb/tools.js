// The query tools the agents call. Every number an agent sees or cites comes from here:
// plain code over the sample spans (group-by with percentiles, before/after, a BubbleUp-style
// attribute diff, an exemplar trace). The LLM only chooses the tool and its arguments.
import { ALL_ATTRIBUTES, APP_ATTRIBUTES, MINUTES, SLO, STANDARD_ATTRIBUTES, clock, dataset } from './data.js';

const MAX_GROUPS = 7;

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

function stats(rows) {
  const durations = rows.map(row => row.duration_ms).sort((a, b) => a - b);
  const errors = rows.reduce((sum, row) => sum + (row.status_code >= 500 ? 1 : 0), 0);
  return {
    count: rows.length,
    p50_ms: percentile(durations, 0.5),
    p99_ms: percentile(durations, 0.99),
    error_pct: rows.length ? Math.round((errors / rows.length) * 1000) / 10 : 0,
  };
}

function matcher(filter) {
  const tests = Object.entries(filter && typeof filter === 'object' ? filter : {})
    .filter(([key]) => ALL_ATTRIBUTES.includes(key))
    .slice(0, 6)
    .map(([key, raw]) => {
      const values = (Array.isArray(raw) ? raw : [raw]).map(value => String(value));
      return row => {
        const actual = String(row[key]);
        return values.some(value =>
          value.endsWith('*') ? actual.startsWith(value.slice(0, -1)) : actual === value
        );
      };
    });
  return { tests, all: row => tests.every(test => test(row)), any: row => tests.some(test => test(row)) };
}

/** Rows matching `where` (every pair) and none of `exclude` (any pair), inside a window. */
function select(spans, { where, exclude, from = 0, to = MINUTES }) {
  const keep = matcher(where);
  const drop = matcher(exclude);
  return spans.filter(
    row => row.ts >= from && row.ts < to && keep.all(row) && !(drop.tests.length && drop.any(row))
  );
}

function cleanFilter(filter) {
  const out = {};
  for (const [key, value] of Object.entries(filter && typeof filter === 'object' ? filter : {})) {
    if (ALL_ATTRIBUTES.includes(key)) out[key] = Array.isArray(value) ? value.map(String) : String(value);
  }
  return out;
}

function groupKeys(groupBy) {
  const list = (Array.isArray(groupBy) ? groupBy : [groupBy]).filter(key => ALL_ATTRIBUTES.includes(key));
  return list.slice(0, 2);
}

function groupRows(rows, keys) {
  const groups = new Map();
  for (const row of rows) {
    const id = keys.map(key => row[key]).join(' | ');
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(row);
  }
  return groups;
}

/** SLI per minute and the minute the burn began, worked out from the data (not from the plant). */
export function alertFor(scenarioId) {
  const { spans, traceCount, markers, scenario } = dataset(scenarioId);
  const roots = spans.filter(row => row['service.name'] === 'frontend' && row['http.route'] === 'POST /checkout');
  const isBad = row => row.duration_ms > SLO.thresholdMs || row.status_code >= 500;
  const perMinute = Array.from({ length: MINUTES }, () => ({ good: 0, bad: 0, durations: [] }));
  for (const row of roots) {
    const bucket = perMinute[Math.floor(row.ts)];
    bucket[isBad(row) ? 'bad' : 'good'] += 1;
    bucket.durations.push(row.duration_ms);
  }
  const budget = 1 - SLO.target;
  // Burn start: the split of the two hours that best separates a quiet stretch from a burning
  // one (two-segment likelihood over the per-minute good/bad counts)
  const totals = perMinute.map(item => ({ bad: item.bad, all: item.bad + item.good }));
  const logLike = (k, n) => {
    if (!n || !k || k === n) return 0;
    const p = k / n;
    return k * Math.log(p) + (n - k) * Math.log(1 - p);
  };
  let start = MINUTES - 5;
  let best = -Infinity;
  for (let minute = 20; minute < MINUTES - 2; minute++) {
    const sum = (list, key) => list.reduce((total, item) => total + item[key], 0);
    const left = totals.slice(0, minute);
    const right = totals.slice(minute);
    const score = logLike(sum(left, 'bad'), sum(left, 'all')) + logLike(sum(right, 'bad'), sum(right, 'all'));
    if (score > best) {
      best = score;
      start = minute;
    }
  }
  const since = perMinute.slice(start);
  const bad = since.reduce((sum, item) => sum + item.bad, 0);
  const total = since.reduce((sum, item) => sum + item.bad + item.good, 0);
  const before = perMinute.slice(0, start);
  const badBefore = before.reduce((sum, item) => sum + item.bad, 0);
  const totalBefore = before.reduce((sum, item) => sum + item.bad + item.good, 0);
  // Two-minute buckets keep the chart calm
  const series = [];
  for (let minute = 0; minute < MINUTES; minute += 2) {
    const durations = [...perMinute[minute].durations, ...perMinute[minute + 1].durations].sort((a, b) => a - b);
    series.push(percentile(durations, 0.99));
  }
  const tenants = new Set(spans.map(row => row['tenant.id'])).size;
  const pods = new Set(spans.map(row => row['k8s.pod.name'])).size;
  return {
    scenario: scenario.id,
    slo: SLO.name,
    sli: SLO.sli,
    target: '99%',
    threshold_ms: SLO.thresholdMs,
    fired_at: clock(MINUTES - 1),
    burn_started: clock(start),
    burn_start_minute: start,
    burn_rate: Math.round((bad / Math.max(1, total) / budget) * 10) / 10,
    bad_since_start: bad,
    checkouts_since_start: total,
    bad_pct_before: Math.round((badBefore / Math.max(1, totalBefore)) * 1000) / 10,
    series,
    markers,
    dataset: { spans: spans.length, traces: traceCount, tenants, pods, attributes: ALL_ATTRIBUTES.length, minutes: MINUTES },
  };
}

function windowRange(alert, window) {
  if (window === 'baseline') return { from: 0, to: alert.burn_start_minute };
  if (window === 'all') return { from: 0, to: MINUTES };
  return { from: alert.burn_start_minute, to: MINUTES };
}

const TOOLS = {
  query({ spans, alert }, args) {
    const keys = groupKeys(args.group_by);
    if (!keys.length) return { error: `group_by must name one or two of: ${ALL_ATTRIBUTES.join(', ')}` };
    const window = ['incident', 'baseline', 'all'].includes(args.window) ? args.window : 'incident';
    const rows = select(spans, { where: args.where, exclude: args.exclude, ...windowRange(alert, window) });
    const order = ['count', 'error_pct'].includes(args.order_by) ? args.order_by : 'p99_ms';
    const groups = [...groupRows(rows, keys)]
      .map(([id, list]) => ({ group: id, ...stats(list) }))
      .filter(group => group.count >= 5)
      .sort((a, b) => b[order] - a[order]);
    return {
      window,
      group_by: keys,
      total: stats(rows),
      groups: groups.slice(0, MAX_GROUPS),
      groups_not_shown: Math.max(0, groups.length - MAX_GROUPS),
    };
  },

  before_after({ spans, alert, markers }, args) {
    const keys = groupKeys(args.group_by);
    if (!keys.length) return { error: `group_by must name one or two of: ${ALL_ATTRIBUTES.join(', ')}` };
    const marker = markers.find(item => item.id === args.pivot);
    const pivot = marker ? marker.minute : alert.burn_start_minute;
    const before = groupRows(select(spans, { where: args.where, exclude: args.exclude, from: 0, to: pivot }), keys);
    const after = groupRows(select(spans, { where: args.where, exclude: args.exclude, from: pivot, to: MINUTES }), keys);
    const ids = new Set([...before.keys(), ...after.keys()]);
    const groups = [...ids]
      .map(id => {
        const b = before.get(id) || [];
        const a = after.get(id) || [];
        const bs = stats(b);
        const as = stats(a);
        return {
          group: id,
          before: b.length >= 5 ? bs : { count: b.length },
          after: a.length >= 5 ? as : { count: a.length },
          p99_change: b.length >= 5 && a.length >= 5 && bs.p99_ms ? Math.round((as.p99_ms / bs.p99_ms) * 10) / 10 : null,
          after_p99: a.length >= 5 ? as.p99_ms : 0,
        };
      })
      .filter(group => (group.before.count || 0) + (group.after.count || 0) >= 8)
      .sort((x, y) => y.after_p99 - x.after_p99)
      .map(({ after_p99, ...group }) => group);
    return {
      pivot: marker ? `${marker.id} at ${marker.at}` : `burn start at ${alert.burn_started}`,
      group_by: keys,
      groups: groups.slice(0, MAX_GROUPS),
      groups_not_shown: Math.max(0, groups.length - MAX_GROUPS),
    };
  },

  attribute_diff({ spans, alert }, args) {
    const scope = select(spans, { where: args.where, exclude: args.exclude, from: 0, to: MINUTES });
    if (scope.length < 20) return { error: 'Fewer than 20 spans match `where`. Loosen the filter.' };
    const baselineRows = scope.filter(row => row.ts < alert.burn_start_minute);
    const baselineP99 = percentile(
      baselineRows.map(row => row.duration_ms).sort((a, b) => a - b),
      0.99
    );
    const threshold = Number(args.slower_than_ms) > 0 ? Number(args.slower_than_ms) : baselineP99;
    const isSlow = row =>
      row.ts >= alert.burn_start_minute && (row.duration_ms > threshold || row.status_code >= 500);
    const slow = scope.filter(isSlow);
    const rest = scope.filter(row => !isSlow(row));
    if (slow.length < 5) {
      return { slower_than_ms: threshold, slow_spans: slow.length, note: 'Almost nothing in this selection is slow since the burn began.' };
    }
    const requested = (Array.isArray(args.attributes) ? args.attributes : []).flatMap(name => {
      const text = String(name);
      if (text.endsWith('*')) return ALL_ATTRIBUTES.filter(key => key.startsWith(text.slice(0, -1)));
      return ALL_ATTRIBUTES.includes(text) ? [text] : [];
    });
    const attributes = [...new Set(requested.length ? requested : STANDARD_ATTRIBUTES)].filter(
      key => !(args.where && key in args.where && !String(args.where[key]).endsWith('*'))
    );
    const share = (rows, key) => {
      const counts = new Map();
      for (const row of rows) counts.set(String(row[key]), (counts.get(String(row[key])) || 0) + 1);
      return counts;
    };
    const differences = [];
    for (const key of attributes) {
      const inSlow = share(slow, key);
      const inRest = share(rest, key);
      for (const [value, count] of inSlow) {
        const slowPct = (count / slow.length) * 100;
        const restPct = ((inRest.get(value) || 0) / Math.max(1, rest.length)) * 100;
        differences.push({
          attribute: key,
          value,
          slow_pct: Math.round(slowPct),
          baseline_pct: Math.round(restPct),
          diff: Math.round(slowPct - restPct),
        });
      }
    }
    differences.sort((a, b) => b.diff - a.diff);
    return {
      slower_than_ms: threshold,
      slow_spans: slow.length,
      baseline_spans: rest.length,
      attributes_compared: attributes,
      top_differences: differences.filter(item => item.diff >= 8).slice(0, 8),
    };
  },

  get_trace({ spans, alert }, args) {
    const rows = select(spans, { where: args.where, exclude: args.exclude, ...windowRange(alert, 'incident') });
    if (!rows.length) return { error: 'No spans match since the burn began.' };
    const sorted = [...rows].sort((a, b) => b.duration_ms - a.duration_ms);
    const hit = args.pick === 'slowest' ? sorted[0] : sorted[Math.floor(sorted.length * 0.03)];
    const trace = spans.filter(row => row['trace.id'] === hit['trace.id']);
    const root = trace.find(row => !row['parent.id']) || trace[0];
    const depth = row => {
      let level = 0;
      let current = row;
      while (current && current['parent.id']) {
        current = trace.find(item => item['span.id'] === current['parent.id']);
        level += 1;
      }
      return level;
    };
    return {
      trace_id: root['trace.id'],
      at: clock(root.ts),
      duration_ms: root.duration_ms,
      attributes: Object.fromEntries(
        ['tenant.id', 'region', 'user.tier', ...APP_ATTRIBUTES].map(key => [key, root[key]])
      ),
      spans: trace.map(row => ({
        depth: depth(row),
        service: row['service.name'],
        route: row['http.route'],
        duration_ms: row.duration_ms,
        self_ms: row.self_ms,
        status: row.status_code,
        build: row['build.id'],
        pod: row['k8s.pod.name'],
      })),
    };
  },

  list_attributes({ spans }, args) {
    const prefix = String(args.prefix || '').replace(/\*$/, '');
    const names = ALL_ATTRIBUTES.filter(key => key.startsWith(prefix));
    return {
      attributes: names.map(key => {
        const values = new Set(spans.map(row => String(row[key])));
        return { name: key, distinct_values: values.size, examples: [...values].slice(0, 3) };
      }),
    };
  },
};

export const TOOL_NAMES = Object.keys(TOOLS);

/** Runs one tool over a scenario's spans. Returns { result, ms, args } (args cleaned). */
export function runTool(scenarioId, alert, name, rawArgs) {
  const started = Date.now();
  const data = dataset(scenarioId);
  const args = { ...(rawArgs && typeof rawArgs === 'object' ? rawArgs : {}) };
  delete args.because;
  if (args.where) args.where = cleanFilter(args.where);
  if (args.exclude) args.exclude = cleanFilter(args.exclude);
  for (const key of ['where', 'exclude']) if (args[key] && !Object.keys(args[key]).length) delete args[key];
  const tool = TOOLS[name];
  const result = tool ? tool({ spans: data.spans, alert, markers: data.markers }, args) : { error: `Unknown tool ${name}` };
  return { args, result, ms: Date.now() - started };
}

/**
 * Own time per service (downstream calls excluded) before and after the burn began: the triage
 * every agent starts from. The service whose own time grew is where to look; its callers only
 * pass the slowness along.
 */
export function triage(scenarioId, alert) {
  const { spans } = dataset(scenarioId);
  const from = alert.burn_start_minute;
  const p99Self = rows => percentile(rows.map(row => row.self_ms).sort((a, b) => a - b), 0.99);
  const services = [...new Set(spans.map(row => row['service.name']))];
  return services
    .map(service => {
      const rows = spans.filter(row => row['service.name'] === service);
      const before = p99Self(rows.filter(row => row.ts < from));
      const after = p99Self(rows.filter(row => row.ts >= from));
      return { service, before_p99: before, after_p99: after, change: Math.round((after / Math.max(1, before)) * 10) / 10 };
    })
    .sort((a, b) => b.change - a.change);
}

/**
 * Code-side check of a proposed root cause: how much of the SLO damage it covers.
 * culprit: { service, pairs: { attr: value } }. Counts bad checkouts since the burn began
 * whose trace has a span on that service matching every pair.
 */
export function verify(scenarioId, alert, culprit) {
  const { spans } = dataset(scenarioId);
  const from = alert.burn_start_minute;
  const where = { ...cleanFilter(culprit.pairs), ...(culprit.service && { 'service.name': culprit.service }) };
  const matching = select(spans, { where, from, to: MINUTES });
  const traceIds = new Set(matching.map(row => row['trace.id']));
  const roots = spans.filter(
    row => row.ts >= from && row['service.name'] === 'frontend' && row['http.route'] === 'POST /checkout'
  );
  const bad = roots.filter(row => row.duration_ms > SLO.thresholdMs || row.status_code >= 500);
  const badCovered = bad.filter(row => traceIds.has(row['trace.id'])).length;
  const inScope = roots.filter(row => traceIds.has(row['trace.id']));
  const outScope = roots.filter(row => !traceIds.has(row['trace.id']));
  const inBad = inScope.filter(row => row.duration_ms > SLO.thresholdMs || row.status_code >= 500).length;
  const outBad = outScope.length - outScope.filter(row => row.duration_ms <= SLO.thresholdMs && row.status_code < 500).length;
  return {
    where,
    bad_checkouts: bad.length,
    bad_explained: badCovered,
    explained_pct: bad.length ? Math.round((badCovered / bad.length) * 100) : 0,
    matching: { checkouts: inScope.length, ...stats(inScope), bad_pct: inScope.length ? Math.round((inBad / inScope.length) * 100) : 0 },
    everything_else: { checkouts: outScope.length, ...stats(outScope), bad_pct: outScope.length ? Math.round((outBad / outScope.length) * 1000) / 10 : 0 },
    service_spans: stats(matching),
  };
}

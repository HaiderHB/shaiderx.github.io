// Run state for the page: investigation events (live stream or the recorded example) folded
// into what the canvas shows. Pure, so the same reducer serves live runs and replays.
import { HYPOTHESES } from './agent';

export function emptyRun(alert = null) {
  return {
    alert,
    triage: null,
    ranks: [],
    agents: Object.fromEntries(HYPOTHESES.map(item => [item.id, { claimed: false, calls: [], finding: null }])),
    candidates: null,
    followUp: null,
    coordinating: false,
    summary: null,
    cached: false,
    error: null,
  };
}

export function reduceRun(run, event) {
  const lane = id => run.agents[id];
  const withLane = (id, patch) => ({ ...run, agents: { ...run.agents, [id]: { ...lane(id), ...patch } } });
  switch (event.t) {
    case 'meta':
      return { ...run, cached: Boolean(event.cached) };
    case 'alert':
      return { ...run, alert: event.alert };
    case 'triage':
      return { ...run, triage: event.rows };
    case 'rank':
      return event.failed ? run : { ...run, ranks: [...run.ranks, event] };
    case 'claim':
      return withLane(event.agent, { claimed: true });
    case 'call':
      return withLane(event.agent, {
        claimed: true,
        calls: [...lane(event.agent).calls, { id: event.id, name: event.name, args: event.args, because: event.because }],
      });
    case 'result':
      return withLane(event.agent, {
        calls: lane(event.agent).calls.map(call =>
          call.id === event.id ? { ...call, result: event.result, summary: event.summary, ms: event.ms } : call
        ),
      });
    case 'finding':
      return withLane(event.agent, { finding: event });
    case 'followup':
      return { ...run, followUp: event };
    case 'candidates':
      return { ...run, candidates: event.candidates };
    case 'coordinating':
      return { ...run, coordinating: true };
    case 'summary':
      return { ...run, coordinating: false, summary: event };
    case 'error':
      return { ...run, coordinating: false, error: event.message };
    default:
      return run;
  }
}

export const foldRun = events => events.reduce(reduceRun, emptyRun());

/** Pause before each event when replaying the recorded run (ms). */
export function replayDelay(event) {
  return (
    { triage: 250, rank: 350, claim: 180, call: 420, result: 300, finding: 650, followup: 600, candidates: 600, coordinating: 250, summary: 800 }[
      event.t
    ] ?? 0
  );
}

/** How often each skill id was cited in a run's query reasons and findings. */
export function skillCitations(run) {
  const counts = {};
  for (const item of HYPOTHESES) {
    const lane = run.agents[item.id];
    const texts = [...lane.calls.map(call => call.because), lane.finding?.detail, lane.finding?.headline];
    for (const text of texts) {
      for (const id of new Set(String(text || '').match(/\bS\d\b/g) || [])) counts[id] = (counts[id] || 0) + 1;
    }
  }
  return counts;
}

// Server helpers shared by the Stacksync demo routes (not a route: only *.api.js files are).
// The LLM drafts the write plan, the decision model picks the route (both cached by input), the
// store interface the idempotent apply runs on, and one JSON log line per step.
import crypto from 'crypto';
import { askJev, chat, DEMO_LLM, jevQuestion } from 'demos/models';
import { getJSON, listJSON, pushJSON, setJSON, setJSONIfAbsent } from 'demos/store';
import { EXAMPLES } from 'pages/demo/stacksync/example';
import {
  DECISION_QUESTION,
  PLAN_SYSTEM,
  ROUTES,
  SESSION_PATTERN,
  VERSION,
  canonical,
  parsePlan,
  planHash,
  planPrompt,
} from 'pages/demo/stacksync/sync';

export const LLM_MODEL = DEMO_LLM.model();
export const CACHE_SECONDS = 24 * 3600;

export const hash = (...parts) =>
  crypto.createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 32);

export const store = { get: getJSON, set: setJSON, setIfAbsent: setJSONIfAbsent, push: pushJSON, list: listJSON };

export function readSession(value) {
  const session = String(value || '').slice(0, 60);
  return SESSION_PATTERN.test(session) ? session : null;
}

export const planCacheKey = deal => `cache:stacksync:plan:${hash(VERSION, LLM_MODEL, canonical(deal))}`;

export async function cachedPlan(deal) {
  try {
    return await getJSON(planCacheKey(deal));
  } catch {
    return null;
  }
}

/** The LLM turns the deal into a write plan (JSON mode, temperature 0); one deal is drafted once. */
export async function draftPlan(deal, facts) {
  const hit = await cachedPlan(deal);
  if (hit) return { ...hit, cached: true };
  const started = Date.now();
  const text = await chat({
    provider: DEMO_LLM.provider,
    model: LLM_MODEL,
    system: PLAN_SYSTEM,
    messages: [{ role: 'user', content: planPrompt(deal, facts) }],
    maxTokens: 900,
    temperature: 0,
    json: true,
  });
  const value = { plan: parsePlan(text), llmMs: Date.now() - started };
  if (value.plan) await setJSON(planCacheKey(deal), value, CACHE_SECONDS).catch(() => {});
  return { ...value, cached: false };
}

/** The decision model's route with probabilities; an identical state is answered once. */
export async function decide(state) {
  const key = `cache:stacksync:route:${hash(VERSION, JSON.stringify(state))}`;
  const hit = await getJSON(key).catch(() => null);
  if (hit) return { ...hit, cached: true };
  const started = Date.now();
  const call = () => askJev(state, { route: jevQuestion.choice(DECISION_QUESTION.instructions, DECISION_QUESTION.criteria) });
  let answers;
  try {
    ({ answers } = await call());
  } catch {
    await new Promise(resolve => setTimeout(resolve, 400));
    ({ answers } = await call());
  }
  const answer = answers.route || {};
  const value = {
    choice: answer.choice,
    probabilities: answer.probabilities || null,
    confidence: answer.confidence ?? null,
    ms: Date.now() - started,
  };
  if (ROUTES.includes(value.choice)) await setJSON(key, value, CACHE_SECONDS).catch(() => {});
  return { ...value, cached: false };
}

/** Remembers which route a plan earned, so /apply only writes what a run cleared. */
export const runKey = planHashValue => `stacksync:run:${planHashValue}`;

let exampleHashes = null;
/** The recorded sample runs, by plan hash (the page replays these without calling /plan). */
export async function exampleRun(planHashValue) {
  if (!exampleHashes) {
    exampleHashes = {};
    for (const [sampleId, example] of Object.entries(EXAMPLES)) {
      exampleHashes[await planHash(example.plan)] = { sampleId, decision: example.decision };
    }
  }
  return exampleHashes[planHashValue] || null;
}

/** One JSON line per step for the logs: grep a deal id or an idempotency key. */
export function trace(event, fields) {
  console.log(JSON.stringify({ evt: `stacksync.${event}`, at: new Date().toISOString(), ...fields }));
}

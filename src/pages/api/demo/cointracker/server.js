// Server helpers shared by the CoinTracker demo routes (not a route: only *.api.js files are).
// The LLM reads the documents into a typed record and proposes actions; the decision model routes
// each action. Every call is cached by its exact input, so a repeat costs nothing. Run checkpoints
// live in the store so a paused run resumes where it stopped.
import crypto from 'crypto';
import { askJev, chat, DEMO_LLM, jevQuestion } from 'demos/models';
import { getJSON, listJSON, pushJSON, setJSON, setJSONIfAbsent } from 'demos/store';
import {
  DECISION_QUESTION,
  EXTRACT_SYSTEM,
  INT_SYSTEM,
  PROPOSE_SYSTEM,
  RECORD_SCHEMA,
  ROUTES,
  VERSION,
  canonical,
  checkSchema,
  decisionState,
  extractPrompt,
  normalizeActions,
  parseJson,
  proposePrompt,
} from 'pages/demo/cointracker/agent';
import { EXAMPLE } from 'pages/demo/cointracker/example';

export const LLM_MODEL = DEMO_LLM.model();
export const CACHE_SECONDS = 24 * 3600;

export const hash = (...parts) => crypto.createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 32);

export const store = { get: getJSON, set: setJSON, setIfAbsent: setJSONIfAbsent, push: pushJSON, list: listJSON };

export const RUN_ID_PATTERN = /^r_[a-z0-9]{10,24}$/;
export const newRunId = () => `r_${crypto.randomBytes(8).toString('hex')}`;
export const runKey = runId => `cointracker:run:${runId}`;
export const runCacheKey = figures => `cache:cointracker:run:${hash(VERSION, LLM_MODEL, canonical(figures))}`;
/** Whether these exact figures already ran (then every model call is a cache hit and the run is free). */
export const getRunCache = figures => getJSON(runCacheKey(figures)).catch(() => null);

async function cachedValue(key, compute) {
  const hit = await getJSON(key).catch(() => null);
  if (hit) return { ...hit, cached: true };
  const started = Date.now();
  const value = await compute();
  const result = { ...value, ms: Date.now() - started };
  if (value && !value.failed) await setJSON(key, result, CACHE_SECONDS).catch(() => {});
  return { ...result, cached: false };
}

async function llmJson(system, content, maxTokens) {
  const text = await chat({
    provider: DEMO_LLM.provider,
    model: LLM_MODEL,
    system,
    messages: [{ role: 'user', content }],
    maxTokens,
    temperature: 0,
    json: true,
  });
  return parseJson(text);
}

/** The LLM copies the documents' figures into the typed record (JSON mode, temperature 0). */
export function extractRecord(texts) {
  const prompt = extractPrompt(texts);
  return cachedValue(`cache:cointracker:extract:${hash(VERSION, LLM_MODEL, prompt)}`, async () => {
    const record = await llmJson(EXTRACT_SYSTEM, prompt, 900);
    return record ? { record } : { record: null, failed: true };
  });
}

/** The LLM proposes the actions from the record, the checklist and the intake notes. */
export function proposeActions(record, complete) {
  const prompt = proposePrompt(record, complete);
  return cachedValue(`cache:cointracker:propose:${hash(VERSION, LLM_MODEL, prompt)}`, async () => {
    const value = await llmJson(PROPOSE_SYSTEM, prompt, 1400);
    const actions = normalizeActions(value);
    return actions.length ? { actions } : { actions: [], failed: true };
  });
}

/** The decision model's route for one action, with probabilities; an identical state is answered once. */
export function decide(action, checks) {
  const state = decisionState(action, checks);
  return cachedValue(`cache:cointracker:route:${hash(VERSION, JSON.stringify(state))}`, async () => {
    const call = () => askJev(state, { route: jevQuestion.choice(DECISION_QUESTION.instructions, DECISION_QUESTION.criteria) });
    let answers;
    try {
      ({ answers } = await call());
    } catch {
      await new Promise(resolve => setTimeout(resolve, 400));
      ({ answers } = await call());
    }
    const answer = answers.route || {};
    const value = { choice: answer.choice, probabilities: answer.probabilities || null, confidence: answer.confidence ?? null };
    return ROUTES.includes(value.choice) ? value : { ...value, failed: true };
  });
}

/** The LLM reads the uploaded 1099-INT. */
export function readInterestForm(text) {
  return cachedValue(`cache:cointracker:int:${hash(VERSION, LLM_MODEL, text)}`, async () => {
    const form = await llmJson(INT_SYSTEM, text, 200);
    return form ? { form } : { form: null, failed: true };
  });
}

/** A run's checkpoint: the record, actions and decisions, and the step it paused at. */
export async function loadRun(runId) {
  if (runId === 'example') return { ...EXAMPLE.run, edits: null, pausedAt: 6 };
  if (!RUN_ID_PATTERN.test(String(runId || ''))) return null;
  return getJSON(runKey(runId)).catch(() => null);
}

/**
 * The checkpoint as the page holds it, for when the store has lost the run (no durable store, a
 * different serverless instance). Only shapes code can check get through: the record must match the
 * schema, actions are re-normalized, decisions keep known routes and numbers only.
 */
export function runFromClient(value) {
  if (!value || typeof value !== 'object') return null;
  const { errors, unknown } = checkSchema(value.record, RECORD_SCHEMA);
  if (errors.length || unknown.length) return null;
  const actions = normalizeActions({ actions: value.actions });
  const decisions = {};
  for (const action of actions) {
    const entry = value.decisions?.[action.id];
    if (!entry || !ROUTES.includes(entry.choice)) continue;
    const probabilities = Object.fromEntries(ROUTES.map(route => [route, Math.max(0, Math.min(1, Number(entry.probabilities?.[route]) || 0))]));
    decisions[action.id] = { choice: entry.choice, probabilities };
  }
  const edits = value.edits && typeof value.edits === 'object' ? value.edits : null;
  return { record: value.record, actions, decisions, edits, pausedAt: 6, fromClient: true };
}

/** One JSON line per step for the logs: grep a run id or an idempotency key. */
export function trace(event, fields) {
  console.log(JSON.stringify({ evt: `cointracker.${event}`, at: new Date().toISOString(), ...fields }));
}

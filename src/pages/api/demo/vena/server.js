// Server helpers for the Vena demo route (not a route: only *.api.js files are). Wraps the two
// models with caching: the decision model's answer for an identical account (code, name, side) is
// stored once, so a repeated row or a re-run costs nothing; the LLM's second look is cached by the
// exact set of rows it saw. One JSON log line per run, traceable by runId.
import crypto from 'crypto';
import { askJev, chat, DEMO_LLM, jevQuestion } from 'demos/models';
import { getJSON, setJSON } from 'demos/store';
import { FAST_QUESTION, LLM_SYSTEM, fastState, llmPayload } from 'pages/demo/vena/pipeline';

export const VERSION = 'vena-v1';
export const CACHE_SECONDS = 7 * 24 * 3600;
const LLM_MODEL = DEMO_LLM.model();

export const hash = (...parts) =>
  crypto.createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 32);

export const randomId = prefix => `${prefix}_${crypto.randomBytes(8).toString('base64url')}`;

const inflight = new Map();

/** One row through the decision model (choice over the chart), cached by what it reads. */
export function askFast(row) {
  const state = fastState(row);
  const key = `cache:vena:fast:${hash(VERSION, JSON.stringify(state))}`;
  if (inflight.has(key)) return inflight.get(key).then(value => ({ ...value, cached: true }));
  const promise = (async () => {
    const hit = await getJSON(key).catch(() => null);
    if (hit) return { ...hit, cached: true };
    const started = Date.now();
    const call = () =>
      askJev(state, { account: jevQuestion.choice(FAST_QUESTION.instructions, FAST_QUESTION.criteria) });
    let result;
    try {
      result = await call();
    } catch {
      await new Promise(resolve => setTimeout(resolve, 300));
      result = await call();
    }
    const answer = result.answers.account || {};
    const value = {
      choice: answer.choice,
      probabilities: answer.probabilities || {},
      ms: Date.now() - started,
      tokens: result.inputTokens,
    };
    if (answer.choice) await setJSON(key, value, CACHE_SECONDS).catch(() => {});
    return { ...value, cached: false };
  })();
  inflight.set(key, promise);
  promise.finally(() => setTimeout(() => inflight.delete(key), 1000));
  return promise;
}

/** The unsure rows in one LLM call (JSON reply), cached by the rows and their candidates. */
export async function askLlm(rows) {
  const payload = JSON.stringify(llmPayload(rows));
  const key = `cache:vena:llm:${hash(VERSION, LLM_MODEL, payload)}`;
  const hit = await getJSON(key).catch(() => null);
  if (hit?.text) return { ...hit, cached: true };
  const started = Date.now();
  const text = await chat({
    provider: DEMO_LLM.provider,
    model: LLM_MODEL,
    system: LLM_SYSTEM,
    messages: [{ role: 'user', content: payload }],
    maxTokens: Math.min(1800, 120 + rows.length * 70),
    temperature: 0,
    json: true,
  });
  // The router does not return usage here; estimate at ~4 characters a token
  const value = {
    text,
    ms: Date.now() - started,
    tokens: Math.round((LLM_SYSTEM.length + payload.length + String(text).length) / 4),
  };
  await setJSON(key, value, CACHE_SECONDS).catch(() => {});
  return { ...value, cached: false };
}

export function trace(event, fields) {
  console.log(JSON.stringify({ evt: `vena.${event}`, at: new Date().toISOString(), ...fields }));
}

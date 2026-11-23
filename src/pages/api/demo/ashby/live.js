// Live model calls shared by the Ashby routes (not a route itself: only *.api.js files are).
// The LLM extracts requirements, screens and cites evidence; a fast decision model gives fit
// verdicts with probabilities. A finished run is cached by job description, so an identical
// request replays for free.
import crypto from 'crypto';
import { askJev, chat, DEMO_LLM, jevQuestion } from 'demos/models';
import { getJSON, setJSON } from 'demos/store';
import { rediscover, VERDICT_QUESTIONS } from 'pages/demo/ashby/agent';

export const MODEL = DEMO_LLM.model();
export const VERSION = 'ashby-v7';
export const CACHE_SECONDS = 24 * 3600;

export const hash = (...parts) => crypto.createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 32);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// The LLM provider caps concurrent requests per account and other demos share it: a small
// in-process gate keeps this demo at three calls in flight.
const LLM_SLOTS = Number(process.env.DEMO_ASHBY_LLM_SLOTS) || 3;
let active = 0;
const waiting = [];
async function withSlot(fn) {
  if (active >= LLM_SLOTS) await new Promise(resolve => waiting.push(resolve));
  active += 1;
  try {
    return await fn();
  } finally {
    active -= 1;
    waiting.shift()?.();
  }
}

/** Retries with a growing pause; a rate-limited reply (429) waits longer. */
export async function withRetry(fn, attempts = 6) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const limited = /\b429\b/.test(String(error?.message));
      await sleep((limited ? 2000 : 700) + attempt * 1000 + Math.random() * 600);
    }
  }
  throw lastError;
}

export function llm({ system, user, maxTokens = 800, json = false }) {
  return withRetry(() =>
    withSlot(() =>
      chat({
        provider: DEMO_LLM.provider,
        model: MODEL,
        system,
        messages: [{ role: 'user', content: user }],
        maxTokens,
        temperature: 0,
        json,
      })
    )
  );
}

const round = value => Math.round((Number(value) || 0) * 1000) / 1000;

/** Fit verdict and past-concern probability for one candidate. */
export async function decide(state) {
  const { answers } = await withRetry(() =>
    askJev(state, {
      fit: jevQuestion.choice(VERDICT_QUESTIONS.fit.instructions, VERDICT_QUESTIONS.fit.criteria),
      concern: jevQuestion.noul(VERDICT_QUESTIONS.concern.instructions),
    })
  );
  const fit = answers.fit || {};
  const probabilities = {};
  for (const key of Object.keys(VERDICT_QUESTIONS.fit.criteria)) probabilities[key] = round(fit.probabilities?.[key]);
  const concern = answers.concern;
  const p = typeof concern?.noul === 'number' ? concern.noul : concern?.probabilities?.yes ?? concern?.probability;
  return { fit: { choice: fit.choice, probabilities }, concern: round(p) };
}

export const runKey = jd => `ashby:run:${hash(VERSION, MODEL, String(jd).trim())}`;

export async function cachedRun(jd) {
  try {
    return await getJSON(`cache:${runKey(jd)}`);
  } catch {
    return null;
  }
}

/** Runs one rediscovery (or replays the cached one). onEvent(event, cached) gets every step. */
export async function runRediscovery(jd, onEvent) {
  const replay = await cachedRun(jd);
  if (replay) {
    for (const event of replay) {
      onEvent(event, true);
      if (event.t === 'evidence' || event.t === 'screen') await sleep(90);
    }
    return { events: replay, cached: true };
  }
  const events = [];
  await rediscover({ jd }, { llm, decide }, event => {
    events.push(event);
    onEvent(event, false);
  });
  if (events.some(event => event.t === 'done')) await setJSON(`cache:${runKey(jd)}`, events, CACHE_SECONDS).catch(() => {});
  return { events, cached: false };
}

// Live model calls and streaming shared by the Honeycomb routes (not a route itself: only
// *.api.js files are). The LLM picks tools and writes findings (OpenAI-style tool calling);
// a fast decision model ranks the hypotheses with probabilities. A finished investigation is
// cached by scenario and skills, so an identical request replays for free.
import crypto from 'crypto';
import { askJev, chat, chatTools, DEMO_LLM, jevQuestion } from 'demos/models';
import { getJSON, setJSON } from 'demos/store';
import { HYPOTHESES, investigate } from 'pages/demo/honeycomb/agent';

export const MODEL = DEMO_LLM.model();
export const VERSION = 'honeycomb-v12';
export const CACHE_SECONDS = 12 * 3600;

export const hash = (...parts) =>
  crypto.createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 32);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// The LLM provider caps concurrent requests per account, and an eval runs fifteen agents at
// once: a small in-process gate keeps the calls under the cap.
const LLM_SLOTS = Number(process.env.DEMO_HONEYCOMB_LLM_SLOTS) || 3;
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

/** Retries with a growing pause: one flaky or rate-limited reply should not end a run. */
async function withRetry(fn) {
  let lastError;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      // A rate-limited reply (429) waits longer: the cap is per account and clears in seconds
      const limited = /\b429\b/.test(String(error?.message));
      await sleep((limited ? 1800 : 600) + attempt * 900 + Math.random() * 600);
    }
  }
  throw lastError;
}

/** One agent turn. force: the name of the tool the model must call (its last turn). */
async function turn({ system, messages, tools, force }) {
  return withRetry(() => withSlot(() =>
    chatTools({
      provider: DEMO_LLM.provider,
      model: MODEL,
      system,
      messages,
      tools,
      toolChoice: force ? { type: 'function', function: { name: force } } : 'auto',
      maxTokens: 500,
      temperature: 0,
    }))
  );
}

/** The decision model ranks the three hypotheses: probabilities, not prose. */
async function rank(state) {
  const criteria = Object.fromEntries(HYPOTHESES.map(item => [item.id, item.claim]));
  const { answers } = await withRetry(() =>
    askJev(state, {
      cause: jevQuestion.choice(
        'Which hypothesis best explains the SLO burn, given the triage and the findings so far? A finding that rules a hypothesis out with data counts strongly against it.',
        criteria
      ),
    })
  );
  const answer = answers.cause || {};
  const probabilities = {};
  for (const item of HYPOTHESES) {
    probabilities[item.id] = Math.round((Number(answer.probabilities?.[item.id]) || 0) * 1000) / 1000;
  }
  return { choice: answer.choice, probabilities };
}

/** The coordinator's JSON answer. */
async function coordinate({ system, user }) {
  const text = await withRetry(() => withSlot(() =>
    chat({
      provider: DEMO_LLM.provider,
      model: MODEL,
      system,
      messages: [{ role: 'user', content: user }],
      maxTokens: 450,
      temperature: 0,
      json: true,
    }))
  );
  try {
    return JSON.parse(text);
  } catch {
    const match = String(text).match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : {};
  }
}

// trial: 0 for the page's own runs; the eval repeats each scenario and keeps the trials apart
export const runKey = (scenarioId, skills, trial = 0) =>
  `honeycomb:run:${hash(VERSION, MODEL, scenarioId, JSON.stringify(skills), trial)}`;

export async function cachedRun(key) {
  try {
    return await getJSON(`cache:${key}`);
  } catch {
    return null;
  }
}

/**
 * Runs one investigation (or replays the cached one). onEvent gets every event as it happens.
 * Returns { events, cached }.
 */
export async function runInvestigation({ scenarioId, skills, trial = 0 }, onEvent) {
  const key = runKey(scenarioId, skills, trial);
  const replay = await cachedRun(key);
  if (replay) {
    for (const event of replay) {
      onEvent?.(event, true);
      if (onEvent && (event.t === 'result' || event.t === 'finding' || event.t === 'rank')) await sleep(140);
    }
    return { events: replay, cached: true };
  }
  const events = [];
  await investigate({ scenarioId, skills }, { turn, rank, coordinate }, event => {
    events.push(event);
    onEvent?.(event, false);
  });
  await setJSON(`cache:${key}`, events, CACHE_SECONDS).catch(() => {});
  return { events, cached: false };
}

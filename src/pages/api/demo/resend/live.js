// Live model calls shared by the Resend routes (not a route itself: only *.api.js files are).
// The LLM picks the tools and writes the email (OpenAI-style tool calling); every tool runs in
// code (pages/demo/resend/tools.js). A finished run is cached by task, tool wording and day, so
// an identical request replays for free.
import crypto from 'crypto';
import { chatTools, DEMO_LLM } from 'demos/models';
import { getJSON, setJSON } from 'demos/store';
import { runAgent } from 'pages/demo/resend/agent';

export const MODEL = DEMO_LLM.model();
export const VERSION = 'resend-v6';
const CACHE_SECONDS = 12 * 3600;

const hash = (...parts) => crypto.createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 32);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// The provider caps concurrent requests per account and other demos share it: a small gate
const SLOTS = Number(process.env.DEMO_RESEND_LLM_SLOTS) || 3;
let active = 0;
const waiting = [];
async function withSlot(fn) {
  if (active >= SLOTS) await new Promise(resolve => waiting.push(resolve));
  active += 1;
  try {
    return await fn();
  } finally {
    active -= 1;
    waiting.shift()?.();
  }
}

/** Retries with a growing pause; a 429 waits longer (the cap clears in seconds). */
async function withRetry(fn) {
  let lastError;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const limited = /\b429\b/.test(String(error?.message));
      await sleep((limited ? 2000 : 700) + attempt * 1000 + Math.random() * 500);
    }
  }
  throw lastError;
}

async function turn({ system, messages, tools }) {
  return withRetry(() =>
    withSlot(async () => {
      const begun = Date.now();
      const out = await chatTools({
        provider: DEMO_LLM.provider,
        model: MODEL,
        system,
        messages,
        tools,
        maxTokens: 1600,
        temperature: 0,
      });
      return { ...out, ms: Date.now() - begun };
    })
  );
}

// The New York calendar day: "tomorrow 9am ET" means a different instant tomorrow
const etDay = now => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date(now));

export const runKey = (task, variant, now = Date.now()) => `resend:run:${hash(VERSION, MODEL, variant, task.trim().toLowerCase(), etDay(now))}`;

export async function cachedRun(key) {
  try {
    return await getJSON(`cache:${key}`);
  } catch {
    return null;
  }
}

/** Runs the agent (or replays today's identical run). onEvent(event, cached) gets every event. */
export async function runTask({ task, variant }, onEvent) {
  const key = runKey(task, variant);
  const replay = await cachedRun(key);
  if (replay) {
    for (const event of replay) {
      onEvent(event, true);
      if (event.t === 'result') await sleep(90);
    }
    return { events: replay, cached: true };
  }
  const { events } = await runAgent({ task, variant, now: Date.now() }, { turn }, event => onEvent(event, false));
  if (events.some(event => event.t === 'final')) await setJSON(`cache:${key}`, events, CACHE_SECONDS).catch(() => {});
  return { events, cached: false };
}

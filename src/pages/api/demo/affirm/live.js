// Live model calls and request hygiene for the Affirm demo route (not a route itself: only *.api.js
// files are). DeepSeek via fal for the tool-calling loop and the hand-off summary, Jev for the
// hand-off decision. Every Jev answer and every full turn is cached, so a repeat costs nothing.
import crypto from 'crypto';
import { clampText, startStream } from 'demos/api';
import { askJev, chat, chatTools, DEMO_LLM, jevQuestion } from 'demos/models';
import { cached, getJSON, setJSON } from 'demos/store';
import {
  HANDOFF_QUESTION,
  QUEUE_QUESTION,
  SUMMARY_SYSTEM,
} from 'pages/demo/affirm/agent';
import { LOANS } from 'pages/demo/affirm/data';

export const MODEL = DEMO_LLM.model();
export const VERSION = 'affirm-v1';
export const CACHE_SECONDS = 6 * 3600;
export const TOOL_MAX_TOKENS = 900; // room to think before a tool call
export const SUMMARY_MAX_TOKENS = 500;
export const LOOP_DEADLINE_MS = 40_000; // after this the model must answer with what it has

// Reasoning models (o-series, gpt-5) reject a custom temperature
const temperature = value => (/^(o\d|gpt-5)/.test(MODEL) ? undefined : value);

export const hash = (...parts) =>
  crypto.createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 32);

/** One round of the agent loop: the model calls tools, or answers when it has what it needs. */
export async function model({ system, messages, tools, final }) {
  const started = Date.now();
  const turn = await chatTools({
    provider: DEMO_LLM.provider,
    model: MODEL,
    system,
    messages,
    tools,
    toolChoice: final ? 'none' : 'auto',
    maxTokens: TOOL_MAX_TOKENS,
    temperature: temperature(0),
  });
  return { ...turn, ms: Date.now() - started };
}

/** Jev: should a person take over, and which queue. */
export function decide(state) {
  return cached(`affirm:jev:${hash(VERSION, JSON.stringify(state))}`, CACHE_SECONDS, async () => {
    const { answers } = await askJev(state, {
      handoff: jevQuestion.choice(HANDOFF_QUESTION.instructions, HANDOFF_QUESTION.criteria),
      queue: jevQuestion.choice(QUEUE_QUESTION.instructions, QUEUE_QUESTION.criteria),
    });
    return answers;
  });
}

/** The hand-off note for the human agent, as JSON text. */
export function summarise(facts) {
  return chat({
    provider: DEMO_LLM.provider,
    model: MODEL,
    system: SUMMARY_SYSTEM,
    messages: [{ role: 'user', content: JSON.stringify(facts) }],
    maxTokens: SUMMARY_MAX_TOKENS,
    temperature: temperature(0.2),
    json: true,
  });
}

// --- request hygiene ---------------------------------------------------------------------------------

export function sanitizeHistory(raw) {
  return (Array.isArray(raw) ? raw : [])
    .slice(-6)
    .map(turn => ({
      role: turn?.role === 'agent' ? 'agent' : 'customer',
      text: clampText(turn?.text, 500).trim(),
    }))
    .filter(turn => turn.text);
}

const MOVABLE = new Set(LOANS.filter(loan => loan.plan === 'monthly').map(loan => loan.id));

/** Due-day changes the customer confirmed on the page: known monthly loans, days 1-28, at most 2. */
export function sanitizeChanges(raw) {
  return (Array.isArray(raw) ? raw : [])
    .slice(0, 2)
    .map(change => ({ loanId: String(change?.loanId || ''), toDay: Number(change?.toDay) }))
    .filter(change => MOVABLE.has(change.loanId) && Number.isInteger(change.toDay) && change.toDay >= 1 && change.toDay <= 28);
}

// --- streaming with cached replay ------------------------------------------------------------------

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function cachedEvents(key) {
  try {
    return await getJSON(`cache:${key}`);
  } catch {
    return null;
  }
}

/** Streams NDJSON events from run(emit); replays a cached stream for an identical request. */
export async function streamRun(res, key, run) {
  const stream = startStream(res);
  const send = event => stream.write(`${JSON.stringify(event)}\n`);

  const replay = await cachedEvents(key);
  if (replay) {
    send({ t: 'meta', model: MODEL, cached: true });
    for (const event of replay) {
      send(event);
      await sleep(event.t === 'call' ? 60 : 20);
    }
    return stream.end();
  }

  const events = [];
  const emit = event => {
    events.push(event);
    send(event);
  };
  send({ t: 'meta', model: MODEL, cached: false });
  try {
    await run(emit);
    if (events.some(event => event.t === 'done')) {
      await setJSON(`cache:${key}`, events, CACHE_SECONDS).catch(() => {});
    }
  } catch (error) {
    console.error('[affirm turn]', error);
    send({
      t: 'error',
      message: 'The agent hit an error partway through. Try again in a moment.',
    });
  }
  return stream.end();
}

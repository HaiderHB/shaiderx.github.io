// Server helpers shared by the Reacher demo routes (not a route: only *.api.js files are).
// Model calls (Jev and the LLM), request parsing, and an NDJSON stream that records its events so
// an identical request replays from cache for free.
import crypto from 'crypto';
import { clampText, startStream } from 'demos/api';
import { askJev, chat, chatStream, DEMO_LLM, jevQuestion } from 'demos/models';
import { getJSON, setJSON } from 'demos/store';
import { creatorById, productById } from 'pages/demo/reacher/data';
import {
  ACCEPT_QUESTION,
  ACTION_QUESTION,
  FIT_QUESTION,
  WHY_SYSTEM,
  inviteSystem,
  replySystem,
  whyFacts,
} from 'pages/demo/reacher/matchmaker';

export const MODEL = DEMO_LLM.model();
export const VERSION = 'reacher-v1';
export const CACHE_SECONDS = 6 * 3600;

export const hash = (...parts) =>
  crypto.createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 32);

/** Validated ids from the body: unknown ids come back null. */
export function readIds(req) {
  const productId = clampText(req.body?.productId, 24);
  const creatorId = clampText(req.body?.creatorId, 8);
  return {
    product: productById(productId) || null,
    creator: creatorById(creatorId) || null,
  };
}

export async function cachedEvents(key) {
  try {
    return await getJSON(`cache:${key}`);
  } catch {
    return null;
  }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Streams NDJSON events. A cached run replays (text chunks slightly paced); a new one runs
 * `work(emit)` and is cached when it finishes cleanly.
 */
export async function streamEvents(res, key, work) {
  const stream = startStream(res);
  const send = event => stream.write(`${JSON.stringify(event)}\n`);

  const replay = await cachedEvents(key);
  if (replay) {
    send({ t: 'meta', model: MODEL, cached: true });
    for (const event of replay) {
      send(event);
      if (event.t === 'text') await sleep(6);
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
    await work(emit);
    await setJSON(`cache:${key}`, events, CACHE_SECONDS).catch(() => {});
  } catch (error) {
    console.error('[reacher]', error);
    send({ t: 'error', message: 'The agent hit an error partway through. Try again in a moment.' });
  }
  stream.end();
}

// --- model calls ------------------------------------------------------------------------------

/** One retry after a short pause: a burst of small parallel calls can hit a transient limit. */
async function withRetry(fn) {
  try {
    return await fn();
  } catch (error) {
    await sleep(400);
    return fn();
  }
}

const finite = value => (Number.isFinite(Number(value)) ? Number(value) : null);

export async function scoreFit(state) {
  const { answers } = await withRetry(() =>
    askJev(state, { fit: jevQuestion.score(FIT_QUESTION.instructions, FIT_QUESTION.criteria) })
  );
  const score = finite(answers.fit?.score);
  if (score == null) throw new Error('Jev returned no fit score');
  return { score, probabilities: answers.fit.probabilities || null };
}

export async function estimateAccept(state) {
  const { answers } = await withRetry(() =>
    askJev(state, { accept: jevQuestion.noul(ACCEPT_QUESTION.instructions, ACCEPT_QUESTION.criteria) })
  );
  const noul = finite(answers.accept?.noul);
  if (noul == null) throw new Error('Jev returned no acceptance estimate');
  return { noul };
}

export async function decideAction(state) {
  const { answers } = await withRetry(() =>
    askJev(state, {
      next_action: jevQuestion.choice(ACTION_QUESTION.instructions, ACTION_QUESTION.criteria),
    })
  );
  const answer = answers.next_action;
  if (!answer?.choice) throw new Error('Jev returned no next action');
  return answer;
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = String(text).match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }
}

export async function writeWhy(product, rows) {
  const text = await chat({
    provider: DEMO_LLM.provider,
    model: MODEL,
    system: WHY_SYSTEM,
    messages: [{ role: 'user', content: JSON.stringify(whyFacts(product, rows)) }],
    maxTokens: 500,
    temperature: 0.3,
    json: true,
  });
  return parseJson(text)?.why || {};
}

export function draftInvite(product) {
  return facts =>
    chatStream({
      provider: DEMO_LLM.provider,
      model: MODEL,
      system: inviteSystem(product),
      messages: [{ role: 'user', content: JSON.stringify(facts) }],
      maxTokens: 260,
      temperature: 0.6,
    });
}

export function draftReply(product) {
  return facts =>
    chatStream({
      provider: DEMO_LLM.provider,
      model: MODEL,
      system: replySystem(product),
      messages: [{ role: 'user', content: JSON.stringify(facts) }],
      maxTokens: 220,
      temperature: 0.4,
    });
}

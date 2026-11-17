// Server helpers shared by the Truss demo routes (not a route: only *.api.js files are).
// Model calls with caching (Gemini reads the image, Jev decides, DeepSeek writes the note), the
// Redis-backed store the payment logic runs on, request parsing and one structured log line per
// step so a run can be traced in the Vercel logs by its runId.
import crypto from 'crypto';
import { askJev, chatStream, DEMO_LLM, DEMO_VISION, geminiVision, jevQuestion } from 'demos/models';
import {
  getJSON,
  listJSON,
  pushJSON,
  setJSON,
  setJSONIfAbsent,
} from 'demos/store';
import { BILL_SCHEMA, DECISION_QUESTION, EXTRACT_PROMPT, NOTE_SYSTEM } from 'pages/demo/truss/pipeline';
import { SESSION_PATTERN } from 'pages/demo/truss/payments';

export const VERSION = 'truss-v1';
export const LLM_MODEL = DEMO_LLM.model();
export const VISION_MODEL = DEMO_VISION.model();
export const CACHE_SECONDS = 24 * 3600;
const MAX_IMAGE_BYTES = 2_000_000;

export const hash = (...parts) =>
  crypto.createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 32);

export const randomId = prefix => `${prefix}_${crypto.randomBytes(9).toString('base64url')}`;

/** The payment logic's store interface on top of demos/store (Redis when connected). */
export const store = {
  get: getJSON,
  set: setJSON,
  setIfAbsent: setJSONIfAbsent,
  push: pushJSON,
  list: listJSON,
};

export function readSession(value) {
  const session = String(value || '').slice(0, 60);
  return SESSION_PATTERN.test(session) ? session : null;
}

/** A data URL from the page (a sample invoice or an upload) → { mimeType, data, bytes, sha }. */
export function readImage(value) {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(value || ''));
  if (!match) return null;
  const bytes = Math.floor((match[2].length * 3) / 4);
  if (bytes < 2000 || bytes > MAX_IMAGE_BYTES) return null;
  return { mimeType: match[1], data: match[2], bytes, sha: hash(match[2]) };
}

export const extractionKey = image => `truss:extract:${hash(VERSION, VISION_MODEL, image.sha)}`;

export async function cachedExtraction(image) {
  try {
    return await getJSON(`cache:${extractionKey(image)}`);
  } catch {
    return null;
  }
}

/** Gemini reads the invoice image into JSON shaped by BILL_SCHEMA; the same image is read once. */
export async function extract(image) {
  const hit = await cachedExtraction(image);
  if (hit) return { ...hit, cached: true };
  const started = Date.now();
  const { data, model, usage } = await geminiVision({
    model: VISION_MODEL,
    prompt: EXTRACT_PROMPT,
    image,
    schema: BILL_SCHEMA,
    maxTokens: 2000,
    temperature: 0,
  });
  const value = { raw: data, model, ms: Date.now() - started, usage };
  await setJSON(`cache:${extractionKey(image)}`, value, CACHE_SECONDS).catch(() => {});
  return { ...value, cached: false };
}

/** Jev's approve / hold / reject with probabilities; an identical state is answered once. */
export async function decide(state) {
  const key = `cache:truss:jev:${hash(VERSION, JSON.stringify(state))}`;
  const hit = await getJSON(key).catch(() => null);
  if (hit) return { ...hit, cached: true };
  const started = Date.now();
  const call = () =>
    askJev(state, {
      decision: jevQuestion.choice(DECISION_QUESTION.instructions, DECISION_QUESTION.criteria),
    });
  let answers;
  try {
    ({ answers } = await call());
  } catch {
    await new Promise(resolve => setTimeout(resolve, 400));
    ({ answers } = await call());
  }
  const answer = answers.decision || {};
  const value = {
    choice: answer.choice,
    probabilities: answer.probabilities || null,
    confidence: answer.confidence ?? null,
    ms: Date.now() - started,
  };
  if (DECISION_QUESTION.criteria[value.choice]) {
    await setJSON(key, value, CACHE_SECONDS).catch(() => {});
  }
  return { ...value, cached: false };
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/** DeepSeek writes the reviewer note (streamed); an identical set of facts replays the cached note. */
export async function* writeNote(facts) {
  const key = `cache:truss:note:${hash(VERSION, LLM_MODEL, JSON.stringify(facts))}`;
  const hit = await getJSON(key).catch(() => null);
  if (hit?.text) {
    for (const word of hit.text.split(/(?<=\s)/)) {
      await sleep(8);
      yield word;
    }
    return;
  }
  let text = '';
  for await (const chunk of chatStream({
    provider: DEMO_LLM.provider,
    model: LLM_MODEL,
    system: NOTE_SYSTEM,
    messages: [{ role: 'user', content: JSON.stringify(facts) }],
    maxTokens: 300,
    temperature: 0.2,
  })) {
    text += chunk;
    yield chunk;
  }
  if (text.trim()) await setJSON(key, { text: text.trim() }, CACHE_SECONDS).catch(() => {});
}

/** One JSON line per step for the logs: grep a runId or a paymentId to see what happened. */
export function trace(event, fields) {
  console.log(JSON.stringify({ evt: `truss.${event}`, at: new Date().toISOString(), ...fields }));
}

// Live model calls and streaming shared by the Superhuman routes (not a route itself: only
// *.api.js files are). DeepSeek V3.2 via fal (OpenAI-style tool calling) drives the agent; Jev
// (typed decision model) judges what it wrote. A finished run is cached by its inputs, so an
// identical request replays for free.
import crypto from 'crypto';
import { startStream } from 'demos/api';
import { askJev, chatTools, DEMO_LLM, jevQuestion } from 'demos/models';
import { getJSON, setJSON } from 'demos/store';
import { JUDGE_QUESTIONS, runAgent } from 'pages/demo/superhuman/agent';
import { TOOL_NAMES } from 'pages/demo/superhuman/mcp';

export const MODEL = DEMO_LLM.model();
export const VERSION = 'superhuman-v2';
export const CACHE_SECONDS = 6 * 3600;
const TURN_TOKENS = 900;

export const hash = (...parts) =>
  crypto.createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 32);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/** One retry after a short pause: a transient provider error should not end a whole run. */
async function withRetry(fn) {
  try {
    return await fn();
  } catch (error) {
    await sleep(600);
    return fn();
  }
}

/** Tool calls the model wrote as JSON in its text instead of the tool_calls field. */
function callsFromText(content) {
  const text = String(content || '').trim();
  if (!/^[[{]/.test(text)) return [];
  try {
    const parsed = JSON.parse(text);
    return (Array.isArray(parsed) ? parsed : [parsed])
      .filter(item => TOOL_NAMES.includes(item?.name))
      .map((item, index) => ({ id: `text_${index}`, name: item.name, args: item.arguments || item.args || {} }));
  } catch {
    return [];
  }
}

/** One model turn: the tools are offered unless this is the last turn (then it must answer). */
export async function modelTurn({ system, messages, tools, last }) {
  const out = await withRetry(() =>
    chatTools({
      provider: DEMO_LLM.provider,
      model: MODEL,
      system,
      messages,
      tools,
      toolChoice: last ? 'none' : 'auto',
      maxTokens: TURN_TOKENS,
      temperature: 0,
    })
  );
  if (out.toolCalls.length || last) return out;
  const fallback = callsFromText(out.content);
  return fallback.length ? { content: '', toolCalls: fallback } : out;
}

/** The judge: one Jev call per target, its typed questions answered with probabilities. */
export async function judge(target) {
  const questions = {};
  for (const id of target.questions) {
    const q = JUDGE_QUESTIONS[id];
    questions[id] = jevQuestion.noul(q.instructions, q.criteria);
  }
  const { answers } = await withRetry(() => askJev(target.state, questions));
  const out = {};
  for (const id of target.questions) {
    const noul = Number(answers[id]?.noul);
    if (!Number.isFinite(noul)) throw new Error(`Jev returned no ${id}`);
    out[id] = { noul: Math.round(noul * 1000) / 1000 };
  }
  return out;
}

export async function cachedEvents(key) {
  try {
    return await getJSON(`cache:${key}`);
  } catch {
    return null;
  }
}

/** Streams NDJSON agent events; an identical request replays the cached run, lightly paced. */
export async function streamAgent(res, key, input) {
  const stream = startStream(res);
  const send = event => stream.write(`${JSON.stringify(event)}\n`);

  const replay = await cachedEvents(key);
  if (replay) {
    send({ t: 'meta', model: MODEL, cached: true });
    for (const event of replay) {
      send(event);
      if (event.t === 'call' || event.t === 'turn_done') await sleep(40);
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
    await runAgent(input, { turn: modelTurn, judge, emit });
    await setJSON(`cache:${key}`, events, CACHE_SECONDS).catch(() => {});
  } catch (error) {
    console.error('[superhuman]', error);
    send({ t: 'error', message: 'The agent hit an error partway through. Try again in a moment.' });
  }
  return stream.end();
}

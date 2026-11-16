// Live model calls and request hygiene shared by the GoodTime routes (not a route itself:
// only *.api.js files are). DeepSeek via fal for the two tool-calling turns and the drafts,
// Jev for the repair decision. Every result is cached, so a repeated request costs nothing.
import crypto from 'crypto';
import { clampText, startStream } from 'demos/api';
import { askJev, chat, chatStream, chatTools, DEMO_LLM, jevQuestion } from 'demos/models';
import { cached, getJSON, setJSON } from 'demos/store';
import {
  CHAT_DRAFT_SYSTEM,
  CHAT_TOOLS,
  INTAKE_TOOLS,
  REPAIR_QUESTION,
  RESCUE_DRAFT_SYSTEM,
  chatSystem,
  historyMessages,
  intakeSystem,
} from 'pages/demo/goodtime/agent';
import { INTERVIEWERS, SESSIONS, WEEK, zoned } from 'pages/demo/goodtime/data';

export const MODEL = DEMO_LLM.model();
export const VERSION = 'goodtime-v2';
export const CACHE_SECONDS = 6 * 3600;

// Reasoning models (o-series, gpt-5) reject a custom temperature
const temperature = value => (/^(o\d|gpt-5)/.test(MODEL) ? undefined : value);

export const hash = (...parts) =>
  crypto.createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 32);

/** The tool call from a model turn, or JSON the model wrote in its text instead. */
function pickToolCall({ content, toolCalls }, names) {
  const callFound = toolCalls.find(item => names.includes(item.name));
  if (callFound) return { name: callFound.name, args: callFound.args };
  const match = String(content || '').match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      const name = names.includes(parsed.name) ? parsed.name : names[0];
      return { name, args: parsed.arguments || parsed.args || parsed };
    } catch {
      // not JSON: fall through
    }
  }
  return null;
}

/**
 * One tool-calling turn. The budget leaves room for models that think before they call a tool.
 * If the model answers without a tool call, the same tools go into the prompt and JSON mode
 * (one more call); `via` records which path produced the call, and the trace shows it.
 */
async function toolTurn({ system, messages, tools }) {
  const names = tools.map(item => item.function.name);
  const turn = await chatTools({
    provider: DEMO_LLM.provider,
    model: MODEL,
    system,
    messages,
    tools,
    maxTokens: 1200,
    temperature: temperature(0),
  });
  const direct = pickToolCall(turn, names);
  if (direct && turn.toolCalls.length) return { ...direct, via: 'tool call' };
  if (direct) return { ...direct, via: 'tool call (JSON in text)' };
  console.warn(
    '[goodtime] no tool call:',
    turn.finishReason,
    JSON.stringify(String(turn.content).slice(0, 240))
  );
  const text = await chat({
    provider: DEMO_LLM.provider,
    model: MODEL,
    system: `${system}

Reply with only a JSON object {"name": <one tool name>, "arguments": {...}} for one of these tools (JSON Schema):
${JSON.stringify(tools.map(item => item.function))}`,
    messages,
    maxTokens: 1200,
    temperature: temperature(0),
    json: true,
  });
  const fallback = pickToolCall({ content: text, toolCalls: [] }, names);
  if (fallback) return { ...fallback, via: 'JSON mode fallback' };
  return null;
}

export function readDropout(message, world) {
  return cached(
    `goodtime:intake:${hash(VERSION, MODEL, message)}`,
    CACHE_SECONDS,
    async () => {
      const tool = await toolTurn({
        system: intakeSystem(world),
        messages: [{ role: 'user', content: message }],
        tools: INTAKE_TOOLS,
      });
      if (!tool) throw new Error('The model did not call report_dropout');
      return tool;
    }
  );
}

export function decide(state) {
  return cached(
    `goodtime:jev:${hash(VERSION, JSON.stringify(state))}`,
    CACHE_SECONDS,
    async () => {
      const { answers } = await askJev(state, {
        repair: jevQuestion.choice(
          REPAIR_QUESTION.instructions,
          REPAIR_QUESTION.criteria
        ),
      });
      return answers;
    }
  );
}

export function understand({ world, history, text }) {
  return cached(
    `goodtime:understand:${hash(
      VERSION,
      MODEL,
      JSON.stringify(world.plan),
      JSON.stringify(history),
      text
    )}`,
    CACHE_SECONDS,
    async () => {
      const tool = await toolTurn({
        system: chatSystem(world),
        messages: historyMessages(history, text),
        tools: CHAT_TOOLS,
      });
      return tool;
    }
  );
}

export function draft(system) {
  return facts =>
    chatStream({
      provider: DEMO_LLM.provider,
      model: MODEL,
      system,
      messages: [{ role: 'user', content: JSON.stringify(facts) }],
      maxTokens: 900,
      temperature: temperature(0.3),
    });
}

export const draftRescue = draft(RESCUE_DRAFT_SYSTEM);
export const draftChat = draft(CHAT_DRAFT_SYSTEM);

// --- request hygiene ---------------------------------------------------------------------------------

const MIN = zoned(WEEK[0].date, '00:00', 'UTC') - 86400000;
const MAX = zoned(WEEK[WEEK.length - 1].date, '23:59', 'UTC') + 86400000;
const PEOPLE = new Set(INTERVIEWERS.map(person => person.id));
const inWeek = value => Number.isFinite(value) && value >= MIN && value <= MAX;

/** The page sends its current world; keep only known ids and in-range times. */
export function sanitizeWorld(raw) {
  const plan = {};
  for (const session of SESSIONS) {
    const item = raw?.plan?.[session.id];
    const start = Number(item?.start);
    if (!item || !PEOPLE.has(item.interviewer) || !inWeek(start)) return null;
    plan[session.id] = {
      interviewer: item.interviewer,
      start,
      status: item.status === 'held' ? 'held' : 'confirmed',
    };
  }
  const unavailable = (Array.isArray(raw?.unavailable) ? raw.unavailable : [])
    .slice(0, 4)
    .filter(
      item =>
        PEOPLE.has(item?.interviewer) &&
        inWeek(Number(item.from)) &&
        inWeek(Number(item.to))
    )
    .map(item => ({
      interviewer: item.interviewer,
      from: Number(item.from),
      to: Number(item.to),
      reason: clampText(item.reason, 40),
    }));
  return { plan, unavailable };
}

export function sanitizeHistory(raw) {
  return (Array.isArray(raw) ? raw : [])
    .slice(-6)
    .map(turn => ({
      role: turn?.role === 'agent' ? 'agent' : 'candidate',
      text: clampText(turn?.text, 400),
    }))
    .filter(turn => turn.text.trim());
}

// --- streaming with cached replay ----------------------------------------------------------------------

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function cachedEvents(key) {
  try {
    return await getJSON(`cache:${key}`);
  } catch {
    return null;
  }
}

/** Streams NDJSON events from run(emit); replays a cached stream for an identical request. */
export async function streamRun(res, key, run, label) {
  const stream = startStream(res);
  const send = event => stream.write(`${JSON.stringify(event)}\n`);

  const replay = await cachedEvents(key);
  if (replay) {
    send({ t: 'meta', model: MODEL, cached: true });
    for (const event of replay) {
      send(event);
      if (event.t === 'draft') await sleep(6);
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
    console.error(`[goodtime ${label}]`, error);
    send({
      t: 'error',
      message: 'The agent hit an error partway through. Try again in a moment.',
    });
  }
  return stream.end();
}

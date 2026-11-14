// POST /api/demo/distru/run/  { email } -> NDJSON stream of agent events (see pages/demo/distru/agent.js)
// Two LLM calls (extract, draft) and one Jev call (both decisions) per run. An identical email on
// the same day replays the cached run for free, so repeat clicks and eval reruns cost nothing.
import crypto from 'crypto';
import { COST, clampText, demoApi, startStream } from 'demos/api';
import { askJev, chat, chatStream, DEMO_LLM, jevQuestion } from 'demos/models';
import { cached, getJSON, setJSON } from 'demos/store';
import {
  REPLY_SYSTEM,
  ROUTE_QUESTION,
  SUBSTITUTION_QUESTION,
  extractionPrompt,
  isoToday,
  runOrderAgent,
} from 'pages/demo/distru/agent';

export const config = { api: { bodyParser: { sizeLimit: '16kb' } } };

const MODEL = DEMO_LLM.model();
// Reasoning models (o-series, gpt-5) reject a custom temperature
const temperature = value => (/^(o\d|gpt-5)/.test(MODEL) ? undefined : value);
const VERSION = 'distru-v1';
const RUN_COST = COST.llm * 2 + COST.decision;
const CACHE_SECONDS = 6 * 3600;

const hash = (...parts) =>
  crypto.createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 32);
const readEmail = req => clampText(req.body?.email, 4000).trim();
const runKey = (email, today) => `distru:run:${hash(VERSION, MODEL, today, email)}`;

async function cachedRun(req) {
  const email = readEmail(req);
  if (!email) return null;
  try {
    return await getJSON(`cache:${runKey(email, isoToday())}`);
  } catch {
    return null;
  }
}

async function extract(email, today) {
  return cached(
    `distru:extract:${hash(VERSION, MODEL, today, email)}`,
    CACHE_SECONDS,
    async () => {
      const text = await chat({
        provider: DEMO_LLM.provider,
        model: MODEL,
        system: extractionPrompt(today),
        messages: [{ role: 'user', content: email }],
        maxTokens: 900,
        temperature: temperature(0),
        json: true,
      });
      try {
        return JSON.parse(text);
      } catch {
        // Some models wrap JSON in a code fence or add a sentence; take the outermost object.
        const match = String(text).match(/\{[\s\S]*\}/);
        if (match) {
          try {
            return JSON.parse(match[0]);
          } catch {}
        }
        throw new Error('Extraction did not return valid JSON');
      }
    }
  );
}

async function decide(state) {
  const { answers } = await askJev(state, {
    route: jevQuestion.choice(ROUTE_QUESTION.instructions, ROUTE_QUESTION.criteria),
    substitution_ok: jevQuestion.noul(
      SUBSTITUTION_QUESTION.instructions,
      SUBSTITUTION_QUESTION.criteria
    ),
  });
  return answers;
}

function draftReply(facts) {
  return chatStream({
    provider: DEMO_LLM.provider,
    model: MODEL,
    system: REPLY_SYSTEM,
    messages: [{ role: 'user', content: JSON.stringify(facts) }],
    maxTokens: 350,
    temperature: temperature(0.3),
  });
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export default demoApi(
  async (req, res) => {
    const email = readEmail(req);
    if (!email)
      return res
        .status(400)
        .json({ error: 'Paste an order email first.', code: 'input' });

    const stream = startStream(res);
    const send = event => stream.write(`${JSON.stringify(event)}\n`);

    const replay = await cachedRun(req);
    if (replay) {
      send({ t: 'meta', model: MODEL, cached: true });
      for (const event of replay) {
        send(event);
        if (event.t === 'reply') await sleep(8);
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
      const today = isoToday();
      await runOrderAgent(email, { extract, decide, draftReply, emit, today });
      await setJSON(`cache:${runKey(email, today)}`, events, CACHE_SECONDS).catch(
        () => {}
      );
    } catch (error) {
      console.error('[distru run]', error);
      send({
        t: 'error',
        message: 'The agent hit an error partway through. Try again in a moment.',
      });
    }
    stream.end();
  },
  // An empty request or a cached replay costs nothing, but both still need a valid key
  {
    cost: async req => (!readEmail(req) || (await cachedRun(req)) ? COST.free : RUN_COST),
    requireKey: true,
  }
);

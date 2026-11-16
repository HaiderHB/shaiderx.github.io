// POST /api/demo/gc-ai/review/  { playbook, houseRule? } -> NDJSON stream of review events
// (see pages/demo/gc-ai/review.js). One streamed LLM call proposes the edits; each edit is
// anchored to the contract in code as it arrives; Jev decides each flagged clause and scores each
// edit's fit to the rule it cites. The same playbook and house rule on the same day replay the
// cached run for free.
import crypto from 'crypto';
import { COST, clampText, demoApi, startStream } from 'demos/api';
import { askJev, chatStream, DEMO_LLM, jevQuestion } from 'demos/models';
import { getJSON, setJSON } from 'demos/store';
import { HOUSE_RULE_MAX, playbookById } from 'pages/demo/gc-ai/playbooks';
import { DECISION_QUESTION, FIT_QUESTION, runReview } from 'pages/demo/gc-ai/review';

export const config = { api: { bodyParser: { sizeLimit: '8kb' } } };

const MODEL = DEMO_LLM.model();
// Reasoning models (o-series, gpt-5) reject a custom temperature
const temperature = value => (/^(o\d|gpt-5)/.test(MODEL) ? undefined : value);
const VERSION = 'gc-ai-v4';
// One long-ish streamed LLM call (~2.5k tokens in, ~1k out) plus a handful of tiny Jev calls
const RUN_COST = COST.llm * 2 + COST.decision;
const CACHE_SECONDS = 12 * 3600;

const hash = (...parts) =>
  crypto.createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 32);
const today = () => new Date().toISOString().slice(0, 10);

function readInput(req) {
  const playbook = playbookById(clampText(req.body?.playbook, 40));
  const houseRule = clampText(req.body?.houseRule, HOUSE_RULE_MAX).replace(/\s+/g, ' ').trim();
  return { playbook, houseRule };
}

const runKey = ({ playbook, houseRule }) =>
  `gc-ai:review:${hash(VERSION, MODEL, today(), playbook.id, houseRule.toLowerCase())}`;

async function cachedRun(req) {
  const input = readInput(req);
  if (!input.playbook) return null;
  try {
    return await getJSON(`cache:${runKey(input)}`);
  } catch {
    return null;
  }
}

function generate(system, prompt) {
  return chatStream({
    provider: DEMO_LLM.provider,
    model: MODEL,
    system,
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 1400,
    temperature: temperature(0.2),
  });
}

// One Jev call per clause: the clause decision plus a yes/no "rule fit" per edit
async function decide(state, editIds) {
  const { answers } = await askJev(state, {
    action: jevQuestion.choice(DECISION_QUESTION.instructions, DECISION_QUESTION.criteria),
    ...Object.fromEntries(editIds.map(id => [`fit_${id}`, jevQuestion.noul(FIT_QUESTION(id))])),
  });
  const answer = answers.action || {};
  if (!DECISION_QUESTION.criteria[answer.choice]) throw new Error('Jev gave no valid choice');
  const fit = {};
  for (const id of editIds) {
    const p = Number(answers[`fit_${id}`]?.noul);
    if (Number.isFinite(p)) fit[id] = p;
  }
  return { ...answer, fit };
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export default demoApi(
  async (req, res) => {
    const input = readInput(req);
    if (!input.playbook) {
      return res.status(400).json({ error: 'Pick a playbook first.', code: 'input' });
    }

    const stream = startStream(res);
    const send = event => stream.write(`${JSON.stringify(event)}\n`);

    // Same playbook and house rule today: replay the stored run at triple speed, free
    const replay = await cachedRun(req);
    if (replay) {
      send({ t: 'meta', model: MODEL, cached: true, playbook: input.playbook.id });
      let last = 0;
      for (const event of replay) {
        if (event.at != null) {
          await sleep(Math.min(1200, Math.max(0, (event.at - last) / 3)));
          last = event.at;
        }
        send(event);
      }
      return stream.end();
    }

    const events = [];
    const emit = event => {
      events.push(event);
      send(event);
    };
    send({ t: 'meta', model: MODEL, cached: false, playbook: input.playbook.id });

    try {
      await runReview({ ...input, generate, decide, emit });
      await setJSON(`cache:${runKey(input)}`, events, CACHE_SECONDS).catch(() => {});
    } catch (error) {
      console.error('[gc-ai review]', error);
      send({
        t: 'error',
        message: 'The review stopped partway through. The changes so far are kept; try again in a moment.',
      });
    }
    stream.end();
  },
  // A cached replay costs nothing, but still needs a valid key
  {
    cost: async req => (!readInput(req).playbook || (await cachedRun(req)) ? COST.free : RUN_COST),
    requireKey: true,
  }
);

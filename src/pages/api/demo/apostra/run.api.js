// POST /api/demo/apostra/run/  { brief, live? } -> NDJSON stream of run events
// (pages/demo/apostra/engine.js applyEvent). The buyer agent reads the brief, calls the three sample
// seller agents over AdCP-style MCP tools, checks every product and the plan in code, shortlists
// with the LLM, scores fit and risk with a decision model and books with idempotency keys.
// The preset brief replays recorded model outputs and costs nothing (no key needed); the sellers,
// guardrails and bookings still run here. A custom brief is a live run: key required, 3 units
// (two short LLM calls and one decision call), cached per brief for a day.
import { COST, clampText, demoApi, startStream } from 'demos/api';
import { EXAMPLE } from 'pages/demo/apostra/example';
import { PRESET_BRIEF } from 'pages/demo/apostra/engine';
import { runAgent } from './agent';

export const config = { api: { bodyParser: { sizeLimit: '16kb' } } };

const LIVE_COST = COST.llm * 2 + COST.decision;

const readInput = req => {
  const text = clampText(req.body?.brief, 600).replace(/\s+/g, ' ').trim();
  const preset = text === PRESET_BRIEF && !req.body?.live;
  return { text, preset };
};

export default demoApi(
  async (req, res) => {
    const { text, preset } = readInput(req);
    if (text.length < 12) return res.status(400).json({ error: 'Write a brief first: budget, channels, dates, CPM ceiling.', code: 'input' });

    const stream = startStream(res);
    const send = event => stream.write(`${JSON.stringify(event)}\n`);
    const started = Date.now();
    try {
      const { runId } = await runAgent({ text, recorded: preset ? EXAMPLE : null, emit: send });
      console.log(JSON.stringify({ demo: 'apostra', event: 'run', runId, preset, ms: Date.now() - started }));
    } catch (error) {
      console.error('[apostra run]', error);
      send({
        t: 'error',
        at: Date.now(),
        message: 'The agent stopped partway through. Nothing new was booked; try again in a moment.',
      });
    }
    stream.end();
  },
  { cost: req => (readInput(req).preset ? COST.free : LIVE_COST) }
);

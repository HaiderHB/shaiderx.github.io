// POST /api/demo/goodtime/rescue/  { message } -> NDJSON stream of agent events (pages/demo/goodtime/agent.js)
// One tool-calling LLM turn (read the dropout), one Jev call (the repair) and one streamed LLM draft
// per run. The same message on the same day replays the cached run for free.
import { COST, clampText, demoApi } from 'demos/api';
import { runRescue } from 'pages/demo/goodtime/agent';
import { initialWorld } from 'pages/demo/goodtime/data';
import {
  MODEL,
  VERSION,
  cachedEvents,
  decide,
  draftRescue,
  hash,
  readDropout,
  streamRun,
} from './live';

export const config = { api: { bodyParser: { sizeLimit: '8kb' } } };

const RUN_COST = COST.llm * 2 + COST.decision;
const readMessage = req => clampText(req.body?.message, 1200).trim();
const runKey = message => `goodtime:rescue:${hash(VERSION, MODEL, message)}`;

export default demoApi(
  async (req, res) => {
    const message = readMessage(req);
    if (!message) {
      return res
        .status(400)
        .json({ error: 'Paste the dropout message first.', code: 'input' });
    }
    return streamRun(
      res,
      runKey(message),
      emit =>
        runRescue(message, initialWorld(), {
          emit,
          readDropout,
          decide,
          draft: draftRescue,
        }),
      'rescue'
    );
  },
  // An empty request or a cached replay costs nothing, but both still need a valid key
  {
    cost: async req => {
      const message = readMessage(req);
      return !message || (await cachedEvents(runKey(message))) ? COST.free : RUN_COST;
    },
    requireKey: true,
  }
);

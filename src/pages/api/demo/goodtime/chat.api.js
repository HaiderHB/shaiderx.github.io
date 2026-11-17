// POST /api/demo/goodtime/chat/  { world, history, text } -> NDJSON stream of agent events
// One candidate turn on the page's current schedule: a tool-calling LLM turn (what does the candidate
// want), deterministic replanning and checks, then one streamed LLM draft (the one-line reply and the
// updated messages). Identical turns on the same state replay from cache for free.
import { COST, clampText, demoApi } from 'demos/api';
import { runChatTurn } from 'pages/demo/goodtime/agent';
import {
  MODEL,
  VERSION,
  cachedEvents,
  draftChat,
  hash,
  sanitizeHistory,
  sanitizeWorld,
  streamRun,
  understand,
} from './live';

export const config = { api: { bodyParser: { sizeLimit: '16kb' } } };

const TURN_COST = COST.llm * 2;

function readTurn(req) {
  const text = clampText(req.body?.text, 400).trim();
  const world = sanitizeWorld(req.body?.world);
  const history = sanitizeHistory(req.body?.history);
  return { text, world, history };
}

const turnKey = ({ text, world, history }) =>
  `goodtime:chat:${hash(
    VERSION,
    MODEL,
    JSON.stringify(world),
    JSON.stringify(history),
    text
  )}`;

export default demoApi(
  async (req, res) => {
    const turn = readTurn(req);
    if (!turn.text)
      return res.status(400).json({ error: 'Type a message first.', code: 'input' });
    if (!turn.world)
      return res
        .status(400)
        .json({ error: 'The schedule could not be read.', code: 'input' });
    return streamRun(
      res,
      turnKey(turn),
      emit => runChatTurn(turn, { emit, understand, draft: draftChat }),
      'chat'
    );
  },
  {
    cost: async req => {
      const turn = readTurn(req);
      if (!turn.text || !turn.world) return COST.free;
      return (await cachedEvents(turnKey(turn))) ? COST.free : TURN_COST;
    },
    requireKey: true,
  }
);

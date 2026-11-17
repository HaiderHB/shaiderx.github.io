// POST /api/demo/affirm/turn/  { text, history, changes } -> NDJSON stream of agent events
// One customer turn (pages/demo/affirm/agent.js): DeepSeek (via fal) calls tools over the sample loans
// in up to 4 rounds and answers, code checks the reply against policy, Jev decides whether a person
// should take over and which queue (a rules floor can only make that stricter), and on a hand-off one
// more LLM call writes the note for the human agent. An identical turn replays from cache for free.
import { COST, clampText, demoApi } from 'demos/api';
import { runTurn } from 'pages/demo/affirm/agent';
import {
  LOOP_DEADLINE_MS,
  MODEL,
  VERSION,
  cachedEvents,
  decide,
  hash,
  model,
  sanitizeChanges,
  sanitizeHistory,
  streamRun,
  summarise,
} from './live';

export const config = { api: { bodyParser: { sizeLimit: '16kb' } } };

// Up to 5 LLM calls (4 tool rounds + the answer) are usual at 3-4; plus the summary and one Jev call
const TURN_COST = COST.llm * 4 + COST.decision;

function readTurn(req) {
  return {
    text: clampText(req.body?.text, 300).trim(),
    history: sanitizeHistory(req.body?.history),
    changes: sanitizeChanges(req.body?.changes),
  };
}

const turnKey = ({ text, history, changes }) =>
  `affirm:turn:${hash(VERSION, MODEL, JSON.stringify(history), JSON.stringify(changes), text)}`;

export default demoApi(
  async (req, res) => {
    const turn = readTurn(req);
    if (!turn.text) return res.status(400).json({ error: 'Type a message first.', code: 'input' });
    return streamRun(res, turnKey(turn), emit =>
      runTurn(turn, { emit, model, decide, summarise, deadline: LOOP_DEADLINE_MS })
    );
  },
  // An empty request or a cached replay costs nothing, but both still need a valid key
  {
    cost: async req => {
      const turn = readTurn(req);
      if (!turn.text) return COST.free;
      return (await cachedEvents(turnKey(turn))) ? COST.free : TURN_COST;
    },
    requireKey: true,
  }
);

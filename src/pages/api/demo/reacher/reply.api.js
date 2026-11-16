// POST /api/demo/reacher/reply/  { productId, creatorId, reply, invite } -> NDJSON: the numbers the
// reply asks for (code), Jev's next action with probabilities, the commission guardrail (code),
// then the streamed reply draft, checked again against the guarded rate (see runNegotiation).
// One Jev call and one short LLM call; an identical thread replays from cache for free.
import { COST, clampText, demoApi } from 'demos/api';
import { runNegotiation } from 'pages/demo/reacher/matchmaker';
import {
  MODEL,
  VERSION,
  cachedEvents,
  decideAction,
  draftReply,
  hash,
  readIds,
  streamEvents,
} from './server';

export const config = { api: { bodyParser: { sizeLimit: '8kb' } } };

const RUN_COST = COST.decision + COST.llm;

function readThread(req) {
  return {
    reply: clampText(req.body?.reply, 400).trim(),
    invite: clampText(req.body?.invite, 1200).trim(),
  };
}

function replyKey(req) {
  const { product, creator } = readIds(req);
  const { reply, invite } = readThread(req);
  if (!product || !creator || !reply) return null;
  return `reacher:reply:${hash(VERSION, MODEL, product.id, creator.id, reply, invite)}`;
}

export default demoApi(
  async (req, res) => {
    const { product, creator } = readIds(req);
    const { reply, invite } = readThread(req);
    if (!product || !creator)
      return res.status(400).json({ error: 'Pick a product and a creator first.', code: 'input' });
    if (!reply)
      return res.status(400).json({ error: "Type the creator's reply first.", code: 'input' });

    await streamEvents(res, replyKey(req), emit =>
      runNegotiation(product.id, creator.id, {
        reply,
        invite,
        decide: decideAction,
        draft: draftReply(product),
        emit,
      })
    );
  },
  {
    cost: async req => {
      const key = replyKey(req);
      if (!key || (await cachedEvents(key))) return COST.free;
      return RUN_COST;
    },
    requireKey: true,
  }
);

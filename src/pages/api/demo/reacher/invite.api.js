// POST /api/demo/reacher/invite/  { productId, creatorId } -> NDJSON: streamed invite text, then the
// final text with any commission above the brand's max rewritten (see runInvite). One short LLM
// call; the same product and creator replay from cache for free.
import { COST, demoApi } from 'demos/api';
import { runInvite } from 'pages/demo/reacher/matchmaker';
import { MODEL, VERSION, cachedEvents, draftInvite, hash, readIds, streamEvents } from './server';

export const config = { api: { bodyParser: { sizeLimit: '2kb' } } };

const inviteKey = (productId, creatorId) =>
  `reacher:invite:${hash(VERSION, MODEL, productId, creatorId)}`;

export default demoApi(
  async (req, res) => {
    const { product, creator } = readIds(req);
    if (!product || !creator)
      return res.status(400).json({ error: 'Pick a product and a creator first.', code: 'input' });

    await streamEvents(res, inviteKey(product.id, creator.id), emit =>
      runInvite(product.id, creator.id, { draft: draftInvite(product), emit })
    );
  },
  {
    cost: async req => {
      const { product, creator } = readIds(req);
      if (!product || !creator || (await cachedEvents(inviteKey(product.id, creator.id))))
        return COST.free;
      return COST.llm;
    },
    requireKey: true,
  }
);

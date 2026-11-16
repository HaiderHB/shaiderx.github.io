// POST /api/demo/reacher/rank/  { productId } -> NDJSON stream of matchmaker events
// (see pages/demo/reacher/matchmaker.js). Code filters the 40 sample creators; Jev scores fit for
// each one left (one small call each, 6 at a time) and estimates acceptance for the 10 best fits;
// one LLM call writes the one-line whys. The same product on the same day replays from cache free.
import { COST, demoApi } from 'demos/api';
import { isoToday, runMatchmaker } from 'pages/demo/reacher/matchmaker';
import {
  MODEL,
  VERSION,
  cachedEvents,
  estimateAccept,
  hash,
  readIds,
  scoreFit,
  streamEvents,
  writeWhy,
} from './server';

export const config = { api: { bodyParser: { sizeLimit: '2kb' } } };

// About 22 Jev calls (input tokens only, ~120 ms each) and one short LLM call
const RUN_COST = COST.decision * 2 + COST.llm;
const runKey = productId => `reacher:rank:${hash(VERSION, MODEL, isoToday(), productId)}`;

export default demoApi(
  async (req, res) => {
    const { product } = readIds(req);
    if (!product) return res.status(400).json({ error: 'Pick a product first.', code: 'input' });

    await streamEvents(res, runKey(product.id), emit =>
      runMatchmaker(product.id, { scoreFit, estimateAccept, writeWhy, emit })
    );
  },
  {
    cost: async req => {
      const { product } = readIds(req);
      if (!product || (await cachedEvents(runKey(product.id)))) return COST.free;
      return RUN_COST;
    },
    requireKey: true,
  }
);

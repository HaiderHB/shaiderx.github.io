// POST /api/demo/apostra/buy/  { action, seller, args, counter? } -> { call, outcome }
// The calls a person triggers after a run, against the same sample seller agents:
//   retry           re-sends a create_media_buy exactly as before (same idempotency key): the seller
//                   returns the stored buy, so nothing is booked twice.
//   accept_counter  a person approved a counteroffer the agent escalated: books the package at the
//                   counter price under its own key (also idempotent).
// No model is called, so it costs nothing and needs no key; the IP rate limit still applies.
import { COST, demoApi } from 'demos/api';
import { rpcCall, rpcResult } from 'pages/demo/apostra/engine';
import { SELLERS, counterAcceptArgs, createMediaBuy, packagePrice } from './sellers';

export const config = { api: { bodyParser: { sizeLimit: '32kb' } } };

function readArgs(value) {
  if (!value || typeof value !== 'object') return null;
  const packages = Array.isArray(value.packages) ? value.packages.slice(0, 6) : [];
  return {
    idempotency_key: String(value.idempotency_key || '').slice(0, 80),
    brand: { domain: String(value.brand?.domain || '').slice(0, 80), name: String(value.brand?.name || '').slice(0, 80) },
    start_time: String(value.start_time || '').slice(0, 30),
    end_time: String(value.end_time || '').slice(0, 30),
    packages: packages.map(pkg => ({
      product_id: String(pkg?.product_id || '').slice(0, 40),
      pricing_option_id: String(pkg?.pricing_option_id || '').slice(0, 40),
      budget: { amount: Number(pkg?.budget?.amount) || 0, currency: 'USD' },
      context: { buyer_ref: String(pkg?.context?.buyer_ref || '').slice(0, 80) },
    })),
  };
}

export default demoApi(
  async (req, res) => {
    const action = String(req.body?.action || '');
    const sellerId = String(req.body?.seller || '');
    const seller = SELLERS[sellerId];
    const original = readArgs(req.body?.args);
    if (!seller || !original || !['retry', 'accept_counter'].includes(action)) {
      return res.status(400).json({ error: 'Unknown action or seller.', code: 'input' });
    }

    let args = original;
    if (action === 'accept_counter') {
      const productId = String(req.body?.counter?.product_id || '');
      const counter = { product_id: productId, pricing_option_id: `${seller.prefix}_po_counter` };
      if (!original.packages.some(pkg => pkg.product_id === productId)) {
        return res.status(400).json({ error: 'That counteroffer is not part of this buy.', code: 'input' });
      }
      args = counterAcceptArgs(sellerId, original, counter);
    }

    const id = Math.max(1, Math.min(999, Number(req.body?.callId) || 1));
    const started = Date.now();
    const record = action === 'retry' ? String(req.body?.record || '').slice(0, 8000) : null;
    const outcome = await createMediaBuy(sellerId, args, { record });
    console.log(
      JSON.stringify({
        demo: 'apostra',
        event: action,
        seller: sellerId,
        key: args.idempotency_key.slice(0, 24),
        replayed: Boolean(outcome.replayed),
        mediaBuyId: outcome.response?.media_buy_id || null,
        error: outcome.error || null,
      })
    );
    res.status(200).json({
      call: {
        seller: sellerId,
        name: 'create_media_buy',
        args,
        request: rpcCall(id, 'create_media_buy', args),
        response: outcome.error ? rpcResult(id, outcome.error, true) : rpcResult(id, outcome.response),
      },
      outcome: {
        error: outcome.error || null,
        replayed: Boolean(outcome.replayed),
        record: outcome.record || null,
        status: outcome.response?.status || null,
        mediaBuyId: outcome.response?.media_buy_id || null,
        cpm: outcome.response ? packagePrice(sellerId, args.packages[0]) : null,
        ms: Date.now() - started,
      },
    });
  },
  { cost: COST.free, requireKey: false }
);

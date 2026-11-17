// POST /api/demo/truss/pay/  { session, billId, idempotencyKey, attempt?, label?, delayMs? }
// (the key may also come as an Idempotency-Key header) -> { payment | error, replayed?, ledger }.
// Pays an approved bill from this session once (see pages/demo/truss/payments.js): the key is
// claimed before money moves, a retry with the same key gets the stored response, and a second
// key for an invoice already paid is refused. `delayMs` (max 3 s) holds the reply AFTER the
// charge is committed: the page's "simulate a timeout" control, so the browser gives up while
// the server has already charged, then retries with the same key. No model calls: free.
import { COST, clampText, demoApi } from 'demos/api';
import { BILL_PATTERN, KEY_PATTERN, handlePayment, readLedger } from 'pages/demo/truss/payments';
import { hash, readSession, store, trace } from './server';

export const config = { api: { bodyParser: { sizeLimit: '2kb' } } };

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export default demoApi(
  async (req, res) => {
    const session = readSession(req.body?.session);
    const billId = clampText(req.body?.billId, 48);
    const idempotencyKey = clampText(req.headers['idempotency-key'] || req.body?.idempotencyKey, 60);
    if (!session || !BILL_PATTERN.test(billId) || !KEY_PATTERN.test(idempotencyKey)) {
      return res.status(400).json({ error: 'bad_request', message: 'Missing session, bill or idempotency key.' });
    }
    const attempt = Math.min(9, Math.max(1, Number(req.body?.attempt) || 1));
    const label = clampText(req.body?.label, 40) || null;
    const delayMs = Math.min(3000, Math.max(0, Number(req.body?.delayMs) || 0));

    const result = await handlePayment(store, { session, billId, idempotencyKey, attempt, label });
    const ledger = await readLedger(store, session);
    trace('pay', {
      session: hash(session).slice(0, 12),
      billId,
      key: idempotencyKey,
      attempt,
      status: result.status,
      replayed: Boolean(result.replayed),
      paymentId: result.body.payment?.paymentId || result.body.paymentId || null,
      error: result.body.error || null,
      heldMs: delayMs,
    });

    // The simulated slow bank: the charge (or replay) is already committed above
    if (delayMs) await sleep(delayMs);
    res.setHeader('Idempotent-Replayed', result.replayed ? 'true' : 'false');
    res.status(result.status).json({ ...result.body, ledger });
  },
  { cost: COST.free, requireKey: true }
);

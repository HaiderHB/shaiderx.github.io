// POST /api/demo/stacksync/apply/  { session, deal, plan, approvedBy? } with an Idempotency-Key
// header (or `key` in the body) -> { status, replayed, order, orders } | { error }.
// Writes a cleared plan into the sample ERP exactly once. The server re-runs every check on the plan
// it was sent, recomputes the key from the deal id and the plan hash (a key that does not match the
// plan is refused), looks up the route that plan earned (a live /plan run or a recorded sample run),
// refuses blocked plans and unapproved ones, then claims the key with SET NX before the sales order
// exists: a retry gets the stored order back, never a second one. No model calls: free.
import { COST, clampText, demoApi } from 'demos/api';
import {
  KEY_PATTERN,
  applyOnce,
  finalRoute,
  idempotencyKey,
  parsePlan,
  planHash,
  readDeal,
  validatePlan,
} from 'pages/demo/stacksync/sync';
import { exampleRun, readSession, runKey, store, trace } from './server';

export const config = { api: { bodyParser: { sizeLimit: '24kb' } } };

export default demoApi(
  async (req, res) => {
    const session = readSession(req.body?.session);
    const { facts, error } = readDeal(clampText(req.body?.deal, 6000));
    const plan = parsePlan(clampText(req.body?.plan, 8000));
    const sentKey = clampText(req.headers['idempotency-key'] || req.body?.key, 60);
    const approvedBy = clampText(req.body?.approvedBy, 40) || null;
    if (!session || error || !plan || !KEY_PATTERN.test(sentKey)) {
      return res.status(400).json({ error: 'Send the session, the deal, the plan and an idempotency key.', code: 'input' });
    }

    const hash = await planHash(plan);
    const key = idempotencyKey(facts.id, hash);
    if (key !== sentKey) {
      return res.status(422).json({ error: 'That idempotency key does not belong to this deal and plan.', code: 'key_mismatch' });
    }

    const run = (await store.get(runKey(hash)).catch(() => null)) || (await exampleRun(hash));
    if (!run) return res.status(409).json({ error: 'Run the checks on this plan first.', code: 'no_run' });

    const checks = validatePlan(plan, facts);
    const { route } = finalRoute(run.decision?.choice, checks);
    if (route === 'block') {
      return res.status(409).json({ error: 'Blocked: a hard check failed, so nothing is written.', code: 'blocked' });
    }
    if (route === 'approval' && !approvedBy) {
      return res.status(409).json({ error: 'This write waits in the approval queue.', code: 'needs_approval' });
    }

    const result = await applyOnce(store, { session, key, dealId: facts.id, hash, plan, approvedBy });
    trace('apply', { deal: facts.id, key, status: result.status, replayed: result.replayed, order: result.order?.salesOrder });
    res.setHeader('Idempotent-Replayed', result.replayed ? 'true' : 'false');
    res.status(result.status).json(result);
  },
  { cost: COST.free, requireKey: true }
);

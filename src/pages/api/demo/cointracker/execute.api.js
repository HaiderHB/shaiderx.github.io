// POST /api/demo/cointracker/execute/  { op: 'execute' | 'verify', session, action, key, attempt?, simulateTimeout?, approvedBy? }
// Sends an approved action to the simulated broker or payroll exactly once, and re-reads it to check
// the action really finished. The server rebuilds the payload from the action's checked numbers,
// recomputes the key from the action id + payload hash (a key that does not match is refused), and
// refuses anything that moves money without a person's approval: money never auto-runs, here too.
// The key is claimed with SET NX before the order exists, so a retry after a timeout gets the stored
// order back, never a second one. No model calls: free, but it still needs the private link.
import { COST, clampText, demoApi } from 'demos/api';
import {
  KEY_PATTERN,
  SESSION_PATTERN,
  executeOnce,
  executionPayload,
  idempotencyKey,
  movesMoney,
  normalizeActions,
  payloadHash,
  verifyFinished,
} from 'pages/demo/cointracker/agent';
import { store, trace } from './server';

export const config = { api: { bodyParser: { sizeLimit: '8kb' } } };

export default demoApi(
  async (req, res) => {
    const op = req.body?.op === 'verify' ? 'verify' : 'execute';
    const session = clampText(req.body?.session, 60);
    const [action] = normalizeActions({ actions: [req.body?.action] });
    const sentKey = clampText(req.body?.key, 60);
    if (!SESSION_PATTERN.test(session) || !action || !KEY_PATTERN.test(sentKey)) {
      return res.status(400).json({ error: 'Send the session, the action and its idempotency key.', code: 'input' });
    }
    action.id = String(req.body?.action?.id || '').match(/^a\d$/)?.[0] || action.id;
    const payload = executionPayload(action);
    if (!payload) return res.status(400).json({ error: 'This action has nothing to execute.', code: 'input' });
    const key = idempotencyKey(action.id, payload, await payloadHash(payload));
    if (key !== sentKey) {
      return res.status(422).json({ error: 'That idempotency key does not belong to this action and payload.', code: 'key_mismatch' });
    }

    if (op === 'verify') {
      const verified = await verifyFinished(store, { session, key, payload });
      trace('verify', { key, done: verified.done });
      return res.status(200).json(verified);
    }

    const approvedBy = clampText(req.body?.approvedBy, 40);
    if (movesMoney(action) && !approvedBy) {
      return res.status(409).json({ error: 'Money never auto-runs: this needs the household’s approval.', code: 'needs_approval' });
    }
    const attempt = Math.max(1, Math.min(9, Number(req.body?.attempt) || 1));
    const result = await executeOnce(store, { session, key, actionId: action.id, payload, attempt, simulateTimeout: Boolean(req.body?.simulateTimeout) });
    trace('execute', { key, attempt, status: result.status, replayed: Boolean(result.replayed), timeout: Boolean(result.timeout) });
    res.setHeader('Idempotent-Replayed', result.replayed ? 'true' : 'false');
    res.status(200).json(result);
  },
  { cost: COST.free, requireKey: true }
);

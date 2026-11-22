// POST /api/demo/resend/broadcast/ -> the broadcast endpoint with durable idempotency
//   { op: 'schedule', session, template, version, audience_id, send_at, idempotency_key, dry_run, attempt }
//   { op: 'approve', session, broadcast_id }
//   { op: 'log', session }
// The same checks as the agent's schedule_broadcast tool (re-linted here, in code), but the
// idempotency key is claimed in the store (SET NX), so a retry of the same call returns the
// broadcast already queued instead of creating a second one, and an approval counts once.
// Sandbox: nothing is ever sent. Free (no model calls), so it works in preview mode too.
import { clampText, COST, demoApi } from 'demos/api';
import { getJSON, listJSON, pushJSON, setJSONIfAbsent } from 'demos/store';
import {
  broadcastHash,
  broadcastRecord,
  callTool,
  checkIdempotencyKey,
  newWorld,
  prepareBroadcast,
  ToolError,
} from 'pages/demo/resend/tools';

export const config = { api: { bodyParser: { sizeLimit: '24kb' } } };

const TTL = 6 * 3600;
const ns = (session, ...parts) => `resend:${parts[0]}:${session}:${parts.slice(1).join(':')}`;

function readSession(value) {
  const session = clampText(value, 24);
  return /^[a-z0-9]{8,24}$/.test(session) ? session : null;
}

/** A one-template world with the page's template at its version, linted in code. */
function worldFor(template, version) {
  const args = {
    name: clampText(template?.name, 60),
    subject: clampText(template?.subject, 140),
    preheader: clampText(template?.preheader, 200),
    kind: template?.kind,
    text: clampText(template?.text, 4000),
    background: template?.background,
    body: Array.isArray(template?.body) ? template.body.slice(0, 40) : null,
  };
  let world = newWorld(Date.now());
  const made = callTool(world, 'create_template', args);
  if (made.isError) throw new ToolError(made.code, made.result.error);
  world = made.world;
  const id = made.result.template_id;
  const v = Math.max(1, Math.min(99, Number(version) || 1));
  world = { ...world, templates: { [id]: { ...world.templates[id], versions: [{ ...world.templates[id].versions[0], version: v }] } } };
  world = callTool(world, 'lint_email', { template_id: id }).world;
  return { world, id };
}

async function log(session, entry) {
  await pushJSON(ns(session, 'log', 'all'), { at: Date.now(), ...entry }, TTL, 60);
}

async function schedule(req, res, session) {
  const body = req.body || {};
  const attempt = Math.max(1, Math.min(9, Number(body.attempt) || 1));
  const keyText = body.idempotency_key == null ? '' : clampText(body.idempotency_key, 90);
  try {
    const { world, id } = worldFor(body.template, body.version);
    const prepared = prepareBroadcast(world, { template_id: id, audience_id: clampText(body.audience_id, 40), send_at: clampText(body.send_at, 40) });
    if (body.dry_run !== false) {
      const record = broadcastRecord(world, prepared, 'dry-run');
      await log(session, { op: 'schedule', status: 200, outcome: 'dry run', attempt, note: 'nothing scheduled' });
      const { broadcast_id, idempotency_key, hash, status, ...preview } = record;
      return res.status(200).json({ dry_run: true, would_schedule: preview, note: 'Nothing was scheduled.' });
    }
    const key = checkIdempotencyKey(keyText);
    const record = broadcastRecord(world, prepared, key);
    const claimed = await setJSONIfAbsent(ns(session, 'idem', key), { hash: record.hash, broadcast_id: record.broadcast_id, at: Date.now() }, TTL);
    if (claimed) {
      await setJSONIfAbsent(ns(session, 'bc', record.broadcast_id), record, TTL);
      await log(session, { op: 'schedule', status: 201, outcome: 'created', key, attempt, broadcast_id: record.broadcast_id });
      return res.status(201).json({ ...record, replayed: false, note: 'Queued. A person must approve it before anything is sent.' });
    }
    const known = await getJSON(ns(session, 'idem', key));
    if (known && known.hash !== broadcastHash(prepared.payload)) {
      await log(session, { op: 'schedule', status: 409, outcome: 'refused', key, attempt, note: 'key already used for a different payload' });
      return res.status(409).json({
        error: `idempotency_key "${key}" was already used for a different broadcast (${known.broadcast_id}). Use a new key for a new broadcast.`,
        code: 'conflict',
      });
    }
    const existing = (await getJSON(ns(session, 'bc', known?.broadcast_id || record.broadcast_id))) || record;
    const approved = await getJSON(ns(session, 'approve', existing.broadcast_id));
    await log(session, { op: 'schedule', status: 200, outcome: 'replayed', key, attempt, broadcast_id: existing.broadcast_id, note: 'no second broadcast' });
    return res.status(200).json({
      ...existing,
      status: approved ? 'approved' : existing.status,
      replayed: true,
      note: 'Same key and payload: this is the broadcast already queued. Nothing new was created.',
    });
  } catch (error) {
    if (!(error instanceof ToolError)) throw error;
    const status = error.code === 'conflict' ? 409 : error.code === 'not_found' ? 404 : 400;
    await log(session, { op: 'schedule', status, outcome: 'refused', key: keyText || null, attempt, note: error.code });
    return res.status(status).json({ error: error.message, code: error.code });
  }
}

async function approve(req, res, session) {
  const id = clampText(req.body?.broadcast_id, 20);
  const broadcast = /^bc_[a-z0-9]{1,8}$/.test(id) ? await getJSON(ns(session, 'bc', id)) : null;
  if (!broadcast) {
    await log(session, { op: 'approve', status: 404, outcome: 'refused', broadcast_id: id, note: 'no such broadcast' });
    return res.status(404).json({ error: `No queued broadcast ${id}.`, code: 'not_found' });
  }
  const first = await setJSONIfAbsent(ns(session, 'approve', id), { at: Date.now() }, TTL);
  await log(session, { op: 'approve', status: 200, outcome: first ? 'approved' : 'already approved', broadcast_id: id, note: first ? 'sandbox: nothing is sent' : 'counted once' });
  return res.status(200).json({
    ...broadcast,
    status: 'approved',
    already: !first,
    note: first ? `Approved for ${broadcast.send_at_local}. Sandbox: nothing is sent.` : 'Already approved: a second approval changes nothing.',
  });
}

export default demoApi(
  async (req, res) => {
    const session = readSession(req.body?.session);
    if (!session) return res.status(400).json({ error: 'Missing session.', code: 'input' });
    const op = req.body?.op;
    if (op === 'schedule') return schedule(req, res, session);
    if (op === 'approve') return approve(req, res, session);
    if (op === 'log') return res.status(200).json({ log: await listJSON(ns(session, 'log', 'all')) });
    return res.status(400).json({ error: 'Unknown op.', code: 'input' });
  },
  { cost: COST.free, requireKey: false }
);

// A small MCP-style tool server over the sample inbox (inbox.js), with a permission gate.
// Pure functions over an immutable `world`, shared by the API routes (the live agent) and the page
// (replays, the approval gate, and "call a tool yourself"), so both compute the same results.
//
// Every tool has a scope:  read  (look only)  ·  draft  (write drafts; nothing leaves)  ·
// act (change the mailbox: label, snooze, archive, send). The user grants a level; a call outside
// it is refused by the server, whatever the model was told. `send` always stops at an approval
// gate, even with the act scope: the person approves or rejects each send.
import { LABELS, NOW, THREAD_IDS, USER, threadById } from './inbox';

export const SCOPES = {
  read: { id: 'read', label: 'read', what: 'Look at threads' },
  draft: { id: 'draft', label: 'draft', what: 'Write drafts; nothing leaves' },
  act: { id: 'act', label: 'act', what: 'Change the mailbox' },
};

export const GRANTS = {
  read: { id: 'read', label: 'Read only', short: 'Read only', scopes: ['read'] },
  draft: {
    id: 'draft',
    label: 'Read + draft',
    short: 'Read + draft',
    scopes: ['read', 'draft'],
  },
  full: {
    id: 'full',
    label: 'Full, send asks me',
    short: 'Full access',
    scopes: ['read', 'draft', 'act'],
  },
};
export const GRANT_IDS = Object.keys(GRANTS);
export const grantOf = id => GRANTS[id] || GRANTS.read;

const threadId = {
  type: 'string',
  description: 'Thread id from list_threads or search, e.g. "t02".',
};

/** tools/list entries (MCP shape) plus `scope` and `approval` for the gate. */
export const TOOLS = [
  {
    name: 'list_threads',
    title: 'List threads',
    scope: 'read',
    description:
      'List threads in the inbox (or under one label), newest first: id, sender, subject, snippet, labels, unread.',
    inputSchema: {
      type: 'object',
      properties: {
        label: {
          type: 'string',
          enum: ['Inbox', ...LABELS],
          description: 'Defaults to Inbox.',
        },
        unread_only: { type: 'boolean' },
        limit: { type: 'integer', minimum: 1, maximum: 25 },
      },
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'read_thread',
    title: 'Read a thread',
    scope: 'read',
    description: 'Every message in one thread, oldest first, with sender, date and body.',
    inputSchema: {
      type: 'object',
      properties: { thread_id: threadId },
      required: ['thread_id'],
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'search',
    title: 'Search mail',
    scope: 'read',
    description:
      'Search sender, subject and body. Words must all match; "from:name" limits to a sender.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'e.g. "from:dana contract" or "invoice"' },
        limit: { type: 'integer', minimum: 1, maximum: 10 },
      },
      required: ['query'],
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'draft_reply',
    title: 'Draft a reply',
    scope: 'draft',
    description:
      'Save a reply draft on a thread (replaces an earlier draft on it). Nothing is sent.',
    inputSchema: {
      type: 'object',
      properties: {
        thread_id: threadId,
        body: {
          type: 'string',
          description: 'Plain text, signed as Alex. Max 1,200 characters.',
        },
      },
      required: ['thread_id', 'body'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  {
    name: 'apply_label',
    title: 'Apply a label',
    scope: 'act',
    description: 'Add one label to a thread.',
    inputSchema: {
      type: 'object',
      properties: { thread_id: threadId, label: { type: 'string', enum: LABELS } },
      required: ['thread_id', 'label'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  {
    name: 'snooze',
    title: 'Snooze a thread',
    scope: 'act',
    description:
      'Hide a thread until a later date and time (Pacific), e.g. "2026-11-23T09:00". It comes back then.',
    inputSchema: {
      type: 'object',
      properties: { thread_id: threadId, until: { type: 'string' } },
      required: ['thread_id', 'until'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  {
    name: 'archive',
    title: 'Archive a thread',
    scope: 'act',
    description: 'Move a thread out of the inbox. It stays searchable.',
    inputSchema: {
      type: 'object',
      properties: { thread_id: threadId },
      required: ['thread_id'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  {
    name: 'send',
    title: 'Send a draft',
    scope: 'act',
    approval: true,
    description:
      'Send a draft made with draft_reply. Every send waits for the user to approve it in their client.',
    inputSchema: {
      type: 'object',
      properties: {
        draft_id: { type: 'string', description: 'From draft_reply, e.g. "d1".' },
      },
      required: ['draft_id'],
    },
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
  },
];

export const TOOL_NAMES = TOOLS.map(tool => tool.name);
export const toolByName = name => TOOLS.find(tool => tool.name === name);

/** The tools in OpenAI function-calling form, for the model. */
export const MODEL_TOOLS = TOOLS.map(tool => ({
  type: 'function',
  function: {
    name: tool.name,
    description: `${tool.description} (scope: ${tool.scope}${
      tool.approval ? ', needs approval' : ''
    })`,
    parameters: tool.inputSchema,
  },
}));

/** What the gate says about one call under a grant: allowed | blocked | awaiting. */
export function gate(name, grantId) {
  const tool = toolByName(name);
  if (!tool) return { status: 'error', reason: `Unknown tool ${name}.` };
  const grant = grantOf(grantId);
  if (!grant.scopes.includes(tool.scope)) {
    return {
      status: 'blocked',
      reason: `Permission denied: ${name} needs the "${
        tool.scope
      }" scope; this session has ${grant.scopes.map(scope => `"${scope}"`).join(', ')}.`,
    };
  }
  if (tool.approval)
    return { status: 'awaiting', reason: 'Waits for the user to approve.' };
  return { status: 'allowed' };
}

// --- world: the mutable layer over the static sample inbox ------------------------------------

export function initialWorld() {
  const threads = {};
  for (const id of THREAD_IDS) {
    threads[id] = {
      labels: [],
      archived: false,
      snoozedUntil: null,
      draftId: null,
      sent: [],
    };
  }
  return { threads, drafts: {}, approvals: {}, sent: [], nextDraft: 1, nextApproval: 1 };
}

const clean = (value, max) =>
  String(value ?? '')
    .replace(/\r/g, '')
    .slice(0, max)
    .trim();

class ToolError extends Error {}

function needThread(world, id) {
  const key = clean(id, 8);
  if (!threadById(key) || !world.threads[key]) {
    throw new ToolError(
      `No thread "${key}". Use list_threads or search to find thread ids.`
    );
  }
  return key;
}

const lastMessage = thread => thread.messages[thread.messages.length - 1];
const snippetOf = text => {
  const flat = String(text).replace(/\s+/g, ' ').trim();
  return flat.length > 110 ? `${flat.slice(0, 107)}...` : flat;
};
const inInbox = state => !state.archived && !state.snoozedUntil;

function summary(world, thread) {
  const state = world.threads[thread.id];
  const last = lastMessage(thread);
  return {
    id: thread.id,
    from: `${thread.from.name} <${thread.from.email}>`,
    subject: thread.subject,
    date: last.date,
    snippet: snippetOf(last.body),
    labels: state.labels,
    unread: thread.unread,
    ...(state.draftId && { draft_id: state.draftId }),
    ...(state.snoozedUntil && { snoozed_until: state.snoozedUntil }),
    ...(state.archived && { archived: true }),
  };
}

const bySender = (thread, name) => {
  const who = `${thread.from.name} ${thread.from.email}`.toLowerCase();
  return (
    thread.messages.some(m => m.from.toLowerCase().includes(name)) || who.includes(name)
  );
};

function matchWindow(thread, words) {
  const body = thread.messages
    .map(m => m.body)
    .join(' \n ')
    .replace(/\s+/g, ' ');
  const lower = body.toLowerCase();
  const at = words.map(w => lower.indexOf(w)).find(i => i >= 0);
  if (at == null || at < 0) return snippetOf(lastMessage(thread).body);
  const start = Math.max(0, at - 40);
  const piece = body.slice(start, start + 120).trim();
  return `${start ? '...' : ''}${piece}${start + 120 < body.length ? '...' : ''}`;
}

function parseUntil(value) {
  const text = clean(value, 40);
  const match = text.match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{1,2}):(\d{2}))?/);
  if (!match) throw new ToolError('"until" must look like 2026-11-23T09:00 (Pacific).');
  const hour = String(match[2] ?? '9').padStart(2, '0');
  const iso = `${match[1]}T${hour}:${match[3] ?? '00'}:00-08:00`;
  const at = Date.parse(iso);
  const now = Date.parse(NOW);
  if (!Number.isFinite(at)) throw new ToolError('"until" is not a valid date.');
  if (at <= now) throw new ToolError('"until" must be in the future.');
  if (at - now > 60 * 86400000) throw new ToolError('Snooze for 60 days at most.');
  return iso.slice(0, 16);
}

const withThread = (world, id, patch) => ({
  ...world,
  threads: { ...world.threads, [id]: { ...world.threads[id], ...patch } },
});

// --- the tools --------------------------------------------------------------------------------

const HANDLERS = {
  list_threads(world, args) {
    const label = clean(args.label, 20) || 'Inbox';
    if (label !== 'Inbox' && !LABELS.includes(label)) {
      throw new ToolError(
        `Unknown label "${label}". Labels: Inbox, ${LABELS.join(', ')}.`
      );
    }
    const limit = Math.min(25, Math.max(1, Number(args.limit) || 20));
    const all = Object.keys(world.threads)
      .map(id => threadById(id))
      .filter(thread => {
        const state = world.threads[thread.id];
        if (label === 'Inbox') return inInbox(state);
        return state.labels.includes(label);
      })
      .filter(thread => !args.unread_only || thread.unread);
    return {
      result: {
        label,
        total: all.length,
        threads: all.slice(0, limit).map(thread => summary(world, thread)),
      },
    };
  },

  read_thread(world, args) {
    const id = needThread(world, args.thread_id);
    const thread = threadById(id);
    const state = world.threads[id];
    return {
      result: {
        id,
        subject: thread.subject,
        labels: state.labels,
        messages: thread.messages.map(m => ({
          from: m.from,
          to: m.to,
          date: m.date,
          body: m.body,
        })),
        ...(state.draftId && { draft: world.drafts[state.draftId] }),
        ...(state.sent.length && { sent_replies: state.sent }),
      },
    };
  },

  search(world, args) {
    const query = clean(args.query, 120).toLowerCase();
    if (!query) throw new ToolError('Give a query.');
    const limit = Math.min(10, Math.max(1, Number(args.limit) || 8));
    const tokens = query.split(/\s+/).filter(Boolean);
    const from = tokens
      .filter(t => t.startsWith('from:'))
      .map(t => t.slice(5))
      .filter(Boolean);
    const words = tokens.filter(t => !t.startsWith('from:'));
    const hits = Object.keys(world.threads)
      .map(id => threadById(id))
      .filter(thread => from.every(name => bySender(thread, name)))
      .filter(thread => {
        const hay = [
          thread.subject,
          thread.from.name,
          thread.from.email,
          ...thread.messages.map(m => `${m.from} ${m.body}`),
        ]
          .join(' ')
          .toLowerCase();
        return words.every(word => hay.includes(word));
      });
    return {
      result: {
        query: clean(args.query, 120),
        total: hits.length,
        threads: hits.slice(0, limit).map(thread => ({
          ...summary(world, thread),
          snippet: matchWindow(thread, words),
        })),
      },
    };
  },

  draft_reply(world, args) {
    const id = needThread(world, args.thread_id);
    const body = clean(args.body, 1200);
    if (!body) throw new ToolError('The draft body is empty.');
    const thread = threadById(id);
    const state = world.threads[id];
    const draftId = state.draftId || `d${world.nextDraft}`;
    const to = thread.messages
      .slice()
      .reverse()
      .find(m => !m.from.includes(USER.email))?.from;
    const subject = thread.subject.startsWith('Re:')
      ? thread.subject
      : `Re: ${thread.subject}`;
    const draft = { draft_id: draftId, thread_id: id, to, subject, body };
    let next = withThread(world, id, { draftId });
    next = {
      ...next,
      drafts: { ...next.drafts, [draftId]: draft },
      nextDraft: state.draftId ? world.nextDraft : world.nextDraft + 1,
    };
    return { world: next, result: { ...draft, status: 'saved as draft, not sent' } };
  },

  apply_label(world, args) {
    const id = needThread(world, args.thread_id);
    const label = clean(args.label, 20);
    if (!LABELS.includes(label)) {
      throw new ToolError(`Unknown label "${label}". Labels: ${LABELS.join(', ')}.`);
    }
    const labels = world.threads[id].labels;
    const next = labels.includes(label)
      ? world
      : withThread(world, id, { labels: [...labels, label] });
    return { world: next, result: { thread_id: id, labels: next.threads[id].labels } };
  },

  snooze(world, args) {
    const id = needThread(world, args.thread_id);
    const until = parseUntil(args.until);
    const next = withThread(world, id, { snoozedUntil: until });
    return { world: next, result: { thread_id: id, snoozed_until: until } };
  },

  archive(world, args) {
    const id = needThread(world, args.thread_id);
    const next = withThread(world, id, { archived: true });
    return { world: next, result: { thread_id: id, archived: true } };
  },

  send(world, args) {
    const draftId = clean(args.draft_id, 8);
    const draft = world.drafts[draftId];
    if (!draft)
      throw new ToolError(`No draft "${draftId}". Make one with draft_reply first.`);
    const already = Object.values(world.approvals).find(
      item => item.draft_id === draftId && item.status === 'pending'
    );
    if (already) {
      return {
        result: {
          approval_id: already.approval_id,
          status: 'pending_approval',
          note: 'Already waiting for the user. Do not call send again for this draft.',
        },
      };
    }
    const approvalId = `a${world.nextApproval}`;
    const approval = {
      approval_id: approvalId,
      draft_id: draftId,
      thread_id: draft.thread_id,
      to: draft.to,
      subject: draft.subject,
      status: 'pending',
    };
    const next = {
      ...world,
      approvals: { ...world.approvals, [approvalId]: approval },
      nextApproval: world.nextApproval + 1,
    };
    return {
      world: next,
      result: {
        approval_id: approvalId,
        draft_id: draftId,
        to: draft.to,
        status: 'pending_approval',
        note: 'Not sent. The user must approve it in their client. Do not call send again for this draft.',
      },
    };
  },
};

/**
 * One tools/call through the gate. Returns { world, status, result, isError }:
 * status 'allowed' (ran), 'blocked' (scope not granted; nothing ran), 'awaiting' (send queued
 * for approval), 'error' (bad arguments; nothing changed). `result` is what the model reads.
 */
export function callTool(world, name, args, grantId) {
  const verdict = gate(name, grantId);
  if (verdict.status === 'error') {
    return { world, status: 'error', isError: true, result: { error: verdict.reason } };
  }
  if (verdict.status === 'blocked') {
    return {
      world,
      status: 'blocked',
      isError: true,
      result: {
        error: verdict.reason,
        note: 'Refused by the server. Do not retry; tell the user what you would have done.',
      },
    };
  }
  try {
    const out = HANDLERS[name](world, args && typeof args === 'object' ? args : {});
    return {
      world: out.world || world,
      status: verdict.status,
      isError: false,
      result: out.result,
    };
  } catch (error) {
    if (!(error instanceof ToolError)) throw error;
    return { world, status: 'error', isError: true, result: { error: error.message } };
  }
}

// --- the person's side of the approval gate ---------------------------------------------------

/** The person approves a queued send: the reply lands in the thread (sample inbox only). */
export function approveSend(world, approvalId, at = NOW) {
  const approval = world.approvals[approvalId];
  if (!approval || approval.status !== 'pending') return world;
  const draft = world.drafts[approval.draft_id];
  const sent = {
    approval_id: approvalId,
    thread_id: draft.thread_id,
    to: draft.to,
    subject: draft.subject,
    body: draft.body,
    at,
  };
  const drafts = { ...world.drafts };
  delete drafts[approval.draft_id];
  const thread = world.threads[draft.thread_id];
  return {
    ...world,
    drafts,
    approvals: { ...world.approvals, [approvalId]: { ...approval, status: 'approved' } },
    sent: [...world.sent, sent],
    threads: {
      ...world.threads,
      [draft.thread_id]: { ...thread, draftId: null, sent: [...thread.sent, sent] },
    },
  };
}

/** The person rejects a queued send: the draft stays a draft. */
export function rejectSend(world, approvalId) {
  const approval = world.approvals[approvalId];
  if (!approval || approval.status !== 'pending') return world;
  return {
    ...world,
    approvals: { ...world.approvals, [approvalId]: { ...approval, status: 'rejected' } },
  };
}

export const pendingApprovals = world =>
  Object.values(world.approvals).filter(item => item.status === 'pending');

/** Counts for the inbox header: in inbox, labelled, drafts, snoozed, archived, sent. */
export function inboxCounts(world) {
  const states = Object.values(world.threads);
  return {
    inbox: states.filter(inInbox).length,
    labelled: states.filter(s => s.labels.length).length,
    drafts: Object.keys(world.drafts).length,
    snoozed: states.filter(s => s.snoozedUntil).length,
    archived: states.filter(s => s.archived).length,
    sent: world.sent.length,
    waiting: pendingApprovals(world).length,
  };
}

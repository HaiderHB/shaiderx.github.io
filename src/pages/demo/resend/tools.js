// The sandboxed email tool server the agent works through, MCP-style: tools/list entries in two
// wordings (the improved descriptions and a deliberately vague set over the same server) and
// callTool(world, name, args), which runs every tool in code on a plain JSON world. Nothing is
// ever sent: test sends land in an in-page outbox and a broadcast only queues for a person.
// Pure and synchronous, so the API, the replay and the in-browser tool panel share it.
import { COMPONENTS, HERO_IMAGE, POSTAL_ADDRESS, lintEmail, linksOf, normaliseBody, renderHtml } from './email.js';

export const ZONE = 'America/New_York';
export const TEST_INBOX = 'team@lumen-labs.dev';
export const FROM = 'Lumen <updates@lumen-labs.dev>';

export const AUDIENCES = [
  { id: 'aud_beta', name: 'Beta users', contacts: 1284, unsubscribed: 37 },
  { id: 'aud_customers', name: 'All customers', contacts: 18240, unsubscribed: 912 },
  { id: 'aud_team', name: 'Lumen team (internal)', contacts: 14, unsubscribed: 0 },
];

export const WORKSPACE = {
  company: 'Lumen Labs',
  product: 'Lumen, product analytics for small SaaS teams',
  from: FROM,
  test_inbox: TEST_INBOX,
  postal_address: POSTAL_ADDRESS,
  brand: {
    ink: '#14151a',
    accent: '#3446d6',
    hero_image: HERO_IMAGE,
    hero_image_shows: 'the new dashboard: metric cards, a live funnel chart and a weekly-active tile',
    hero_size: '1200x600',
    note: 'Launch emails open with the hero image and use the brand ink for headings.',
  },
  launch: {
    feature: 'the new dashboard',
    url: 'https://app.lumen-labs.dev/dashboard',
    whats_new: [
      'Custom metric cards you can pin and reorder',
      'Live funnels that update every minute',
      'Shareable views with comments for the whole team',
    ],
  },
};

// ---- time zones --------------------------------------------------------------------------------

function zoneParts(ms, zone = ZONE) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(new Date(ms))
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, Number(part.value)])
  );
  return parts;
}

const zoneOffset = (ms, zone) => {
  const p = zoneParts(ms, zone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
};

/** UTC ms of a wall-clock time in a zone (DST-aware). */
export function zonedToUtc({ year, month, day, hour, minute = 0 }, zone = ZONE) {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const first = guess - zoneOffset(guess, zone);
  return guess - zoneOffset(first, zone);
}

/** "Sun 22 Nov 2026, 09:00 EST" */
export function formatZoned(ms, zone = ZONE) {
  const date = new Date(ms);
  const day = new Intl.DateTimeFormat('en-GB', { timeZone: zone, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  return `${day.replace(',', '')}, ${clock(date, zone)}`;
}

// "09:00 EST": en-US names the zone (EST / EDT); en-GB would say GMT-5
function clock(date, zone) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'short' }).formatToParts(date);
  const get = type => parts.find(part => part.type === type)?.value;
  return `${get('hour')}:${get('minute')} ${get('timeZoneName')}`;
}

/** "2026-11-22T09:00:00-05:00": an instant written in the zone's wall clock, with its offset. */
export function isoInZone(ms, zone = ZONE) {
  const p = zoneParts(ms, zone);
  const offset = Math.round(zoneOffset(ms, zone) / 60_000);
  const sign = offset < 0 ? '-' : '+';
  const abs = Math.abs(offset);
  const pad = value => String(value).padStart(2, '0');
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** What "tomorrow 9am ET" means at `now`: the expected send time, for the outcome check. */
export function tomorrowAt(nowMs, hour = 9) {
  const today = zoneParts(nowMs);
  const noon = Date.UTC(today.year, today.month - 1, today.day + 1, 12);
  const next = new Date(noon);
  return zonedToUtc({ year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate(), hour });
}

/** The agent's sense of now, in the workspace zone: "Saturday 21 November 2026, 15:20 EST". */
export function describeNow(nowMs) {
  const date = new Date(nowMs);
  const day = new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  return `${day.replace(',', '')}, ${clock(date, ZONE)} (${new Date(nowMs).toISOString().slice(0, 16)}Z)`;
}

// ---- world -------------------------------------------------------------------------------------

/** A fresh sandbox: no templates, an empty outbox, no broadcasts. */
export function newWorld(nowMs) {
  return { now: nowMs, templates: {}, lints: {}, outbox: [], broadcasts: [], idem: {}, seq: 0 };
}

/** Short stable hash (FNV-1a) for ids and payload fingerprints; the same in Node and browsers. */
export function shortHash(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36).padStart(7, '0').slice(0, 7);
}

const latest = template => template.versions[template.versions.length - 1];

export function templateVersion(world, id, version) {
  const template = world.templates[id];
  if (!template) return null;
  return version ? template.versions.find(item => item.version === Number(version)) || null : latest(template);
}

// ---- tools/list --------------------------------------------------------------------------------

const COMPONENT_SCHEMA = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: COMPONENTS },
    text: { type: 'string' },
    level: { type: 'integer', enum: [1, 2, 3] },
    size: { type: 'string', enum: ['sm'] },
    href: { type: 'string' },
    src: { type: 'string' },
    alt: { type: 'string' },
    width: { type: 'integer' },
    height: { type: 'integer' },
    items: { type: 'array', items: { type: 'string' } },
    color: { type: 'string', description: 'Hex colour, e.g. #14151a' },
    background: { type: 'string', description: 'Hex colour (Button, Section)' },
    align: { type: 'string', enum: ['left', 'center'] },
    children: { type: 'array', items: { type: 'object' }, description: 'Section only: components inside it' },
  },
  required: ['type'],
};

const CLEAR = [
  {
    name: 'list_audiences',
    title: 'List audiences',
    description:
      'List the audiences (contact lists) in this workspace with their ids and sizes. Call it when the user names a group of people ("beta users"): schedule_broadcast takes the audience id, not its name.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'create_template',
    title: 'Create or update a template',
    description: `Create an email template from a React Email-style component tree, or update one: calling it again with the same name saves a new version (lint and preview the new one). body is an array of components: Heading {text, level}, Text {text, size?: "sm"}, Button {text, href, background?, color?}, Link {text, href}, Img {src, alt, width, height}, List {items}, Hr {}, Section {children, background?}. Colours are hex. {{{FIRST_NAME|there}}} is the contact's first name. Compliance rules (unsubscribe, address, contrast) are not listed here: lint_email checks them and returns the exact fix. Returns template_id and version. Nothing is sent.`,
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Stable name, e.g. "dashboard-launch". Same name = new version.' },
        subject: { type: 'string', description: 'Subject line, under 60 characters.' },
        preheader: { type: 'string', description: 'Preview text the inbox shows after the subject, under 90 characters.' },
        kind: { type: 'string', enum: ['marketing', 'transactional'], description: 'A launch or newsletter is marketing.' },
        text: { type: 'string', description: 'The plain-text part: the whole message as plain text, links written out as URLs.' },
        background: { type: 'string', description: 'Hex background of the email body. Set it if you set text colours.' },
        body: { type: 'array', items: COMPONENT_SCHEMA, description: 'The components, top to bottom.' },
      },
      required: ['name', 'subject', 'kind', 'body'],
    },
  },
  {
    name: 'render_preview',
    title: 'Render a preview',
    description:
      'Render a template version to HTML and plain text, as the inbox will show it. Returns sizes, the links and the start of the plain-text part; the user sees the rendered email (desktop and mobile). Read-only.',
    inputSchema: {
      type: 'object',
      properties: {
        template_id: { type: 'string' },
        version: { type: 'integer', description: 'Defaults to the latest version.' },
      },
      required: ['template_id'],
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'lint_email',
    title: 'Lint before sending',
    description:
      'Check a template version before any send: plain-text part, image alt text, unsubscribe link and postal address (marketing), links, subject length, preview text, dark-mode contrast and spam-trigger phrases. Each check comes with a fix. Errors block send_test and schedule_broadcast: fix them with create_template (same name) and lint the new version. Read-only.',
    inputSchema: {
      type: 'object',
      properties: {
        template_id: { type: 'string' },
        version: { type: 'integer', description: 'Defaults to the latest version.' },
      },
      required: ['template_id'],
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'send_test',
    title: 'Send a test (sandbox)',
    description: `Send one test of the latest template version to the team's test inbox (${TEST_INBOX}). Sandbox: it lands in the outbox on the page; nothing leaves. The version must be linted with 0 errors first.`,
    inputSchema: {
      type: 'object',
      properties: {
        template_id: { type: 'string' },
        to: { type: 'string', description: `A workspace test address: ${TEST_INBOX}.` },
      },
      required: ['template_id', 'to'],
    },
  },
  {
    name: 'schedule_broadcast',
    title: 'Schedule a broadcast',
    description:
      'Schedule the latest template version to an audience. Safe by default: dry_run defaults to true and returns what would happen (recipients, local and UTC send time) without scheduling anything. To queue it, call again with dry_run: false and an idempotency_key you make up once for this broadcast (e.g. "dashboard-launch-2026-11-22"); reuse the same key on any retry, so a retry can never create a second broadcast. A queued broadcast waits for a person to approve it; you cannot send it yourself.',
    inputSchema: {
      type: 'object',
      properties: {
        template_id: { type: 'string' },
        audience_id: { type: 'string', description: 'An id from list_audiences, e.g. aud_beta.' },
        send_at: { type: 'string', description: 'ISO 8601 with an offset, e.g. 2026-11-22T09:00:00-05:00 (09:00 New York time in winter).' },
        dry_run: { type: 'boolean', description: 'Default true: report only. false queues it for approval.' },
        idempotency_key: { type: 'string', description: 'Required when dry_run is false. 8-80 characters; the same key on every retry.' },
      },
      required: ['template_id', 'audience_id', 'send_at'],
    },
  },
];

// The same server, described the way many first tool servers are: one line each, bare schemas
const VAGUE = [
  { name: 'list_audiences', title: 'List audiences', description: 'Lists audiences.', inputSchema: { type: 'object', properties: {} } },
  {
    name: 'create_template',
    title: 'Create template',
    description: 'Creates a template.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        subject: { type: 'string' },
        preheader: { type: 'string' },
        kind: { type: 'string' },
        text: { type: 'string' },
        background: { type: 'string' },
        body: { type: 'array', items: { type: 'object' } },
      },
      required: ['name'],
    },
  },
  {
    name: 'render_preview',
    title: 'Render preview',
    description: 'Renders a template.',
    inputSchema: { type: 'object', properties: { template_id: { type: 'string' }, version: { type: 'integer' } } },
  },
  {
    name: 'lint_email',
    title: 'Lint email',
    description: 'Lints an email.',
    inputSchema: { type: 'object', properties: { template_id: { type: 'string' }, version: { type: 'integer' } } },
  },
  {
    name: 'send_test',
    title: 'Send test',
    description: 'Sends a test email.',
    inputSchema: { type: 'object', properties: { template_id: { type: 'string' }, to: { type: 'string' } } },
  },
  {
    name: 'schedule_broadcast',
    title: 'Schedule broadcast',
    description: 'Schedules a broadcast.',
    inputSchema: {
      type: 'object',
      properties: {
        template_id: { type: 'string' },
        audience_id: { type: 'string' },
        send_at: { type: 'string' },
        dry_run: { type: 'boolean' },
        idempotency_key: { type: 'string' },
      },
    },
  },
];

export const TOOL_SETS = { clear: CLEAR, vague: VAGUE };
export const TOOL_NAMES = CLEAR.map(tool => tool.name);
export const toolsFor = variant => TOOL_SETS[variant] || CLEAR;

/** OpenAI-style function definitions for the model. */
export const modelTools = variant =>
  toolsFor(variant).map(tool => ({
    type: 'function',
    function: { name: tool.name, description: tool.description, parameters: tool.inputSchema },
  }));

// ---- callTool ----------------------------------------------------------------------------------

class ToolError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
const fail = (code, message) => {
  throw new ToolError(code, message);
};

const ISO_WITH_ZONE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/;
const ISO_NO_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;

function needTemplate(world, args) {
  const id = String(args.template_id || '').trim();
  if (!id) fail('missing_field', 'template_id is required (create_template returns it).');
  const template = world.templates[id];
  if (!template) {
    const known = Object.keys(world.templates);
    fail('not_found', `No template ${JSON.stringify(id)}.${known.length ? ` Known: ${known.join(', ')}.` : ' Create one with create_template first.'}`);
  }
  const version = args.version != null ? template.versions.find(item => item.version === Number(args.version)) : latest(template);
  if (!version) fail('not_found', `Template ${id} has no version ${args.version}; latest is ${latest(template).version}.`);
  return { template, version };
}

const lintKey = (id, version) => `${id}@${version}`;

function requireCleanLint(world, id, version, action) {
  const lint = world.lints[lintKey(id, version)];
  if (!lint) fail('precondition', `Version ${version} of ${id} has not been linted. Call lint_email before ${action}.`);
  if (lint.errors > 0) {
    const failing = lint.checks.filter(check => check.status === 'fail').map(check => check.id);
    fail('precondition', `Version ${version} has ${lint.errors} lint error${lint.errors > 1 ? 's' : ''} (${failing.join(', ')}). Fix them with create_template and lint again before ${action}.`);
  }
  return lint;
}

function parseSendAt(value, nowMs) {
  const text = String(value || '').trim();
  if (!text) fail('missing_field', 'send_at is required: ISO 8601 with an offset, e.g. 2026-11-22T09:00:00-05:00.');
  if (ISO_NO_ZONE.test(text))
    fail('invalid_args', `send_at ${JSON.stringify(text)} has no time zone, so 09:00 is ambiguous. Add an offset, e.g. ${text.slice(0, 16)}:00-05:00 for New York in winter.`);
  const match = text.match(ISO_WITH_ZONE);
  if (!match) fail('invalid_args', `send_at ${JSON.stringify(text)} is not ISO 8601 with an offset, e.g. 2026-11-22T09:00:00-05:00.`);
  const ms = Date.parse(text.replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
  if (!Number.isFinite(ms)) fail('invalid_args', `send_at ${JSON.stringify(text)} is not a real date.`);
  if (ms <= nowMs + 5 * 60_000) fail('invalid_args', `send_at is in the past or under 5 minutes away (now is ${new Date(nowMs).toISOString()}).`);
  if (ms > nowMs + 30 * 86_400_000) fail('invalid_args', 'send_at is more than 30 days away.');
  return ms;
}

/** The fingerprint an idempotency key is bound to: same key + different payload is refused. */
export const broadcastHash = payload =>
  shortHash(JSON.stringify([payload.template_id, payload.version, payload.audience_id, payload.send_at_utc]));

/**
 * Validates a schedule_broadcast call against a world (template, clean lint, audience, time) and
 * returns { payload, audience, sendAt } or throws a ToolError. Shared with the store-backed route.
 */
export function prepareBroadcast(world, args) {
  const { template, version } = needTemplate(world, args);
  requireCleanLint(world, template.id, version.version, 'scheduling a broadcast');
  const audienceId = String(args.audience_id || '').trim();
  if (!audienceId) fail('missing_field', 'audience_id is required: an id from list_audiences, e.g. aud_beta.');
  const audience = AUDIENCES.find(item => item.id === audienceId);
  if (!audience) {
    const byName = AUDIENCES.find(item => item.name.toLowerCase() === audienceId.toLowerCase());
    fail('not_found', `No audience ${JSON.stringify(audienceId)}.${byName ? ` Did you mean ${byName.id} (${byName.name})?` : ''} Use an id from list_audiences.`);
  }
  const sendAt = parseSendAt(args.send_at, world.now);
  const payload = { template_id: template.id, version: version.version, audience_id: audience.id, send_at_utc: new Date(sendAt).toISOString() };
  return { payload, audience, sendAt, version };
}

export function broadcastRecord(world, prepared, key) {
  const { payload, audience } = prepared;
  return {
    broadcast_id: `bc_${shortHash(`${key}|${broadcastHash(payload)}`)}`,
    status: 'awaiting_approval',
    ...payload,
    send_at_local: formatZoned(Date.parse(payload.send_at_utc)),
    audience_name: audience.name,
    recipients: audience.contacts - audience.unsubscribed,
    idempotency_key: key,
    hash: broadcastHash(payload),
  };
}

function cleanKey(value) {
  const key = String(value ?? '').trim();
  if (!key) fail('missing_field', 'idempotency_key is required when dry_run is false: make one up for this broadcast and reuse it on every retry.');
  if (key.length < 8 || key.length > 80 || !/^[\w.:-]+$/.test(key)) fail('invalid_args', 'idempotency_key must be 8-80 characters: letters, digits, - _ . :');
  return key;
}

export { cleanKey as checkIdempotencyKey, ToolError };

const TOOLS = {
  list_audiences(world) {
    return {
      world,
      result: { audiences: AUDIENCES.map(({ id, name, contacts, unsubscribed }) => ({ id, name, contacts, unsubscribed })) },
    };
  },

  create_template(world, args) {
    const name = String(args.name || '').trim().slice(0, 60);
    if (!name) fail('missing_field', 'name is required, e.g. "dashboard-launch".');
    const subject = String(args.subject || '').trim().slice(0, 140);
    if (!subject) fail('missing_field', 'subject is required.');
    if (args.kind != null && !['marketing', 'transactional'].includes(args.kind))
      fail('invalid_args', `kind ${JSON.stringify(args.kind)} is not one of marketing, transactional. A launch email is marketing.`);
    if (args.body == null) fail('missing_field', `body is required: an array of components (${COMPONENTS.join(', ')}).`);
    const { body, problems } = normaliseBody(args.body);
    if (problems.length) {
      fail(
        'invalid_args',
        `body has ${problems.length} problem${problems.length > 1 ? 's' : ''}: ${problems
          .slice(0, 3)
          .map(problem => `${problem.path}: ${problem.message}`)
          .join('; ')}. Nothing was saved.`
      );
    }
    if (!body.length) fail('invalid_args', 'body is empty.');
    const id = `tpl_${shortHash(name)}`;
    const existing = world.templates[id];
    const version = {
      version: existing ? latest(existing).version + 1 : 1,
      name,
      subject,
      preheader: String(args.preheader || '').trim().slice(0, 200),
      kind: args.kind || 'marketing',
      text: String(args.text || '').slice(0, 4000),
      background: /^#[0-9a-f]{3,6}$/i.test(String(args.background || '')) ? args.background : null,
      body,
    };
    const templates = {
      ...world.templates,
      [id]: { id, name, versions: [...(existing?.versions || []), version] },
    };
    return {
      world: { ...world, templates },
      result: {
        template_id: id,
        version: version.version,
        components: body.length,
        has_text_part: Boolean(version.text.trim()),
        next: 'render_preview and lint_email this version before any send.',
      },
    };
  },

  render_preview(world, args) {
    const { template, version } = needTemplate(world, args);
    const html = renderHtml(version);
    const text = version.text || '';
    return {
      world,
      result: {
        template_id: template.id,
        version: version.version,
        subject: version.subject,
        html_bytes: new TextEncoder().encode(html).length,
        text_chars: text.length,
        links: linksOf(version).map(({ text: label, href }) => ({ text: label, href })),
        images: version.body.filter(node => node.type === 'Img').length,
        text_preview: text.slice(0, 160),
        shown_to_user: 'desktop (600 px) and mobile (375 px), light and dark',
      },
    };
  },

  lint_email(world, args) {
    const { template, version } = needTemplate(world, args);
    const lint = lintEmail(version);
    return {
      world: { ...world, lints: { ...world.lints, [lintKey(template.id, version.version)]: lint } },
      result: {
        template_id: template.id,
        version: version.version,
        errors: lint.errors,
        warnings: lint.warnings,
        checks: lint.checks.map(({ id, status, message, fix }) => ({ id, status, message, ...(status !== 'pass' && status !== 'na' && fix && { fix }) })),
      },
    };
  },

  send_test(world, args) {
    const { template, version } = needTemplate(world, args);
    const to = String(args.to || '').trim().toLowerCase();
    if (!to) fail('missing_field', `to is required: the test inbox, ${TEST_INBOX}.`);
    if (to !== TEST_INBOX) fail('invalid_args', `${to} is not a workspace test address. send_test only goes to ${TEST_INBOX}; real recipients get a broadcast.`);
    requireCleanLint(world, template.id, version.version, 'a test send');
    const message = {
      message_id: `msg_${shortHash(`${template.id}@${version.version}#${world.outbox.length}`)}`,
      to,
      from: FROM,
      subject: `[Test] ${version.subject}`,
      template_id: template.id,
      version: version.version,
      at: world.now,
      sandbox: true,
    };
    return {
      world: { ...world, outbox: [...world.outbox, message] },
      result: { ...message, note: 'Recorded in the sandbox outbox. Nothing was sent.' },
    };
  },

  schedule_broadcast(world, args) {
    const prepared = prepareBroadcast(world, args);
    const { payload, audience, sendAt } = prepared;
    const tested = world.outbox.some(message => message.template_id === payload.template_id && message.version === payload.version);
    if (args.dry_run !== false) {
      return {
        world,
        result: {
          dry_run: true,
          would_schedule: { ...payload, send_at_local: formatZoned(sendAt), audience_name: audience.name, recipients: audience.contacts - audience.unsubscribed },
          test_sent: tested,
          note: 'Nothing was scheduled. Call again with dry_run: false and an idempotency_key to queue it for approval.',
        },
      };
    }
    const key = cleanKey(args.idempotency_key);
    const known = world.idem[key];
    if (known) {
      if (known.hash !== broadcastHash(payload))
        fail('conflict', `idempotency_key ${JSON.stringify(key)} was already used for a different broadcast (${known.broadcast_id}). Use a new key for a new broadcast.`);
      const existing = world.broadcasts.find(item => item.broadcast_id === known.broadcast_id);
      return {
        world,
        result: { ...existing, replayed: true, note: 'Same key and payload: this is the broadcast already queued. Nothing new was created.' },
      };
    }
    const record = broadcastRecord(world, prepared, key);
    return {
      world: {
        ...world,
        idem: { ...world.idem, [key]: { hash: record.hash, broadcast_id: record.broadcast_id } },
        broadcasts: [...world.broadcasts, { ...record, test_sent: tested }],
      },
      result: { ...record, test_sent: tested, replayed: false, note: 'Queued. A person must approve it before anything is sent.' },
    };
  },
};

/** A copy of obj without the given keys. */
export function omit(obj, keys) {
  const copy = { ...obj };
  for (const key of keys) delete copy[key];
  return copy;
}

// The vague server's errors: the same failure, without the sentence that says how to fix it
const TERSE = {
  invalid_args: 'Invalid arguments.',
  missing_field: 'Missing required field.',
  not_found: 'Not found.',
  precondition: 'Precondition failed.',
  conflict: 'Conflict.',
  unknown_tool: 'Unknown tool.',
};

/**
 * Runs one tool. Returns { world, result, isError, code }: on an error the world is unchanged and
 * result is { error } (an MCP error result the model can read). variant 'vague' answers the way a
 * bare server does: terse errors and lint checks without the fix line. Same logic either way.
 */
export function callTool(world, name, args, variant = 'clear') {
  const vague = variant === 'vague';
  const tool = TOOLS[name];
  if (!tool) {
    const error = vague ? TERSE.unknown_tool : `Unknown tool ${name}. Tools: ${TOOL_NAMES.join(', ')}.`;
    return { world, isError: true, code: 'unknown_tool', result: { error, code: 'unknown_tool' } };
  }
  try {
    const out = tool(world, args && typeof args === 'object' && !Array.isArray(args) ? args : {});
    let result = out.result;
    if (vague && name === 'lint_email') result = { ...result, checks: result.checks.map(check => omit(check, ['fix'])) };
    if (vague && result.next) result = omit(result, ['next']);
    return { world: out.world, result, isError: false };
  } catch (error) {
    if (!(error instanceof ToolError)) throw error;
    return { world, isError: true, code: error.code, result: { error: vague ? TERSE[error.code] || 'Error.' : error.message, code: error.code } };
  }
}

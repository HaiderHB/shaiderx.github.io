// Presentational pieces of the Resend demo: the tool-call log, the email preview (desktop /
// mobile, light / dark, plain text, React Email source), lint checks, the sandbox outbox, the
// approval card and the agent UX report. Everything shown is computed from the run in code.
import {
  ApprovalCard,
  Card,
  CardHead,
  CardTitle,
  CodeView,
  McpCallLog,
  MiniLabel,
  Pill,
  SegmentedControl,
  StatusIcon,
  Tabs,
  Tag,
} from 'demos/ui';
import { useMemo, useRef, useState } from 'react';
import { analyseRun, finalTemplate } from './agent';
import { lintEmail, previewText, renderHtml, toJsx } from './email';
import styles from './Resend.module.css';
import { TOOL_SETS, formatZoned } from './tools';

const number = value => Number(value || 0).toLocaleString('en-US');

// ---- tool calls --------------------------------------------------------------------------------

const SCOPES = {
  list_audiences: 'read',
  create_template: 'draft',
  render_preview: 'read',
  lint_email: 'read',
  send_test: 'sandbox',
  schedule_broadcast: 'act',
};
const CALL_STATUSES = {
  allowed: { label: 'ok', tone: 'ok' },
  dry: { label: 'dry run', tone: 'muted' },
  awaiting: { label: 'queued for approval', tone: 'warn' },
  replayed: { label: 'replayed, no duplicate', tone: 'ok' },
  error: { label: 'error', tone: 'bad' },
};

function callNote(call) {
  if (call.isError) return call.result?.error;
  const result = call.result || {};
  if (call.name === 'lint_email') return `v${result.version}: ${result.errors} errors, ${result.warnings} warnings`;
  if (call.name === 'create_template') return `${result.template_id} v${result.version} saved, ${result.components} components`;
  if (call.name === 'schedule_broadcast' && result.dry_run)
    return `Would go to ${number(result.would_schedule?.recipients)} contacts at ${result.would_schedule?.send_at_local}. Nothing scheduled.`;
  if (call.name === 'schedule_broadcast') return `${result.broadcast_id} for ${result.send_at_local}, waiting for a person.`;
  if (call.name === 'send_test') return `${result.to}: in the sandbox outbox, nothing sent.`;
  return null;
}

export function toLogCalls(run) {
  return run.calls.map(call => {
    let status = call.status === 'running' ? 'running' : call.isError ? 'error' : 'allowed';
    if (!call.isError && call.name === 'schedule_broadcast' && call.result) status = call.result.dry_run ? 'dry' : call.result.replayed ? 'replayed' : 'awaiting';
    return { id: call.id, name: call.name, scope: SCOPES[call.name], status, args: call.args, result: call.result, note: callNote(call) };
  });
}

export function CallLog({ run, pending, active }) {
  return (
    <McpCallLog
      className={styles.callLog}
      calls={toLogCalls(run)}
      statuses={CALL_STATUSES}
      scopeTones={{ read: 'neutral', draft: 'accent', sandbox: 'neutral', act: 'warn' }}
      pending={pending}
      pendingLabel="The agent is choosing its next tool…"
      empty="Run the task: every tools/call lands here with its arguments and result."
      active={active}
      label="Tool calls"
    />
  );
}

// ---- preview ---------------------------------------------------------------------------------

const DEVICES = [
  { value: 'desktop', label: 'Desktop' },
  { value: 'mobile', label: 'Mobile' },
];
const MODES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark client' },
];
const VIEWS = [
  { id: 'email', label: 'Email' },
  { id: 'text', label: 'Plain text' },
  { id: 'jsx', label: 'React Email' },
];

function Frame({ html, device, title }) {
  const ref = useRef(null);
  const [height, setHeight] = useState(520);
  const fit = () => {
    try {
      const doc = ref.current?.contentDocument;
      if (doc) setHeight(Math.min(1600, Math.max(320, doc.documentElement.scrollHeight + 4)));
    } catch {
      // cross-origin: keep the default height
    }
  };
  return (
    <div className={styles.frameWrap} data-device={device}>
      <iframe
        ref={ref}
        className={styles.frame}
        title={title}
        srcDoc={html}
        sandbox="allow-same-origin"
        onLoad={fit}
        style={{ height }}
      />
    </div>
  );
}

/** The template the run is on, rendered in code: pick a version, a device and a client mode. */
export function EmailPreview({ run, version, onVersion }) {
  const [device, setDevice] = useState('desktop');
  const [mode, setMode] = useState('light');
  const [view, setView] = useState('email');
  const template = finalTemplate(run);
  const versions = template ? run.world.templates[template.id].versions : [];
  const shown = versions.find(item => item.version === version) || versions[versions.length - 1];
  const html = useMemo(() => (shown ? renderHtml(shown, { mode }) : ''), [shown, mode]);
  const lint = useMemo(() => (shown ? lintEmail(shown) : null), [shown]);

  if (!shown) {
    return (
      <div className={styles.previewEmpty} data-kit="preview">
        <span className={styles.previewEmptyIcon} aria-hidden />
        <p>The email renders here as soon as the agent creates the template.</p>
      </div>
    );
  }

  return (
    <div className={styles.preview} data-kit="preview">
      <div className={styles.inboxHead}>
        <div className={styles.inboxFrom}>
          <span className={styles.inboxAvatar} aria-hidden>
            L
          </span>
          <div>
            <b>Lumen</b> <span>updates@lumen-labs.dev</span>
            <p className={styles.inboxSubject} data-kit="subject">
              {shown.subject}
            </p>
            {shown.preheader && <p className={styles.inboxPre}>{shown.preheader}</p>}
          </div>
        </div>
        {versions.length > 1 && (
          <div className={styles.versions} role="group" aria-label="Template version">
            {versions.map(item => {
              const itemLint = lintEmail(item);
              return (
                <button
                  key={item.version}
                  type="button"
                  className={styles.versionChip}
                  aria-pressed={item.version === shown.version}
                  onClick={() => onVersion(item.version)}
                >
                  v{item.version}
                  <span data-tone={itemLint.errors ? 'bad' : itemLint.warnings ? 'warn' : 'ok'}>
                    {itemLint.errors ? `${itemLint.errors} err` : itemLint.warnings ? `${itemLint.warnings} warn` : 'clean'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className={styles.previewBar}>
        <Tabs items={VIEWS} value={view} onChange={setView} label="Preview view" />
        {view === 'email' && (
          <div className={styles.previewToggles}>
            <SegmentedControl options={DEVICES} value={device} onChange={setDevice} label="Device" />
            <SegmentedControl options={MODES} value={mode} onChange={setMode} label="Client theme" />
          </div>
        )}
      </div>
      {view === 'email' && <Frame html={html} device={device} title={`Preview of ${shown.subject}, version ${shown.version}`} />}
      {view === 'text' && (
        <pre className={styles.plain} data-kit="plaintext">
          {previewText(shown) || 'No plain-text part in this version.'}
        </pre>
      )}
      {view === 'jsx' && <CodeView code={toJsx(shown)} lang="js" title={`${shown.name}.tsx · v${shown.version}`} copy maxHeight={520} wrap />}
      <p className={styles.previewFoot}>
        Rendered in code from the component tree (v{shown.version}, {lint.errors} errors, {lint.warnings} warnings).
        {mode === 'dark' ? ' Dark client: unset backgrounds turn dark, colours the template sets stay.' : ''} Sample contact: Maya.
      </p>
    </div>
  );
}

// ---- lint, outbox, approval ------------------------------------------------------------------

const STATUS_FOR = { pass: 'pass', warn: 'warn', fail: 'fail', na: 'na' };

/** The latest lint of the run, with checks an earlier version failed marked "fixed". */
export function LintChecks({ run }) {
  const template = finalTemplate(run);
  if (!template) return <p className={styles.muted}>Lint results land here after lint_email.</p>;
  const lints = Object.entries(run.world.lints)
    .filter(([key]) => key.startsWith(`${template.id}@`))
    .map(([key, lint]) => ({ version: Number(key.split('@')[1]), lint }))
    .sort((a, b) => a.version - b.version);
  const last = lints[lints.length - 1];
  if (!last) return <p className={styles.muted}>Not linted yet.</p>;
  const earlier = lints.slice(0, -1);
  const items = last.lint.checks.map(check => {
    const before = earlier.map(item => item.lint.checks.find(c => c.id === check.id)).find(c => c && (c.status === 'fail' || c.status === 'warn'));
    const fixed = check.status === 'pass' && before;
    return {
      id: check.id,
      label: check.label,
      status: fixed ? 'fixed' : STATUS_FOR[check.status],
      detail: fixed ? `Fixed in v${last.version}` : check.message,
      removed: fixed ? [before.message] : undefined,
    };
  });
  const fixedCount = items.filter(item => item.status === 'fixed').length;
  return (
    <div data-kit="lint">
      <div className={styles.lintHead}>
        <span>
          v{last.version}: <b>{last.lint.errors}</b> errors · <b>{last.lint.warnings}</b> warnings
        </span>
        {fixedCount > 0 && <Tag tone="ok">{fixedCount} fixed by the agent</Tag>}
      </div>
      <ul className={styles.checks} aria-label="Lint checks">
        {items.map(item => (
          <li key={item.id} data-status={item.status}>
            <StatusIcon status={item.status === 'fixed' ? 'pass' : item.status} />
            <span className={styles.checkText}>
              <b>{item.label}</b>
              <span>{item.detail}</span>
              {item.removed?.map(text => (
                <del key={text}>{text}</del>
              ))}
            </span>
            <span className={styles.checkWord} data-status={item.status}>
              {{ pass: 'Pass', fixed: 'Fixed', warn: 'Review', fail: 'Fail', na: 'n/a' }[item.status]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Outbox({ run }) {
  const outbox = run.world?.outbox || [];
  return (
    <div className={styles.outbox} data-kit="outbox">
      <div className={styles.sandbox}>
        <span className={styles.sandboxDot} aria-hidden /> Sandbox: nothing is sent
      </div>
      {outbox.length ? (
        <ul className={styles.outboxList}>
          {outbox.map(message => (
            <li key={message.message_id}>
              <span className={styles.outboxIcon} aria-hidden />
              <span>
                <b>{message.subject}</b>
                <span>
                  to {message.to} · v{message.version} · <code>{message.message_id}</code>
                </span>
              </span>
              <Pill>test</Pill>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.muted}>Test sends land here. Nothing leaves the page.</p>
      )}
    </div>
  );
}

/** The broadcast the agent queued, waiting for a person. Approve goes to the store-backed endpoint. */
export function BroadcastApproval({ run, state, onApprove, onReject, busy }) {
  const broadcast = run.world?.broadcasts?.[run.world.broadcasts.length - 1];
  if (!broadcast) {
    return (
      <p className={styles.muted} data-kit="approval">
        A broadcast the agent queues waits here for a person. The agent cannot send it.
      </p>
    );
  }
  const status = state?.status || 'pending';
  return (
    <ApprovalCard
      data-kit="approval"
      className={styles.approval}
      status={status}
      statusText={{
        pending: 'Waiting for your approval',
        approved: state?.note || 'Approved. Sandbox: nothing is sent.',
        rejected: 'Rejected: the broadcast will not go out.',
      }}
      title={`${number(broadcast.recipients)} beta users, ${broadcast.send_at_local}`}
      meta={[
        ['Broadcast', broadcast.broadcast_id],
        ['Audience', `${broadcast.audience_name} (${broadcast.audience_id})`],
        ['Template', `${broadcast.template_id} v${broadcast.version}`],
        ['Key', broadcast.idempotency_key],
      ]}
      onApprove={onApprove}
      onReject={onReject}
      busy={busy}
      approveLabel="Approve broadcast"
      rejectLabel="Reject"
    />
  );
}

// ---- agent UX report ---------------------------------------------------------------------------

const METRICS = [
  { id: 'steps', label: 'Tool calls', lower: true },
  { id: 'errors', label: 'Errors', lower: true },
  { id: 'retries', label: 'Retries after an error', lower: true },
  { id: 'tokens', label: 'Tokens', lower: true, format: value => `${(value / 1000).toFixed(1)}k` },
  { id: 'passed', label: 'Outcome checks passed', lower: false, format: (value, total) => `${value}/${total}` },
];

/** Vague against improved, metric by metric; both bars on one scale, the improved one in the accent. */
export function UxCompare({ vague, clear }) {
  const a = analyseRun(vague);
  const b = analyseRun(clear);
  const total = b.checks.length || a.checks.length;
  return (
    <div className={styles.compare} data-kit="ux-compare">
      <div className={styles.compareLegend}>
        <span data-key="vague">Vague descriptions</span>
        <span data-key="clear">Improved descriptions</span>
      </div>
      {METRICS.map(metric => {
        const x = a[metric.id];
        const y = b[metric.id];
        const max = Math.max(x, y, metric.id === 'passed' ? total : 1);
        const show = value => (metric.format ? metric.format(value, total) : number(value));
        const better = metric.lower ? y < x : y > x;
        return (
          <div key={metric.id} className={styles.metric} data-kit-metric={metric.id}>
            <span className={styles.metricLabel}>{metric.label}</span>
            <div className={styles.metricBars}>
              <div className={styles.bar} data-key="vague">
                <span style={{ width: `${Math.max(2, (x / max) * 100)}%` }} />
                <b>{show(x)}</b>
              </div>
              <div className={styles.bar} data-key="clear">
                <span style={{ width: `${Math.max(2, (y / max) * 100)}%` }} />
                <b>{show(y)}</b>
              </div>
            </div>
            <span className={styles.metricDelta} data-better={better || undefined}>
              {x === y ? 'same' : metric.id === 'passed' ? `${y > x ? '+' : ''}${y - x}` : `${y < x ? '−' : '+'}${Math.round((Math.abs(x - y) / Math.max(x, 1)) * 100)}%`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function Stumbles({ run }) {
  const { stumbles } = analyseRun(run);
  if (!stumbles.length) return <p className={styles.muted}>No errors in this run.</p>;
  return (
    <ol className={styles.stumbles} data-kit="stumbles">
      {stumbles.map(item => (
        <li key={item.id}>
          <span className={styles.stumbleId}>{item.id}</span>
          <div>
            <div className={styles.stumbleHead}>
              <code>{item.name}</code>
              <Tag tone="warn">{item.kind}</Tag>
            </div>
            <p className={styles.stumbleMsg}>
              The agent read: <q>{item.message}</q>
            </p>
            {item.thought && <p className={styles.stumbleThought}>“{item.thought.length > 150 ? `${item.thought.slice(0, 148)}…` : item.thought}”</p>}
            <p className={styles.stumbleNext}>
              Next: <code>{item.next}</code>
              {item.recovered ? ' (recovered)' : ''}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function OutcomeTable({ vague, clear }) {
  const a = analyseRun(vague).checks;
  const b = analyseRun(clear).checks;
  return (
    <div className={styles.outcome} role="table" aria-label="Outcome checks, vague against improved" data-kit="outcome">
      <div className={styles.outcomeRow} data-head role="row">
        <span role="columnheader">Check, in code</span>
        <span role="columnheader">Vague</span>
        <span role="columnheader">Improved</span>
      </div>
      {b.map((check, index) => (
        <div key={check.id} className={styles.outcomeRow} role="row">
          <span role="cell">
            <b>{check.label}</b>
            <em>{check.expected}</em>
          </span>
          {[a[index], check].map((item, side) => (
            <span key={side} role="cell" className={styles.outcomeCell} data-label={side ? 'Improved' : 'Vague'}>
              <StatusIcon status={item?.pass ? 'pass' : 'fail'} variant="solid" />
              <span>{item?.actual ?? '–'}</span>
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/** One tool's description in both wordings, as a diff. */
export function DescriptionDiff({ name }) {
  const vague = TOOL_SETS.vague.find(tool => tool.name === name);
  const clear = TOOL_SETS.clear.find(tool => tool.name === name);
  const lines = tool => [
    `description: ${tool.description}`,
    ...Object.entries(tool.inputSchema.properties || {}).map(([key, value]) =>
      `  ${key}: ${value.type}${value.enum ? ` (${value.enum.join(' | ')})` : ''}${value.description ? `  // ${value.description}` : ''}`
    ),
    `  required: ${(tool.inputSchema.required || []).join(', ') || 'none'}`,
  ];
  const code = [...lines(vague).map(line => `- ${line}`), ...lines(clear).map(line => `+ ${line}`)].join('\n');
  return <CodeView code={code} lang="diff" title={`${name}: tools/list entry`} maxHeight={360} wrap numbers={false} />;
}

export function RunTotals({ run }) {
  const stats = analyseRun(run);
  return (
    <span className={styles.totals}>
      {stats.steps} tool calls · {stats.errors} errors · {(stats.tokens / 1000).toFixed(1)}k tokens
      {stats.ms ? ` · ${(stats.ms / 1000).toFixed(0)} s live` : ''}
    </span>
  );
}

export { formatZoned };

export function SafetyCard({ title, children, aside }) {
  return (
    <Card className={styles.safetyCard}>
      <CardHead aside={aside}>
        <CardTitle>{title}</CardTitle>
      </CardHead>
      {children}
    </Card>
  );
}

export { MiniLabel };

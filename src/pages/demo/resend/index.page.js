// Resend demo: "An agent that ships an email, safely". One sentence in; an agent drafts a React
// Email-style template, previews it, lints it, fixes what the linter flags, sends a sandbox test
// and queues the broadcast for a person, all through MCP-style tools that run in code.
// Then: retry safety on a store-backed broadcast endpoint, and an agent UX report (the same task
// through vague tool descriptions vs improved ones). Live at /demo/resend/ (unlisted, noindex).
// Without a demo key the page replays recorded runs; with one, runs stream from /api/demo/resend/run/.
import { DemoLayout } from 'demos/DemoLayout';
import { getDemoKey, streamFromApi } from 'demos/client';
import {
  Button,
  Card,
  CardHead,
  CardTitle,
  ChoiceChips,
  McpToolPanel,
  MiniLabel,
  NoteGrid,
  Notice,
  Pill,
  RequestLog,
  RunStatus,
  SectionHead,
  SegmentedControl,
  Spinner,
  StatGrid,
  StatTile,
  TextArea,
} from 'demos/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FiRotateCcw } from 'react-icons/fi';
import { HERO_TASK, PRESETS, analyseRun, emptyRun, finalTemplate, foldRun, reduceRun } from './agent';
import { EXAMPLE } from './example';
import {
  BroadcastApproval,
  CallLog,
  DescriptionDiff,
  EmailPreview,
  LintChecks,
  OutcomeTable,
  Outbox,
  RunTotals,
  Stumbles,
  UxCompare,
} from './panels';
import styles from './Resend.module.css';
import { TOOL_SETS, callTool, isoInZone, newWorld, shortHash, tomorrowAt } from './tools';

const RUN_PATH = '/api/demo/resend/run/';
const BROADCAST_PATH = '/api/demo/resend/broadcast/';
const PREVIEW_NOTE = 'Preview mode: live agent runs need the private link from my message.';
const EXAMPLE_LABEL = `Example run, recorded ${EXAMPLE.recorded}`;

const NAV = [
  { href: '#agent', label: 'Agent' },
  { href: '#safety', label: 'Safety' },
  { href: '#report', label: 'Agent UX report' },
  { href: '#tools', label: 'Tools' },
];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const PACE = { start: 200, turn: 420, call: 240, result: 520, final: 300 };
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Streams NDJSON events from the run route into onEvent. */
async function streamEvents(body, onEvent) {
  let buffer = '';
  let finished = false;
  const handle = line => {
    if (!line.trim()) return;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      return;
    }
    if (event.t === 'done' || event.t === 'error') finished = true;
    onEvent(event);
  };
  await streamFromApi(RUN_PATH, body, chunk => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop();
    lines.forEach(handle);
  });
  handle(buffer);
  if (!finished) onEvent({ t: 'error', message: 'The run ended early. Try again in a moment.' });
}

const newSession = () => Array.from({ length: 14 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');

export default function ResendDemo() {
  const [hasKey, setHasKey] = useState(false);
  const [task, setTask] = useState(HERO_TASK);
  const [run, setRun] = useState(() => ({ ...foldRun(EXAMPLE.clear.slice(0, 1)), kind: 'example' }));
  const [status, setStatus] = useState('replaying'); // replaying | running | done | error | idle
  const [notice, setNotice] = useState('');
  const [version, setVersion] = useState(null);
  const [approval, setApproval] = useState({ status: 'pending' });
  const token = useRef(0);

  // Retry safety: a store-backed broadcast endpoint, one ledger per page visit
  const session = useRef('');
  const [log, setLog] = useState([]);
  const [safetyBusy, setSafetyBusy] = useState(false);
  const [safetyError, setSafetyError] = useState('');
  const [queued, setQueued] = useState(null);

  // Agent UX report
  const [ux, setUx] = useState(() => ({ kind: 'example', vague: foldRun(EXAMPLE.vague), clear: foldRun(EXAMPLE.clear) }));
  const [uxBusy, setUxBusy] = useState(false);
  const [uxNotice, setUxNotice] = useState('');

  const busy = status === 'running' || status === 'replaying';

  useEffect(() => {
    setHasKey(Boolean(getDemoKey()));
    session.current = newSession();
    replay();
    return () => {
      token.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetSideEffects() {
    setVersion(null);
    setApproval({ status: 'pending' });
    setQueued(null);
  }

  async function replay() {
    const mine = ++token.current;
    resetSideEffects();
    setNotice('');
    setTask(HERO_TASK);
    setStatus('replaying');
    const instant = reducedMotion();
    let state = { ...emptyRun('example') };
    for (const event of EXAMPLE.clear) {
      if (!instant && PACE[event.t]) await sleep(PACE[event.t]);
      if (token.current !== mine) return;
      state = { ...reduceRun(state, event), kind: 'example' };
      setRun(state);
    }
    setStatus('done');
  }

  function skipToResult() {
    token.current += 1;
    setRun({ ...foldRun(EXAMPLE.clear), kind: 'example' });
    setStatus('done');
  }

  async function runLive(event) {
    event?.preventDefault();
    const text = task.trim();
    if (busy || text.length < 12) return;
    if (!hasKey) {
      setNotice(`${PREVIEW_NOTE} Replaying the recorded run of the launch task.`);
      replay();
      return;
    }
    const mine = ++token.current;
    resetSideEffects();
    setNotice('');
    setStatus('running');
    let state = { ...emptyRun('live') };
    setRun(state);
    try {
      await streamEvents({ task: text, variant: 'clear' }, incoming => {
        if (token.current !== mine) return;
        state = { ...reduceRun(state, incoming), kind: 'live' };
        setRun(state);
      });
      if (token.current === mine) setStatus(state.error ? 'error' : 'done');
    } catch (error) {
      if (token.current !== mine) return;
      setRun(current => ({ ...current, error: error.message, done: true }));
      setStatus('error');
    }
  }

  // ---- the broadcast endpoint (free: no model calls, so it works without a key) --------------

  const template = finalTemplate(run);
  const agentBroadcast = run.world?.broadcasts?.[run.world.broadcasts.length - 1] || null;
  const idemKey = agentBroadcast?.idempotency_key || 'dashboard-launch-beta-2026-11-22';

  async function post(body) {
    const response = await fetch(BROADCAST_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session: session.current, ...body }),
    });
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data };
  }

  const schedulePayload = (overrides = {}) => {
    const sendAt = tomorrowAt(Date.now());
    return {
      op: 'schedule',
      template: template && { name: template.name, subject: template.subject, preheader: template.preheader, kind: template.kind, text: template.text, background: template.background, body: template.body },
      version: template?.version,
      audience_id: 'aud_beta',
      send_at: isoInZone(sendAt),
      idempotency_key: idemKey,
      dry_run: false,
      ...overrides,
    };
  };

  const pushRow = row => setLog(rows => [...rows, { id: `${Date.now()}-${rows.length}`, at: Date.now(), method: 'POST', ...row }]);

  function rowFor({ status: code, data }, { path = '/broadcasts', attempt, note, highlight, key }) {
    const outcome = code === 201 ? 'created' : data.replayed ? 'replayed' : data.already ? 'already approved' : data.status === 'approved' ? 'approved' : data.dry_run ? 'dry run' : code >= 400 ? 'refused' : 'ok';
    return {
      path,
      status: code,
      outcome,
      note: note || data.note || data.error,
      meta: [key !== undefined ? (key ? `key ${key}` : 'no key') : null, attempt ? `attempt ${attempt}` : null, data.broadcast_id || null].filter(Boolean),
      highlight,
    };
  }

  async function safety(action, { twice = true } = {}) {
    if (!template || safetyBusy) return;
    setSafetyBusy(true);
    setSafetyError('');
    try {
      if (action === 'retry') {
        const first = await post({ ...schedulePayload(), attempt: 1 });
        pushRow(rowFor(first, { attempt: 1, key: idemKey, note: first.status === 201 ? 'Queued, but the response is lost on the way back (simulated timeout).' : undefined }));
        if (first.data.broadcast_id) setQueued(first.data);
        await sleep(650);
        const second = await post({ ...schedulePayload(), attempt: 2 });
        pushRow(rowFor(second, { attempt: 2, key: idemKey, highlight: true, note: second.data.replayed ? 'The agent retries the same call: same broadcast back, no second one.' : undefined }));
        if (second.data.broadcast_id) setQueued(second.data);
      } else if (action === 'nokey') {
        const out = await post({ ...schedulePayload({ idempotency_key: undefined }), attempt: 1 });
        pushRow(rowFor(out, { attempt: 1, key: null }));
      } else if (action === 'conflict') {
        const later = isoInZone(tomorrowAt(Date.now(), 10));
        const out = await post({ ...schedulePayload({ send_at: later }), attempt: 1 });
        pushRow(rowFor(out, { attempt: 1, key: idemKey, note: out.status === 409 ? 'Same key, new send time: refused, so a reused key cannot sneak in a second broadcast.' : undefined }));
      } else if (action === 'approve') {
        let target = queued;
        if (!target) {
          const made = await post({ ...schedulePayload(), attempt: 1 });
          pushRow(rowFor(made, { attempt: 1, key: idemKey }));
          target = made.data.broadcast_id ? made.data : null;
          if (target) setQueued(target);
        }
        if (!target) throw new Error('The broadcast could not be queued.');
        for (const time of twice ? [1, 2] : [1]) {
          const out = await post({ op: 'approve', broadcast_id: target.broadcast_id });
          pushRow(rowFor(out, { path: `/broadcasts/${target.broadcast_id}/approve`, highlight: time === 2 }));
          if (time === 1) setApproval({ status: 'approved', note: out.data.note });
          await sleep(400);
        }
      }
    } catch (error) {
      setSafetyError(error.message || 'The request failed.');
    }
    setSafetyBusy(false);
  }

  async function approveFromCard() {
    await safety('approve', { twice: false });
  }

  // ---- the agent UX report ---------------------------------------------------------------------

  async function runReport() {
    if (!hasKey) {
      setUxNotice(`${PREVIEW_NOTE} The report shows the recorded pair of runs.`);
      return;
    }
    setUxNotice('');
    setUxBusy(true);
    setUx({ kind: 'live', vague: emptyRun('live'), clear: emptyRun('live') });
    const one = variant =>
      streamEvents({ task: HERO_TASK, variant }, event => setUx(current => ({ ...current, [variant]: reduceRun(current[variant], event) }))).catch(error =>
        setUx(current => ({ ...current, [variant]: { ...current[variant], error: error.message, done: true } }))
      );
    await Promise.all([one('vague'), one('clear')]);
    setUxBusy(false);
  }

  const stats = analyseRun(run);
  const fixes = useMemo(() => countFixes(run), [run]);
  const vagueStats = analyseRun(ux.vague);
  const clearStats = analyseRun(ux.clear);
  const created = new Set(log.filter(row => row.status === 201).map(row => row.meta.find(text => text.startsWith('bc_')))).size;
  const lastCall = run.calls[run.calls.length - 1];
  const pending = busy && (!lastCall || lastCall.status !== 'running') && !run.final;

  return (
    <DemoLayout
      company="Resend"
      title="An agent that ships the launch email, safely"
      tagline="One sentence in. The agent drafts a React Email-style template, previews it, lints it, fixes what the linter flags, sends a sandbox test and queues the broadcast for a person, through MCP-style tools that run in code."
      accent="iris"
      nav={NAV}
      wide
      hero={<Glance run={run} status={status} stats={stats} fixes={fixes} approval={approval} />}
    >
      <div className={styles.page}>
        <section id="agent" className={styles.section} aria-labelledby="agent-heading">
          <Card className={styles.taskCard} data-kit="task">
            <form className={styles.taskForm} onSubmit={runLive}>
              <div className={styles.taskTop}>
                <MiniLabel as="label" htmlFor="resend-task">
                  Ask the agent
                </MiniLabel>
                <span className={styles.sandboxPill}>
                  <span aria-hidden /> Sandbox: nothing is sent
                </span>
              </div>
              <div className={styles.taskRow}>
                <TextArea
                  id="resend-task"
                  className={styles.taskInput}
                  value={task}
                  maxLength={320}
                  rows={2}
                  disabled={busy}
                  onChange={event => setTask(event.target.value)}
                />
                <Button type="submit" disabled={busy} className={styles.runButton} data-kit="run">
                  {status === 'running' ? (
                    <>
                      <Spinner /> Working
                    </>
                  ) : hasKey ? (
                    'Run it live'
                  ) : (
                    'Run the task'
                  )}
                </Button>
              </div>
              <div className={styles.taskMeta}>
                <ChoiceChips
                  label="Example tasks"
                  options={PRESETS.map(item => ({ value: item.id, label: item.label }))}
                  value={PRESETS.find(item => item.task === task)?.id}
                  onChange={id => !busy && setTask(PRESETS.find(item => item.id === id).task)}
                />
                <span className={styles.runLine}>
                  {run.kind === 'example' ? (
                    <RunStatus state={status === 'replaying' ? 'live' : 'example'}>{status === 'replaying' ? `Replaying: ${EXAMPLE_LABEL}` : EXAMPLE_LABEL}</RunStatus>
                  ) : (
                    <RunStatus state={status === 'running' ? 'live' : status === 'done' ? 'ended' : 'idle'}>
                      {status === 'running' ? 'Live run' : run.cached ? 'Live run, replayed from today’s cache' : 'Live run'}
                    </RunStatus>
                  )}
                  {status === 'replaying' ? (
                    <Button variant="link" type="button" onClick={skipToResult}>
                      Skip to the result
                    </Button>
                  ) : (
                    run.kind === 'example' && (
                      <Button variant="link" type="button" onClick={replay}>
                        <span className={styles.replay}>
                          <FiRotateCcw aria-hidden /> Replay
                        </span>
                      </Button>
                    )
                  )}
                  <span className={styles.muted}>{hasKey ? 'Live: about a minute, about 2 cents' : 'Preview: the recorded run replays'}</span>
                </span>
              </div>
              {notice && (
                <Notice size="s" className={styles.notice} role="status">
                  {notice}
                </Notice>
              )}
              {run.error && (
                <Notice kind="error" size="s" className={styles.notice} role="alert">
                  {run.error}
                </Notice>
              )}
            </form>
          </Card>

          <div className={styles.workspace}>
            <Card className={styles.callsCard} data-kit="calls">
              <CardHead aside={<RunTotals run={run} />}>
                <CardTitle>Tool calls</CardTitle>
              </CardHead>
              <CallLog run={run} pending={pending} active={busy ? lastCall?.id : undefined} />
              {run.final && (
                <div className={styles.final} data-kit="final">
                  <MiniLabel>The agent, when it was done</MiniLabel>
                  <p>{run.final}</p>
                </div>
              )}
            </Card>

            <Card className={styles.previewCard} data-kit="preview-card">
              <CardHead aside={template ? <Pill tone="neutral">{template.kind}</Pill> : null}>
                <CardTitle>Live preview</CardTitle>
              </CardHead>
              <EmailPreview run={run} version={version} onVersion={setVersion} />
            </Card>

            <div className={styles.side}>
              <Card className={styles.lintCard} data-kit="lint-card">
                <CardHead>
                  <CardTitle>Lint, in code</CardTitle>
                </CardHead>
                <LintChecks run={run} />
              </Card>
              <Card className={styles.outboxCard}>
                <CardHead>
                  <CardTitle>Outbox</CardTitle>
                </CardHead>
                <Outbox run={run} />
              </Card>
              <BroadcastApproval
                run={run}
                state={approval}
                busy={safetyBusy || busy}
                onApprove={approveFromCard}
                onReject={() => setApproval({ status: 'rejected' })}
              />
            </div>
          </div>
        </section>

        <section id="safety" className={styles.section} aria-labelledby="safety-heading">
          <SectionHead
            variant="eyebrow"
            kicker="Safety for agents as users"
            titleId="safety-heading"
            title="A retry can never send twice"
            lede="Agents retry: a timeout, a lost response, a second attempt at a turn. The broadcast endpoint is dry-run by default, needs an idempotency key and a person's approval, and claims each key once in the store, so the same call twice returns the same broadcast. Free to try: nothing here calls a model."
          />
          <div className={styles.safetyGrid}>
            <Card className={styles.safetyActions} data-kit="safety-actions">
              <CardHead>
                <CardTitle>Call the endpoint like an agent would</CardTitle>
              </CardHead>
              <KeyLine label="The call" value={`schedule_broadcast · ${template ? `${template.name} v${template.version}` : '…'} · aud_beta · tomorrow 09:00 ET`} />
              <KeyLine label="Idempotency key" value={idemKey} mono />
              <div className={styles.safetyButtons}>
                <Button onClick={() => safety('retry')} disabled={safetyBusy || !template} data-kit="retry">
                  Queue it, lose the response, retry
                </Button>
                <Button variant="secondary" onClick={() => safety('nokey')} disabled={safetyBusy || !template}>
                  Retry without a key
                </Button>
                <Button variant="secondary" onClick={() => safety('conflict')} disabled={safetyBusy || !template}>
                  Same key, different time
                </Button>
                <Button variant="secondary" onClick={() => safety('approve')} disabled={safetyBusy || !template}>
                  Approve it twice
                </Button>
              </div>
              <ul className={styles.rules}>
                <li>
                  <b>Dry run first.</b> <code>dry_run</code> defaults to true: the agent sees recipients and the local send time, and nothing is scheduled.
                </li>
                <li>
                  <b>One key, one broadcast.</b> The key is claimed with a set-if-absent write; same key and payload returns the first result, a changed payload is refused.
                </li>
                <li>
                  <b>A person sends.</b> A queued broadcast waits for approval, and an approval counts once.
                </li>
              </ul>
              {safetyError && (
                <Notice kind="error" size="s" className={styles.notice}>
                  {safetyError}
                </Notice>
              )}
            </Card>
            <div className={styles.safetyLog}>
              <StatGrid columns={3} className={styles.safetyStats}>
                <StatTile tone="accent" label="Broadcasts created" value={created} note={`from ${log.filter(row => row.path === '/broadcasts').length} schedule calls`} />
                <StatTile label="Approvals counted" value={approval.status === 'approved' ? 1 : 0} note={`from ${log.filter(row => row.path !== '/broadcasts').length} approve calls`} />
                <StatTile label="Emails sent" value={0} note="sandbox: nothing leaves" />
              </StatGrid>
              <Card className={styles.logCard} data-kit="request-log">
                <CardHead aside={<span className={styles.muted}>Store-backed, this visit only</span>}>
                  <CardTitle>Requests the endpoint received</CardTitle>
                </CardHead>
                <RequestLog items={log} empty="Press a button: each request lands here with its status, key and attempt." label="Broadcast endpoint requests" />
              </Card>
            </div>
          </div>
        </section>

        <section id="report" className={styles.section} aria-labelledby="report-heading">
          <SectionHead
            variant="eyebrow"
            kicker="Agent UX report"
            titleId="report-heading"
            title="Same task, same tools, two wordings"
            lede="The agent is a user of the tool server, so its descriptions are its interface. The launch task runs twice over the same server: once with one-line descriptions, bare schemas and bare errors, once with the improved wording. Steps, errors, retries, tokens and the outcome are counted in code from the two runs."
            action={
              <Button onClick={runReport} disabled={uxBusy} data-kit="report-run">
                {uxBusy ? (
                  <>
                    <Spinner /> Running both
                  </>
                ) : (
                  'Run both live'
                )}
              </Button>
            }
          />
          <StatGrid columns={4} className={styles.reportStats}>
            <StatTile tone="accent" label="Improved: outcome checks" value={`${clearStats.passed}/${clearStats.checks.length || 7}`} note={`${clearStats.steps} tool calls, ${clearStats.errors} errors`} />
            <StatTile label="Vague: outcome checks" value={`${vagueStats.passed}/${vagueStats.checks.length || 7}`} note={`${vagueStats.steps} tool calls, ${vagueStats.errors} errors`} />
            <StatTile label="Errors avoided" value={Math.max(0, vagueStats.errors - clearStats.errors)} note="by the wording alone" />
            <StatTile
              label="Tokens per finished task"
              value={clearStats.passed === clearStats.checks.length ? `${(clearStats.tokens / 1000).toFixed(1)}k` : '–'}
              note={vagueStats.passed === vagueStats.checks.length ? `vague: ${(vagueStats.tokens / 1000).toFixed(1)}k` : `vague spent ${(vagueStats.tokens / 1000).toFixed(1)}k and did not finish`}
            />
          </StatGrid>
          <div className={styles.reportGrid}>
            <Card className={styles.reportCard} data-kit="report-compare">
              <CardHead
                aside={
                  <Pill tone={ux.kind === 'example' ? 'neutral' : 'live'}>{ux.kind === 'example' ? EXAMPLE_LABEL : uxBusy ? 'Live, running' : 'Live runs'}</Pill>
                }
              >
                <CardTitle>Vague against improved</CardTitle>
              </CardHead>
              <UxCompare vague={ux.vague} clear={ux.clear} />
              <OutcomeTable vague={ux.vague} clear={ux.clear} />
              {uxNotice && (
                <Notice size="s" className={styles.notice} role="status">
                  {uxNotice}
                </Notice>
              )}
            </Card>
            <Card className={styles.reportCard} data-kit="report-stumbles">
              <CardHead aside={<span className={styles.muted}>{vagueStats.stumbles.length} errors</span>}>
                <CardTitle>Where the vague run stumbled</CardTitle>
              </CardHead>
              <Stumbles run={ux.vague} />
            </Card>
          </div>
          <div className={styles.diffGrid}>
            <DescriptionDiff name="create_template" />
            <DescriptionDiff name="schedule_broadcast" />
          </div>
        </section>

        <ToolsSection />

        <section id="how" className={styles.section} aria-labelledby="how-heading">
          <SectionHead titleId="how-heading" title="How it works" flush />
          <NoteGrid className={styles.notes} items={NOTES} />
        </section>
      </div>
    </DemoLayout>
  );
}

function countFixes(run) {
  const template = finalTemplate(run);
  if (!template) return 0;
  const lints = Object.entries(run.world.lints)
    .filter(([key]) => key.startsWith(`${template.id}@`))
    .sort(([a], [b]) => Number(a.split('@')[1]) - Number(b.split('@')[1]))
    .map(([, lint]) => lint);
  if (lints.length < 2) return 0;
  const last = lints[lints.length - 1];
  return last.checks.filter(check => check.status === 'pass' && lints.slice(0, -1).some(lint => lint.checks.some(c => c.id === check.id && (c.status === 'fail' || c.status === 'warn')))).length;
}

function KeyLine({ label, value, mono }) {
  return (
    <div className={styles.keyLine}>
      <span>{label}</span>
      <b data-mono={mono || undefined}>{value}</b>
    </div>
  );
}

function Glance({ run, status, stats, fixes, approval }) {
  const broadcast = run.world?.broadcasts?.[run.world.broadcasts.length - 1];
  const tested = run.world?.outbox?.length || 0;
  return (
    <Card tone="accent" className={styles.glance} data-kit="glance">
      <span className={styles.glanceStatus}>
        {status === 'replaying' || status === 'running' ? 'The agent is working' : broadcast ? (approval.status === 'approved' ? 'Approved: scheduled in the sandbox' : 'Waiting for your approval') : 'Ready'}
      </span>
      <div className={styles.glanceNums}>
        <div>
          <b>{stats.steps}</b>
          <span>tool calls</span>
        </div>
        <div>
          <b>{fixes}</b>
          <span>lint fixes</span>
        </div>
        <div>
          <b>{tested}</b>
          <span>sandbox tests</span>
        </div>
      </div>
      <p className={styles.glanceNote}>{broadcast ? `${broadcast.recipients.toLocaleString('en-US')} beta users · ${broadcast.send_at_local}` : 'One sentence in, a reviewed broadcast out.'}</p>
    </Card>
  );
}

// ---- call the tools yourself ----------------------------------------------------------------

const DEMO_NAME = 'dashboard-launch';
const DEMO_ID = `tpl_${shortHash(DEMO_NAME)}`;
const PANEL_EXAMPLES = {
  list_audiences: {},
  create_template: {
    name: DEMO_NAME,
    subject: 'Your new Lumen dashboard is ready',
    kind: 'marketing',
    body: [
      { type: 'Heading', text: 'Hi {{{FIRST_NAME|there}}}, the new dashboard is here' },
      { type: 'Button', text: 'Open your dashboard', href: 'https://app.lumen-labs.dev/dashboard' },
    ],
  },
  render_preview: { template_id: DEMO_ID },
  lint_email: { template_id: DEMO_ID },
  send_test: { template_id: DEMO_ID, to: 'team@lumen-labs.dev' },
  schedule_broadcast: { template_id: DEMO_ID, audience_id: 'aud_beta', send_at: '2026-11-22T09:00:00-05:00' },
};
const WORDINGS = [
  { value: 'clear', label: 'Improved descriptions' },
  { value: 'vague', label: 'Vague descriptions' },
];

function ToolsSection() {
  const [wording, setWording] = useState('clear');
  const [version, setVersion] = useState(0);
  const world = useRef(null);
  const tools = useMemo(() => TOOL_SETS[wording].map(({ name, title, description, inputSchema, annotations }) => ({ name, title, description, inputSchema, ...(annotations && { annotations }) })), [wording]);
  const call = useMemo(
    () => (name, args) => {
      if (!world.current) world.current = newWorld(Date.now());
      const out = callTool(world.current, name, args, wording);
      world.current = out.world;
      if (out.isError) throw new Error(out.result.error);
      return out.result;
    },
    [wording]
  );
  return (
    <section id="tools" className={styles.section} aria-labelledby="tools-heading">
      <SectionHead
        variant="eyebrow"
        kicker="Tools"
        titleId="tools-heading"
        title="Call the tool server yourself"
        lede="The six tools the agent sees (tools/list) in either wording. Create a template, lint it, try send_test before fixing it: the server answers exactly as it answers the agent. Free, in your browser, on a fresh sandbox."
      />
      <Card tone="inset" className={styles.toolBar}>
        <SegmentedControl label="Tool wording" options={WORDINGS} value={wording} onChange={setWording} />
        <Button
          variant="ghost"
          size="s"
          onClick={() => {
            world.current = null;
            setVersion(value => value + 1);
          }}
        >
          <FiRotateCcw aria-hidden /> Reset the sandbox
        </Button>
      </Card>
      <McpToolPanel
        key={`${wording}-${version}`}
        tools={tools}
        examples={PANEL_EXAMPLES}
        call={call}
        initialTool="create_template"
        hint="Free: runs in your browser on a sandbox; nothing is sent"
        argsId="resend-tool-args"
      />
    </section>
  );
}

const NOTES = [
  {
    title: 'The model writes, code decides',
    text: 'The LLM picks the tools and writes the copy. Rendering, the plain-text check, the nine lint rules, the time-zone math and every gate are code over the template tree, the same module on the server and in this page.',
  },
  {
    title: 'Descriptions are the interface',
    text: 'The improved wording says when to call a tool, what comes next and what the server will refuse, and its errors name the fix. The vague set has the same server underneath, so the report measures wording alone.',
  },
  {
    title: 'Unsafe is not the default',
    text: 'schedule_broadcast is a dry run unless the agent says otherwise, refuses an unlinted version, needs an idempotency key, and only queues: a person approves. send_test only reaches the team’s test inbox.',
  },
  {
    title: 'Recorded, then recomputed',
    text: 'Preview mode replays real runs recorded through the live route. The page recomputes every tool result from the recorded calls, so the preview, lint and outbox you see are the code’s, not a screenshot.',
  },
];

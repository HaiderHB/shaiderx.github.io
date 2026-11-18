// Presentational pieces of the Superhuman demo page, built from the shared kit (demos/ui).
// State lives in index.page.js; these take a run (agent.js applyEvent) and callbacks.
import {
  ApprovalCard,
  BadgeMeta,
  BadgeRow,
  Button,
  Card,
  CardHead,
  CardTitle,
  Chip,
  EmptyState,
  EvalTable,
  IndexBadge,
  MarkdownLite,
  McpCallLog,
  Meter,
  MiniLabel,
  Notice,
  Pill,
  RunStatus,
  ScoreBadge,
  SegmentedControl,
  Spinner,
  StatGrid,
  StatTile,
  StatusIcon,
  Tag,
  TextArea,
  formatMs,
  srOnly,
} from 'demos/ui';
import {
  FiCheck,
  FiChevronDown,
  FiClock,
  FiEdit3,
  FiLock,
  FiRotateCcw,
  FiSend,
  FiShield,
} from 'react-icons/fi';
import { JUDGE_PASS, JUDGE_QUESTIONS, MAX_TASK, PRESETS } from './agent';
import { NOW_LABEL, THREADS, USER, listDate, threadById } from './inbox';
import { GRANTS, GRANT_IDS, TOOLS, pendingApprovals } from './mcp';
import styles from './Superhuman.module.css';

const pctText = value => `${Math.round(Number(value) * 100)}%`;
const toneFor = value => (value >= JUDGE_PASS ? 'ok' : value >= 0.4 ? 'warn' : 'bad');
const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

/** The thread a call touched: its thread_id, or the draft's / approval's thread. */
export function threadOfCall(call, world) {
  if (!call) return null;
  if (call.args?.thread_id) return String(call.args.thread_id);
  const approval = call.result?.approval_id && world.approvals[call.result.approval_id];
  if (approval) return approval.thread_id;
  const draft = call.args?.draft_id && world.drafts[call.args.draft_id];
  return draft?.thread_id || null;
}

/** Calls as the log shows them: blocked ones carry the server's reason; sends show the person's decision. */
export function logCalls(run) {
  return run.calls.map(call => {
    if (call.status === 'blocked' || call.status === 'error') {
      return { ...call, note: call.result?.error };
    }
    if (call.name === 'send' && call.status === 'awaiting') {
      const decided = run.world.approvals[call.result?.approval_id]?.status;
      if (decided === 'approved' || decided === 'rejected')
        return { ...call, status: decided };
    }
    return call;
  });
}

export function runCounts(run) {
  const calls = run.calls;
  return {
    calls: calls.length,
    allowed: calls.filter(c => c.status === 'allowed').length,
    blocked: calls.filter(c => c.status === 'blocked').length,
    waiting: pendingApprovals(run.world).length,
    drafts: Object.keys(run.world.drafts).length,
    sent: run.world.sent.length,
    turns: run.turns.length,
  };
}

// --- hero: the run at a glance ------------------------------------------------------------

export function RunGlance({ run, replay }) {
  const counts = runCounts(run);
  const running = run.status === 'running';
  const recent = logCalls(run).slice(-3);
  let headline = 'Ready';
  if (running) headline = run.calls.length ? 'Working the inbox' : 'Reading the task';
  else if (run.status === 'done')
    headline = counts.waiting
      ? `${plural(counts.waiting, 'send')} waiting for you`
      : 'Done';
  else if (run.status === 'error') headline = 'Stopped';
  return (
    <Card tone="accent" className={styles.glance} aria-live="polite">
      <div className={styles.glanceTop}>
        <span className={styles.glanceKind}>
          {run.kind === 'live' ? 'Live run' : 'Example run'}
        </span>
        <span className={styles.glanceTurn}>
          {run.turns.length ? `turn ${run.turns.length}` : ''}
        </span>
      </div>
      <strong
        className={styles.glanceHeadline}
        data-tone={counts.waiting ? 'warn' : running ? 'live' : 'ok'}
      >
        {headline}
      </strong>
      <p className={styles.glanceTask}>
        “{run.task || PRESETS[0].task}” <span>· {GRANTS[run.grant]?.label}</span>
      </p>
      <dl className={styles.glanceStats}>
        <div>
          <dt>Tool calls</dt>
          <dd>{counts.calls}</dd>
        </div>
        <div>
          <dt>Blocked</dt>
          <dd>{counts.blocked}</dd>
        </div>
        <div>
          <dt>Drafts</dt>
          <dd>{counts.drafts}</dd>
        </div>
        <div>
          <dt>Waiting for you</dt>
          <dd>{counts.waiting}</dd>
        </div>
      </dl>
      <ol className={styles.glanceCalls} aria-label="Latest tool calls">
        {recent.length ? (
          recent.map(call => (
            <li key={call.id} data-status={call.status}>
              <code>{call.name}</code>
              <span className={styles.glanceArg}>{callTarget(call)}</span>
              <span className={styles.glanceStatus}>
                {STATUS_TEXT[call.status] || call.status}
              </span>
            </li>
          ))
        ) : (
          <li data-status="idle">
            {running ? 'Waiting for the model…' : 'No tool calls yet'}
          </li>
        )}
      </ol>
      {/* the row keeps its height when the button is hidden, so the page below never jumps */}
      <div className={styles.glanceCtaRow}>
        {counts.waiting > 0 && run.status === 'done' && (
          <Button size="s" onClick={() => scrollToId('gate')}>
            <FiShield aria-hidden />{' '}
            {counts.waiting === 1
              ? 'Review the send'
              : `Review the ${counts.waiting} sends`}
          </Button>
        )}
      </div>
      {replay && <p className={styles.glanceFoot}>{replay}</p>}
    </Card>
  );
}

const STATUS_TEXT = { awaiting: 'awaiting approval' };

/** The short target of a call for the glance: a thread id, a draft id or a query. */
function callTarget(call) {
  const args = call.args || {};
  if (args.thread_id) return args.thread_id;
  if (args.draft_id) return args.draft_id;
  if (args.query) return `“${String(args.query).slice(0, 24)}”`;
  if (args.label) return args.label;
  return '';
}

function scrollToId(id) {
  const node = document.getElementById(id);
  if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// --- task: permission level, preset tasks, free text -------------------------------------

const GRANT_OPTIONS = GRANT_IDS.map(id => ({ value: id, label: GRANTS[id].label }));

export function TaskCard({
  grant,
  onGrant,
  task,
  onTask,
  presetId,
  onPreset,
  onRun,
  busy,
  hasKey,
  notice,
}) {
  const scopes = GRANTS[grant].scopes;
  return (
    <Card as="form" className={styles.taskCard} onSubmit={onRun}>
      <div className={styles.taskGrant}>
        <CardHead>
          <CardTitle size="s">Permission</CardTitle>
          <span className={styles.muted}>enforced by the server</span>
        </CardHead>
        <SegmentedControl
          className={styles.grantControl}
          label="Permission level"
          options={GRANT_OPTIONS}
          value={grant}
          onChange={onGrant}
          disabled={busy}
        />
        <ul className={styles.scopeList} aria-label="What this grant allows">
          {['read', 'draft', 'act'].map(scope => {
            const on = scopes.includes(scope);
            const names = TOOLS.filter(tool => tool.scope === scope).map(
              tool => tool.name
            );
            return (
              <li key={scope} data-on={on ? '' : undefined}>
                <span className={styles.scopeMark} aria-hidden>
                  {on ? <FiCheck /> : <FiLock />}
                </span>
                <span className={styles.scopeName}>{scope}</span>
                <span className={styles.scopeTools}>
                  {names.map(name => (
                    <code key={name}>
                      {name}
                      {name === 'send' && on ? ' (asks you)' : ''}
                    </code>
                  ))}
                </span>
                <span className={srOnly}>{on ? 'allowed' : 'blocked'}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className={styles.taskText}>
        <CardHead>
          <CardTitle size="s">Task</CardTitle>
          <span
            className={styles.muted}
          >{`${USER.name}'s sample inbox · ${NOW_LABEL}`}</span>
        </CardHead>
        <div className={styles.presets} role="group" aria-label="Example tasks">
          {PRESETS.map(preset => (
            <Chip
              key={preset.id}
              type="button"
              aria-pressed={presetId === preset.id}
              onClick={() => onPreset(preset.id)}
              disabled={busy}
            >
              {preset.label}
            </Chip>
          ))}
        </div>
        <label className={srOnly} htmlFor="agent-task">
          Task for the agent
        </label>
        <TextArea
          id="agent-task"
          className={styles.taskInput}
          value={task}
          rows={2}
          maxLength={MAX_TASK}
          onChange={event => onTask(event.target.value)}
        />
        <div className={styles.runRow}>
          <Button type="submit" disabled={busy || !task.trim()}>
            {busy ? (
              <>
                <Spinner /> Running
              </>
            ) : (
              'Run the agent'
            )}
          </Button>
          <span className={styles.muted}>
            {hasKey
              ? 'Live: DeepSeek V3.2 calls the tools. A run takes about a minute, about 3 cents'
              : 'Preview: the example tasks replay recorded live runs'}
          </span>
        </div>
        {notice && (
          <Notice size="s" className={styles.notice} role="status">
            {notice}
          </Notice>
        )}
      </div>
    </Card>
  );
}

// --- the tool calls -----------------------------------------------------------------------

export function CallsCard({ run, active, onReplay }) {
  const counts = runCounts(run);
  const waitingTurn =
    run.status === 'running' && run.turns[run.turns.length - 1]?.status === 'running';
  return (
    <Card className={styles.callsCard}>
      <CardHead
        aside={
          run.kind === 'live' ? (
            <Pill tone="live">{run.cached ? 'Live · cached replay' : 'Live'}</Pill>
          ) : (
            <span className={styles.callsAside}>
              <Pill>Example run</Pill>
              {onReplay && (
                <Button
                  variant="ghost"
                  size="s"
                  onClick={onReplay}
                  disabled={run.status === 'running'}
                >
                  <FiRotateCcw aria-hidden /> Replay
                </Button>
              )}
            </span>
          )
        }
      >
        <CardTitle>MCP tool calls</CardTitle>
      </CardHead>
      <div className={styles.callTotals}>
        <span>
          <strong>{counts.allowed}</strong> allowed
        </span>
        <span data-tone="bad">
          <strong>{counts.blocked}</strong> blocked
        </span>
        <span data-tone="warn">
          <strong>
            {run.calls.filter(c => c.name === 'send' && c.status === 'awaiting').length}
          </strong>{' '}
          awaiting approval
        </span>
        <span className={styles.callTurns}>
          {plural(counts.turns, 'model turn')}
          {run.status === 'done' && run.ms ? ` · ${formatMs(run.ms)}` : ''}
        </span>
      </div>
      <McpCallLog
        className={styles.callLog}
        calls={logCalls(run)}
        pending={waitingTurn}
        pendingLabel={
          run.calls.length
            ? 'The model is choosing its next tools…'
            : 'The model is reading the task…'
        }
        empty="Run a task to see each tools/call: its arguments, scope, what the gate decided and the result."
        active={active}
      />
    </Card>
  );
}

// --- approval gate ------------------------------------------------------------------------

export function GateCard({ run, onApprove, onReject }) {
  const approvals = Object.values(run.world.approvals);
  const order = { pending: 0, approved: 1, rejected: 2 };
  approvals.sort((a, b) => order[a.status] - order[b.status]);
  const done = run.status !== 'running';
  return (
    <Card id="gate" className={styles.gateCard}>
      <CardHead aside={<FiShield className={styles.gateIcon} aria-hidden />}>
        <CardTitle>Approval gate</CardTitle>
      </CardHead>
      {approvals.length ? (
        <div className={styles.approvals}>
          {approvals.map(approval => {
            const draft = run.world.drafts[approval.draft_id];
            const sent = run.world.sent.find(
              item => item.approval_id === approval.approval_id
            );
            const body = draft?.body || sent?.body || '';
            const judged = run.judges[approval.draft_id];
            return (
              <ApprovalCard
                key={approval.approval_id}
                status={approval.status}
                statusText={{
                  pending: 'Send waiting for your approval',
                  approved: 'Approved · sent (sample inbox only)',
                  rejected: 'Rejected · kept as a draft',
                }}
                title={approval.subject}
                meta={[
                  ['To', approval.to],
                  ['Draft', `${approval.draft_id} · thread ${approval.thread_id}`],
                ]}
                body={body}
                onApprove={done ? () => onApprove(approval.approval_id) : undefined}
                onReject={done ? () => onReject(approval.approval_id) : undefined}
                approveLabel="Approve and send"
                rejectLabel="Reject"
              >
                {judged && <JudgeBadges answers={judged} />}
              </ApprovalCard>
            );
          })}
        </div>
      ) : (
        <EmptyState size="s">
          Sends stop here. The agent can draft and ask to send; only you can approve.
        </EmptyState>
      )}
    </Card>
  );
}

export function JudgeBadges({ answers, ms }) {
  const ids = Object.keys(answers || {}).filter(id => JUDGE_QUESTIONS[id]);
  if (!ids.length) return null;
  return (
    <BadgeRow className={styles.judgeRow}>
      {ids.map(id => {
        const value = Number(answers[id].noul);
        return (
          <ScoreBadge
            key={id}
            label={JUDGE_QUESTIONS[id].label}
            value={pctText(value)}
            tone={toneFor(value)}
            title={JUDGE_QUESTIONS[id].criteria.true}
          />
        );
      })}
      <BadgeMeta>judge{ms ? ` · ${formatMs(ms)}` : ''}</BadgeMeta>
    </BadgeRow>
  );
}

// --- the agent's summary and the judge's scores --------------------------------------------

export function SummaryCard({ run }) {
  const drafts = Object.values(run.world.drafts);
  const sent = run.world.sent;
  const replies = [
    ...drafts.map(d => ({
      key: d.draft_id,
      thread: d.thread_id,
      subject: d.subject,
      kind: 'Draft',
    })),
    ...sent.map(s => ({
      key: s.approval_id,
      thread: s.thread_id,
      subject: s.subject,
      kind: 'Sent',
    })),
  ];
  const running = run.status === 'running';
  return (
    <Card className={styles.summaryCard} aria-live="polite">
      <CardHead
        aside={run.model ? <Pill>{run.model.replace(/^deepseek\//, '')}</Pill> : null}
      >
        <CardTitle>The agent&rsquo;s report</CardTitle>
      </CardHead>
      {run.final ? (
        <MarkdownLite className={styles.final} text={run.final} />
      ) : (
        <EmptyState size="s" loading={running}>
          {running ? 'Working…' : 'The agent reports here when it finishes.'}
        </EmptyState>
      )}
      {run.error && (
        <Notice kind="error" size="s" className={styles.notice} role="alert">
          {run.error}
        </Notice>
      )}
      {replies.length > 0 && (
        <div className={styles.replies}>
          <MiniLabel>Judge on each reply</MiniLabel>
          <ul>
            {replies.map(reply => (
              <li key={reply.key}>
                <span className={styles.replyHead}>
                  <Tag soft>{reply.kind}</Tag>
                  <span className={styles.replySubject}>{reply.subject}</span>
                </span>
                {run.judges[reply.key] ? (
                  <JudgeBadges
                    answers={run.judges[reply.key]}
                    ms={run.judgeMs[reply.key]}
                  />
                ) : (
                  <span className={styles.muted}>
                    {running || run.status === 'done' ? 'Judging…' : ''}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

// --- the sample inbox ---------------------------------------------------------------------

function threadChips(id, world, calls) {
  const state = world.threads[id];
  const chips = state.labels.map(label => ({
    key: `l-${label}`,
    text: label,
    tone:
      label === 'Urgent' || label === 'Suspicious'
        ? 'bad'
        : label === 'Needs reply'
        ? 'warn'
        : 'soft',
  }));
  const approval = Object.values(world.approvals).find(
    a => a.thread_id === id && a.status === 'pending'
  );
  if (approval)
    chips.push({ key: 'wait', text: 'Send waiting', tone: 'warn', icon: <FiSend /> });
  else if (state.draftId)
    chips.push({ key: 'draft', text: 'Draft', tone: 'accent', icon: <FiEdit3 /> });
  if (state.sent.length)
    chips.push({ key: 'sent', text: 'Sent', tone: 'ok', icon: <FiCheck /> });
  if (state.snoozedUntil) {
    const day = new Date(`${state.snoozedUntil}:00-08:00`).toLocaleDateString('en-US', {
      weekday: 'short',
      timeZone: 'America/Los_Angeles',
    });
    chips.push({
      key: 'snooze',
      text: `Snoozed to ${day}`,
      tone: 'soft',
      icon: <FiClock />,
    });
  }
  if (state.archived) chips.push({ key: 'arch', text: 'Archived', tone: 'soft' });
  const blocked = [
    ...new Set(
      calls
        .filter(c => c.status === 'blocked' && c.args?.thread_id === id)
        .map(c => c.name)
    ),
  ];
  blocked.forEach(name =>
    chips.push({
      key: `b-${name}`,
      text: `${name} blocked`,
      tone: 'bad',
      icon: <FiLock />,
    })
  );
  return chips;
}

export function InboxCard({ run, activeThread, openThread, onOpen }) {
  const world = run.world;
  const inbox = THREADS.filter(
    t => !world.threads[t.id].archived && !world.threads[t.id].snoozedUntil
  ).length;
  return (
    <Card className={styles.inboxCard}>
      <CardHead aside={<span className={styles.muted}>{inbox} in inbox</span>}>
        <CardTitle>Sample inbox</CardTitle>
      </CardHead>
      <p className={styles.inboxLede}>
        {USER.name}, {USER.role}, {USER.company}. 20 made-up threads; nothing leaves this
        page.
      </p>
      <ul className={styles.threads}>
        {THREADS.map(thread => {
          const state = world.threads[thread.id];
          const chips = threadChips(thread.id, world, run.calls);
          const open = openThread === thread.id;
          return (
            <li
              key={thread.id}
              className={styles.thread}
              data-active={activeThread === thread.id ? '' : undefined}
              data-gone={state.archived || state.snoozedUntil ? '' : undefined}
              data-unread={thread.unread ? '' : undefined}
            >
              <button
                type="button"
                className={styles.threadButton}
                aria-expanded={open}
                onClick={() => onOpen(open ? null : thread.id)}
              >
                <span className={styles.threadTop}>
                  <span className={styles.threadFrom}>{thread.from.name}</span>
                  <span className={styles.threadId}>{thread.id}</span>
                  <span className={styles.threadDate}>
                    {listDate(thread.messages[thread.messages.length - 1].date)}
                  </span>
                </span>
                <span className={styles.threadSubject}>{thread.subject}</span>
                {chips.length > 0 && (
                  <span className={styles.threadChips}>
                    {chips.map(chip => (
                      <span key={chip.key} className={styles.chip} data-tone={chip.tone}>
                        {chip.icon}
                        {chip.text}
                      </span>
                    ))}
                  </span>
                )}
              </button>
              {open && <ThreadPreview id={thread.id} world={world} />}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function ThreadPreview({ id, world }) {
  const thread = threadById(id);
  const state = world.threads[id];
  const draft = state.draftId && world.drafts[state.draftId];
  return (
    <div className={styles.preview}>
      {thread.messages.map((message, index) => (
        <div key={index} className={styles.message}>
          <MiniLabel>
            {message.from.replace(/ <.*>/, '')} · {listDate(message.date)}
          </MiniLabel>
          <p>{message.body}</p>
        </div>
      ))}
      {state.sent.map(item => (
        <div key={item.approval_id} className={styles.message} data-kind="sent">
          <MiniLabel>Sent by you after approval</MiniLabel>
          <p>{item.body}</p>
        </div>
      ))}
      {draft && (
        <div className={styles.message} data-kind="draft">
          <MiniLabel>Draft {draft.draft_id} by the agent</MiniLabel>
          <p>{draft.body}</p>
        </div>
      )}
    </div>
  );
}

// --- evals --------------------------------------------------------------------------------

export function EvalSummary({ scored, total }) {
  const done = scored.filter(Boolean);
  const passed = done.filter(s => s.score.pass).length;
  const checks = done.reduce((sum, s) => sum + s.score.passed, 0);
  const checksTotal = done.reduce((sum, s) => sum + s.score.total, 0);
  const outOfScope = done.reduce((sum, s) => sum + s.outOfScope, 0);
  const refused = done.reduce((sum, s) => sum + s.blocked, 0);
  const unapproved = done.reduce((sum, s) => sum + s.unapproved, 0);
  const held = done.reduce((sum, s) => sum + s.held, 0);
  const grounded = done.flatMap(s => s.grounded);
  const avg = grounded.length
    ? grounded.reduce((a, b) => a + b, 0) / grounded.length
    : null;
  return (
    <StatGrid columns={2} className={styles.evalStats}>
      <StatTile
        tone="accent"
        label="Tasks passed"
        value={done.length ? passed : '–'}
        unit={`/ ${total}`}
        note={done.length ? `${checks} of ${checksTotal} checks` : 'not run yet'}
      >
        <Meter
          value={done.length ? passed / total : 0}
          segments={total}
          size="s"
          label="Tasks passed"
        />
      </StatTile>
      <StatTile
        label="Out-of-scope calls that ran"
        value={done.length ? outOfScope : '–'}
        note={`${plural(refused, 'call')} refused by the gate`}
      />
      <StatTile
        label="Sent without approval"
        value={done.length ? unapproved : '–'}
        note={`${plural(held, 'send')} held for approval`}
      />
      <StatTile
        label="Judge: replies grounded in the thread"
        value={avg == null ? '–' : Math.round(avg * 100)}
        unit={avg == null ? null : '% avg'}
        note={
          grounded.length
            ? `lowest ${pctText(Math.min(...grounded))}, pass at ${pctText(JUDGE_PASS)}`
            : 'no replies judged yet'
        }
      />
    </StatGrid>
  );
}

/** What the run caught: every failed check, by task. */
export function EvalFailures({ tasks, entries }) {
  const failed = tasks
    .map((task, index) => ({
      task,
      index,
      rows: entries[task.id]?.score?.rows.filter(row => row.pass === false) || [],
    }))
    .filter(item => item.rows.length);
  if (!failed.length) return null;
  return (
    <div className={styles.evalCaught}>
      <MiniLabel>What it caught</MiniLabel>
      <ul>
        {failed.map(({ task, index, rows }) => (
          <li key={task.id}>
            <StatusIcon variant="solid" status="fail" />
            <span>
              <strong>
                {index + 1}. {task.title}:
              </strong>{' '}
              {rows
                .map(row => `${row.label.replace(/^Judge: /, 'judge, ')} (${row.actual})`)
                .join('; ')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EvalRow({ index, task, entry, open, onToggle }) {
  const score = entry?.score;
  const status = entry?.status;
  const running = status === 'running';
  const judged = entry?.run?.judges || {};
  return (
    <li className={styles.evalItem} data-pass={score ? String(score.pass) : undefined}>
      <button
        type="button"
        className={styles.evalHead}
        aria-expanded={open}
        onClick={onToggle}
      >
        <IndexBadge>{index + 1}</IndexBadge>
        <span className={styles.evalTitle}>
          <strong>{task.title}</strong>
          <span>“{task.task}”</span>
        </span>
        <Pill className={styles.evalGrant}>{GRANTS[task.grant].short}</Pill>
        <span className={styles.evalScore}>
          {running ? (
            <Spinner />
          ) : score ? (
            <>
              <StatusIcon variant="solid" status={score.pass ? 'pass' : 'fail'} />
              {score.passed}/{score.total}
            </>
          ) : (
            <span className={styles.muted}>not run</span>
          )}
        </span>
        <FiChevronDown className={styles.evalChevron} aria-hidden />
      </button>
      {open && (
        <div className={styles.evalBody}>
          <p className={styles.evalExpect}>
            <strong>Expected:</strong> {task.expect}
          </p>
          {score ? (
            <>
              <EvalTable rows={score.rows} />
              {Object.keys(judged).length > 0 && (
                <div className={styles.evalJudges}>
                  {Object.entries(judged).map(([key, answers]) => (
                    <div key={key} className={styles.evalJudge}>
                      <MiniLabel>
                        {key === 'final'
                          ? "Judge on the agent's report"
                          : `Judge on draft ${key}`}
                      </MiniLabel>
                      <JudgeBadges answers={answers} ms={entry.run.judgeMs[key]} />
                    </div>
                  ))}
                </div>
              )}
              <details className={styles.evalTrace}>
                <summary>
                  Trace: {plural(entry.run.calls.length, 'tool call')},{' '}
                  {plural(entry.run.turns.length, 'turn')}, and the report
                </summary>
                <McpCallLog
                  className={styles.evalLog}
                  calls={logCalls(entry.run)}
                  follow={false}
                />
                {entry.run.final && (
                  <MarkdownLite className={styles.final} text={entry.run.final} />
                )}
              </details>
            </>
          ) : (
            <EmptyState size="s" loading={running}>
              {running ? 'Running this task…' : 'Not run yet.'}
            </EmptyState>
          )}
        </div>
      )}
    </li>
  );
}

export function EvalRunLine({ evals, meta }) {
  if (evals.kind === 'live') {
    const running = evals.status === 'running';
    return (
      <RunStatus state={running ? 'live' : 'ended'}>
        {running ? 'Live eval run in progress' : 'Live eval run'} · DeepSeek V3.2 agent,
        Jev judge
      </RunStatus>
    );
  }
  return (
    <RunStatus state="example">
      Recorded eval run{meta?.recorded ? ` · ${meta.recorded}` : ''} · live calls on the
      deployed preview, replayed here
    </RunStatus>
  );
}

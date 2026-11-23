// Presentational cards for the CoinTracker demo page. State lives in index.page.js.
import {
  ApprovalCard,
  AuditTrail,
  Button,
  Card,
  CardHead,
  CardTitle,
  CheckList,
  Chip,
  EmptyState,
  Input,
  JsonDetails,
  KeyValues,
  MarkdownLite,
  Meter,
  MiniLabel,
  Notice,
  OptionList,
  Pill,
  ProbabilityBars,
  RequestLog,
  SegmentedControl,
  Spinner,
  Tabs,
  Tag,
  Timeline,
  TimelineStep,
  TypingDots,
  formatMs,
  pct,
  srOnly,
} from 'demos/ui';
import { FiCheck, FiCornerDownRight, FiEdit2, FiLock, FiPlay, FiRotateCw, FiShield, FiUpload } from 'react-icons/fi';
import { CHECKLIST, DOCUMENTS, EDITABLE, LIMITS } from './data';
import { KIND_LABEL, ROUTE_LABEL, STEPS, codeEstimate, maxPerPaycheck, money } from './agent';
import styles from './Cointracker.module.css';

export const shortKey = key => (key ? `${key.slice(0, 22)}…` : '');

const STATUS_WORD = {
  ran: { text: 'Ran automatically', tone: 'ok' },
  pending: { text: 'Waiting', tone: 'warn' },
  approved: { text: 'Approved', tone: 'ok' },
  executing: { text: 'Sending', tone: 'warn' },
  done: { text: 'Done, verified', tone: 'ok' },
  rejected: { text: 'Rejected', tone: 'neutral' },
};

/** One line with the numbers that matter for an action (code's numbers, not the LLM's prose). */
export function headline(action, figures) {
  if (action.type === 'request_documents') {
    return `${action.documents.length} documents: ${action.documents.map(id => CHECKLIST.find(item => item.id === id)?.label.replace(/ from .*| for .*/, '') || id).join(', ')}`;
  }
  if (action.type === 'harvest_loss') return `${action.quantity} SOL · ${money(action.loss)} loss · about ${money(codeEstimate(action, figures))} less tax`;
  if (action.type === 'raise_401k') return `${money(action.perPaycheck)} a paycheck × ${action.paychecks} · about ${money(codeEstimate(action, figures))} less tax`;
  if (action.type === 'cpa_review') return `${money(action.amount)} roof: repair or improvement?`;
  return '';
}

/** The tradeoff in code's words, for an edited action (the LLM's sentence would carry old numbers). */
function codeTradeoff(action, figures) {
  if (action.type === 'harvest_loss') return `Locks in a ${money(action.loss)} loss; they hold ${action.quantity} fewer SOL until they rebuy.`;
  if (action.type === 'raise_401k') return `Take-home pay drops by about ${money((action.perPaycheck - figures.w2.k401PerPaycheck) * action.paychecks)} before tax over ${action.paychecks} paychecks.`;
  return '';
}

// --- the filing-progress strip (hero aside) ----------------------------------------------------------

export function ProgressStrip({ docs, approved, cpa, status }) {
  const tiles = [
    { id: 'docs', label: 'Documents', have: docs.have, total: docs.total },
    { id: 'actions', label: 'Actions approved', have: approved.have, total: approved.total },
    { id: 'cpa', label: 'CPA review', have: cpa.have, total: cpa.total },
  ];
  return (
    <Card className={styles.progress} data-focus="progress" aria-label="Filing progress">
      <div className={styles.progressHead}>
        <span className={styles.progressTitle}>2026 tax file · the Reyes household</span>
        <span className={styles.progressStatus} data-tone={status.tone} data-focus="progressStatus">
          {status.text}
        </span>
      </div>
      <div className={styles.progressTiles}>
        {tiles.map(tile => (
          <div key={tile.id} className={styles.progressTile} data-focus={`progress-${tile.id}`}>
            <span className={styles.progressLabel}>{tile.label}</span>
            <span className={styles.progressValue}>
              {tile.total ? tile.have : '–'}
              <span>/{tile.total || '–'}</span>
            </span>
            <Meter value={tile.total ? tile.have / tile.total : 0} segments={Math.max(1, tile.total || 4)} size="s" tone="ink" label={`${tile.label}: ${tile.have} of ${tile.total}`} />
          </div>
        ))}
      </div>
    </Card>
  );
}

// --- the agent ----------------------------------------------------------------------------------------

export function AgentCard({ run, onRun, running, handoff, exampleNote }) {
  return (
    <Card className={styles.agentCard} data-focus="agent">
      <CardHead aside={run.kind === 'live' ? <Pill tone="live">Live run</Pill> : <Pill>Recorded run</Pill>}>
        <CardTitle>The agent</CardTitle>
      </CardHead>
      <Button type="button" className={styles.runButton} onClick={onRun} disabled={running} data-focus="runButton">
        {running ? (
          <>
            <Spinner /> Preparing the file
          </>
        ) : (
          <>
            <FiPlay aria-hidden /> Prepare my 2026 tax file
          </>
        )}
      </Button>
      <Timeline className={styles.timeline}>
        {STEPS.map((step, index) => {
          const state = run.steps[step.id] || { status: 'pending' };
          const resumed = step.id === 'scheduleB' && handoff.resumed;
          return (
            <TimelineStep
              key={step.id}
              index={index}
              status={state.status}
              title={step.title}
              detail={state.detail || step.tool}
              ms={state.ms != null && state.status === 'done' ? state.ms : undefined}
            >
              {step.id === 'scheduleB' && state.status === 'paused' && (
                <p className={styles.stepNote} data-focus="pausedNote">
                  Waiting on the household for the 1099-INT. Steps 1-5 are saved; the run continues from here, not from the start.
                </p>
              )}
              {resumed && (
                <div className={styles.resumed} data-focus="resumedNote">
                  <Tag tone="ok">Resumed at step {handoff.resumed.resumedAt}</Tag>
                  <span>
                    {handoff.resumed.answer === 'none' ? 'Household said none. ' : `Read the 1099-INT: ${money(handoff.resumed.form?.interest)} interest. `}
                    Nothing before step {handoff.resumed.resumedAt} ran again.
                  </span>
                </div>
              )}
            </TimelineStep>
          );
        })}
      </Timeline>
      {run.error && (
        <Notice kind="error" size="s" className={styles.notice} role="alert">
          {run.error}
        </Notice>
      )}
      {run.kind === 'example' && <p className={styles.small}>{exampleNote}</p>}
    </Card>
  );
}

// --- the proposed actions, sorted by route --------------------------------------------------------------

const ROUTE_ORDER = ['auto', 'household', 'cpa'];
const LANE_NOTE = {
  auto: 'Safe, reversible, no money moves',
  household: 'Money moves: the household decides',
  cpa: 'Judgement calls for the CPA',
};

function routeOptions(action) {
  return [
    {
      value: 'auto',
      label: action.moneyMoves ? (
        <span className={styles.locked}>
          <FiLock aria-hidden /> Auto-run
        </span>
      ) : (
        'Auto-run'
      ),
      tone: 'ok',
    },
    { value: 'household', label: 'Household', tone: 'warn' },
    { value: 'cpa', label: 'CPA', tone: 'accent' },
  ];
}

function GuardLine({ action }) {
  const { final, decision } = action;
  if (final.overruled) {
    return (
      <p className={styles.guard} data-tone="bad" data-focus={`guard-${action.id}`}>
        <FiShield aria-hidden />
        <span>
          <strong>Code overruled the model.</strong> It said auto-run {pct(decision?.probabilities?.auto ?? 0)}; {final.reason.toLowerCase()}.
        </span>
      </p>
    );
  }
  if (action.moneyMoves) {
    return (
      <p className={styles.guard} data-tone="warn" data-focus={`guard-${action.id}`}>
        <FiLock aria-hidden />
        <span>
          <strong>Money moves, so it never auto-runs.</strong> Code enforces this whatever the model says.
        </span>
      </p>
    );
  }
  return (
    <p className={styles.guard} data-focus={`guard-${action.id}`}>
      <FiShield aria-hidden />
      <span>{final.route === 'auto' ? 'Model and code agree: safe to run now.' : 'Model and code agree: a person decides.'}</span>
    </p>
  );
}

export function ActionsBoard({ actions, states, figures, landed, guardTest, onGuardTest }) {
  const lanes = ROUTE_ORDER.map(route => ({ route, items: actions.filter(action => action.final.route === route) }));
  return (
    <Card className={styles.board} data-focus="board" aria-live="polite">
      <CardHead aside={landed ? <span className={styles.muted}>{actions.length} actions, routed</span> : null}>
        <CardTitle>Proposed actions</CardTitle>
      </CardHead>
      {!landed ? (
        <div className={styles.boardEmpty}>
          {ROUTE_ORDER.map(route => (
            <div key={route} className={styles.laneGhost}>
              <span>{ROUTE_LABEL[route]}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.lanes}>
          {lanes.map(lane => (
            <section key={lane.route} className={styles.lane} data-route={lane.route} data-focus={`lane-${lane.route}`} aria-label={ROUTE_LABEL[lane.route]}>
              <div className={styles.laneHead}>
                <span className={styles.laneName}>{ROUTE_LABEL[lane.route]}</span>
                <span className={styles.laneCount}>{lane.items.length}</span>
                <span className={styles.laneNote}>{LANE_NOTE[lane.route]}</span>
              </div>
              {lane.items.map(action => {
                const state = states[action.id] || {};
                const word = STATUS_WORD[state.status] || STATUS_WORD.pending;
                return (
                  <article key={action.id} className={styles.actionRow} data-focus={`action-${action.id}`}>
                    <div className={styles.actionTop}>
                      <Tag soft>{KIND_LABEL[action.type]}</Tag>
                      <Pill tone={word.tone}>{state.status === 'pending' && action.final.route === 'cpa' ? 'Waiting on the CPA' : state.status === 'pending' ? 'Waiting on you' : word.text}</Pill>
                    </div>
                    <h3 className={styles.actionTitle}>{action.title}</h3>
                    <p className={styles.actionNumbers}>{headline(action, figures)}</p>
                    <div className={styles.actionBars} data-focus={`bars-${action.id}`}>
                      <ProbabilityBars options={routeOptions(action)} probabilities={action.decision?.probabilities || {}} choice={action.decision?.choice} pending={!action.decision} />
                    </div>
                    <GuardLine action={action} />
                    {action.type === 'harvest_loss' && (
                      <button type="button" className={styles.linkButton} onClick={() => onGuardTest(action.id)} data-focus="guardTest">
                        {guardTest === action.id ? 'Put the real model answer back' : 'Test the guard: what if the model said auto-run?'}
                      </button>
                    )}
                    {guardTest === action.id && <p className={styles.small}>Simulated model answer (auto-run 88%). Code still sends it to the household.</p>}
                  </article>
                );
              })}
              {!lane.items.length && <p className={styles.laneEmpty}>Nothing here.</p>}
            </section>
          ))}
        </div>
      )}
    </Card>
  );
}

// --- review and approve -----------------------------------------------------------------------------------

function EditRow({ action, figures, state, onDraft, onSave, onCancel }) {
  const harvest = action.type === 'harvest_loss';
  const max = harvest ? figures.crypto.lots.find(lot => lot.lotId === action.lotId)?.quantity ?? 0 : maxPerPaycheck(figures);
  const id = `edit-${action.id}`;
  return (
    <div className={styles.editRow}>
      <label htmlFor={id} className={styles.editLabel}>
        {harvest ? `SOL to sell (up to ${max})` : `401(k) per paycheck (up to ${money(max)} fits the limit)`}
      </label>
      <div className={styles.editControls}>
        <Input id={id} type="number" inputMode="decimal" value={state.draft ?? ''} onChange={event => onDraft(event.target.value)} className={styles.editInput} />
        <Button type="button" size="s" onClick={onSave}>
          Save edit
        </Button>
        <Button type="button" size="s" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      <p className={styles.small}>Code recomputes every dependent number and the idempotency key from your edit.</p>
    </div>
  );
}

export function HouseholdQueue({ actions, states, figures, onApprove, onReject, onEdit, onDraft, onSaveEdit, onCancelEdit, renderExec }) {
  if (!actions.length) return <EmptyState size="m">Nothing waits on the household. Prepare the file first.</EmptyState>;
  return (
    <div className={styles.householdGrid}>
      {actions.map(action => {
        const state = states[action.id] || {};
        const failed = action.checks.filter(check => check.status === 'fail');
        const status = state.status === 'rejected' ? 'rejected' : state.status === 'pending' || !state.status ? 'pending' : 'approved';
        return (
          <div key={action.id} className={styles.queueItem} data-focus={`review-${action.id}`}>
            <ApprovalCard
              className={styles.approval}
              data-focus={`approval-${action.id}`}
              status={status}
              statusText={{
                pending: failed.length ? 'A check failed: fix it before approving' : 'Waiting for the household',
                approved:
                  state.status === 'done'
                    ? `Approved · done, verified ${action.type === 'harvest_loss' ? 'at the broker' : 'in payroll'}`
                    : 'Approved by the household',
                rejected: 'Rejected · nothing was sent',
              }}
              title={action.title}
              meta={action.evidence}
              body={action.why}
              onApprove={() => onApprove(action.id)}
              onReject={() => onReject(action.id)}
              approveLabel={action.type === 'harvest_loss' ? 'Approve the sell order' : 'Approve the change'}
              rejectLabel="Reject"
              approveDisabled={failed.length > 0}
              busy={state.busy}
              extra={
                <Button type="button" size="s" variant="ghost" onClick={() => onEdit(action.id)} disabled={state.busy}>
                  <FiEdit2 aria-hidden /> Edit
                </Button>
              }
            >
              <dl className={styles.numbers} data-focus={`numbers-${action.id}`}>
                {action.type === 'harvest_loss' && (
                  <>
                    <div>
                      <dt>Sell</dt>
                      <dd>
                        {action.quantity} SOL ({action.lotId})
                      </dd>
                    </div>
                    <div>
                      <dt>Loss booked</dt>
                      <dd>{money(action.loss)}</dd>
                    </div>
                    <div>
                      <dt>Tax effect</dt>
                      <dd>about {money(codeEstimate(action, figures))} less</dd>
                    </div>
                  </>
                )}
                {action.type === 'raise_401k' && (
                  <>
                    <div>
                      <dt>Per paycheck</dt>
                      <dd>
                        {money(figures.w2.k401PerPaycheck)} → {money(action.perPaycheck)}
                      </dd>
                    </div>
                    <div>
                      <dt>Year total</dt>
                      <dd>
                        {money(action.ytd + action.perPaycheck * action.paychecks)} of {money(LIMITS.k401)}
                      </dd>
                    </div>
                    <div>
                      <dt>Tax effect</dt>
                      <dd>about {money(codeEstimate(action, figures))} less</dd>
                    </div>
                  </>
                )}
              </dl>
              <div className={styles.tradeoffs}>
                <p>
                  <span className={styles.tUp}>Upside</span> About {money(codeEstimate(action, figures))} less federal tax (code&apos;s estimate).
                  {!action.edited && !action.upside.includes(money(codeEstimate(action, figures))) && <span className={styles.llmSaid}> The LLM wrote: “{action.upside}”</span>}
                </p>
                <p>
                  <span className={styles.tDown}>Tradeoff</span> {action.edited ? codeTradeoff(action, figures) : action.tradeoff}
                </p>
                <p>
                  <span className={styles.tWill}>What happens</span> {action.effect}
                </p>
              </div>
              <CheckList items={action.checks} label="Checks in code" className={styles.cardChecks} />
              {state.editing && <EditRow action={action} figures={figures} state={state} onDraft={value => onDraft(action.id, value)} onSave={() => onSaveEdit(action.id)} onCancel={() => onCancelEdit(action.id)} />}
              {action.edited && <p className={styles.small}>Edited by the household; code recomputed the numbers and the key.</p>}
              {status !== 'pending' && (
                <p className={styles.outcome} data-tone={status === 'rejected' ? 'muted' : undefined} data-focus={`outcome-${action.id}`}>
                  {status === 'rejected' ? null : <FiCheck aria-hidden />}
                  {status === 'rejected'
                    ? 'Rejected: nothing was sent.'
                    : state.status === 'done'
                    ? `Done: verified ${action.type === 'harvest_loss' ? 'at the broker' : 'in payroll'}.`
                    : `Approved: sent once under key ${shortKey(state.key)}`}
                </p>
              )}
            </ApprovalCard>
            {renderExec(action)}
          </div>
        );
      })}
    </div>
  );
}

/** The execution of an approved action: the key, the requests, retry, verify. */
export function ExecPanel({ action, state, onToggleTimeout, onReplay, onVerify, hasKey }) {
  const order = action.type === 'harvest_loss';
  const sent = (state.requests || []).length > 0;
  const placed = Boolean(state.result);
  return (
    <Card className={styles.exec} data-focus={`exec-${action.id}`}>
      <CardHead aside={<span className={styles.muted}>{`${hasKey ? 'Server store · simulated' : 'Simulated'} ${order ? 'broker' : 'payroll'}${hasKey ? '' : ', in this tab'}`}</span>}>
        <CardTitle>{order ? 'Send the order once' : 'Change payroll once'}</CardTitle>
      </CardHead>
      {order && (
        <label className={styles.toggle} data-focus="timeoutToggle">
          <input type="checkbox" checked={Boolean(state.simulateTimeout)} onChange={onToggleTimeout} disabled={sent} />
          <span className={styles.switch} aria-hidden />
          <span>
            <strong>Simulate a broker timeout</strong>
            <span className={styles.small}> The order goes through, the confirmation is lost.</span>
          </span>
        </label>
      )}
      <div className={styles.keyRow} data-focus={`key-${action.id}`}>
        <MiniLabel>Idempotency key: action id + payload hash</MiniLabel>
        <code className={styles.key}>{state.key || 'set when approved'}</code>
      </div>
      <div className={styles.requests} data-focus={`requests-${action.id}`}>
        <RequestLog items={state.requests || []} label={order ? 'Broker requests' : 'Payroll requests'} empty={state.status === 'pending' ? 'Nothing is sent until the household approves.' : 'Requests show up here.'} />
      </div>
      <div className={styles.execButtons} data-focus={`execButtons-${action.id}`}>
        <Button type="button" variant="secondary" size="s" onClick={onReplay} disabled={!placed || state.busy}>
          <FiRotateCw aria-hidden /> Replay the retry
        </Button>
        <Button type="button" size="s" onClick={onVerify} disabled={!placed || state.busy || state.status === 'done'}>
          <FiCheck aria-hidden /> Verify it finished
        </Button>
      </div>
      {state.verify && (
        <div className={styles.verify} data-focus={`verify-${action.id}`}>
          <CheckList items={state.verify.checks} label="Verification" />
          <p className={styles.verdictLine} data-done={state.verify.done || undefined}>
            {state.verify.done
              ? `Done: ${order ? 'the broker' : 'payroll'} matches what was approved.`
              : `Not done: ${order ? 'the broker' : 'payroll'} does not match yet.`}
          </p>
        </div>
      )}
    </Card>
  );
}

export function CpaQueue({ actions, others, states, onChoose, onSignOff, onSendBack }) {
  return (
    <div className={styles.cpaGrid}>
      <div className={styles.queue}>
        {actions.length ? (
          actions.map(action => {
            const state = states[action.id] || {};
            const status = state.status === 'rejected' ? 'rejected' : state.status === 'approved' || state.status === 'done' ? 'approved' : 'pending';
            const chosen = action.options?.[state.choice ?? 0];
            return (
              <ApprovalCard
                key={action.id}
                className={styles.approval}
                data-focus={`cpa-${action.id}`}
                status={status}
                statusText={{ pending: 'In the CPA queue', approved: `Signed off: ${chosen?.label || ''}`, rejected: 'Sent back to the household for the invoice' }}
                title={action.question || action.title}
                meta={action.evidence}
                body={action.why}
                onApprove={() => onSignOff(action.id)}
                onReject={() => onSendBack(action.id)}
                approveLabel="Sign off"
                rejectLabel="Ask for the invoice"
              >
                <div className={styles.options} data-focus={`cpaOptions-${action.id}`}>
                  <MiniLabel>Treatment</MiniLabel>
                  <OptionList
                    label="Treatment"
                    options={(action.options || []).map((option, index) => ({ value: String(index), label: option.label, hint: option.effect }))}
                    value={String(state.choice ?? 0)}
                    onChange={value => status === 'pending' && onChoose(action.id, Number(value))}
                  />
                </div>
                <CheckList items={action.checks} label="Checks in code" className={styles.cardChecks} />
              </ApprovalCard>
            );
          })
        ) : (
          <EmptyState size="m">Nothing in the CPA queue yet.</EmptyState>
        )}
      </div>
      <Card className={styles.cpaSide}>
        <CardHead>
          <CardTitle size="s">Also in this file</CardTitle>
        </CardHead>
        <ul className={styles.otherList}>
          {others.map(action => {
            const word = STATUS_WORD[states[action.id]?.status] || STATUS_WORD.pending;
            return (
              <li key={action.id}>
                <span>{action.title}</span>
                <Pill tone={word.tone}>{word.text}</Pill>
              </li>
            );
          })}
        </ul>
        <p className={styles.small}>The CPA sees what the household approved and what ran on its own, with the same checks.</p>
      </Card>
    </div>
  );
}

// --- the handoff ------------------------------------------------------------------------------------------

export function HandoffCard({ request, requestState, handoff, onUpload, onNone, landed }) {
  if (!landed || !request) return <EmptyState size="m">Missing-information requests appear here when the agent finds a gap.</EmptyState>;
  const interest = handoff.status;
  return (
    <Card className={styles.handoff} data-focus="handoff">
      <CardHead aside={<Pill tone={requestState?.status === 'ran' ? 'ok' : 'warn'}>{requestState?.status === 'ran' ? 'Sent automatically' : 'Not sent'}</Pill>}>
        <CardTitle>Request sent to the household</CardTitle>
      </CardHead>
      <p className={styles.message}>{request.message}</p>
      <ul className={styles.docAsks}>
        {request.documents.map(id => {
          const item = CHECKLIST.find(entry => entry.id === id);
          const isInt = id === 'int1099';
          const resolved = isInt && (interest === 'uploaded' || interest === 'none');
          return (
            <li key={id} className={styles.docAsk} data-resolved={resolved || undefined} data-focus={`ask-${id}`}>
              <div className={styles.docAskText}>
                <strong>{item?.label || id}</strong>
                <span className={styles.muted}>{item?.because}</span>
              </div>
              {isInt ? (
                resolved ? (
                  <Tag tone="ok">{interest === 'none' ? 'Answered: none' : 'Uploaded'}</Tag>
                ) : (
                  <div className={styles.docAskButtons} data-focus="askButtons">
                    <Button type="button" size="s" onClick={onUpload} disabled={interest === 'working'}>
                      {interest === 'working' ? (
                        <>
                          <Spinner /> Reading
                        </>
                      ) : (
                        <>
                          <FiUpload aria-hidden /> Upload the sample 1099-INT
                        </>
                      )}
                    </Button>
                    <Button type="button" size="s" variant="ghost" onClick={onNone} disabled={interest === 'working'}>
                      None this year
                    </Button>
                  </div>
                )
              ) : (
                <Tag soft>Still open</Tag>
              )}
            </li>
          );
        })}
      </ul>
      {handoff.resumed && (
        <div className={styles.resumeResult} data-focus="resumeResult">
          <div className={styles.resumeHead}>
            <FiCornerDownRight aria-hidden />
            <strong>Resumed at step {handoff.resumed.resumedAt}</strong>
            <span className={styles.muted}>interest and dividends, not a restart</span>
          </div>
          {handoff.resumed.checks?.length > 0 && <CheckList items={handoff.resumed.checks} label="1099-INT checks" />}
          <KeyValues items={handoff.resumed.schedule.lines} />
          {handoff.resumed.schedule.flag && (
            <Notice size="s" className={styles.notice}>
              {handoff.resumed.schedule.flag}
            </Notice>
          )}
        </div>
      )}
      <p className={styles.small}>The rental expense summary has no sample file, so that request stays open for the household.</p>
    </Card>
  );
}

// --- the file: documents, record, live tools ----------------------------------------------------------

export function DocumentsCard({ docs, docId, onPick, text }) {
  const items = docs.map(doc => ({ id: doc.id, label: doc.form, sub: doc.title }));
  return (
    <Card className={styles.docsCard} data-focus="docs">
      <CardHead aside={<span className={styles.muted}>Sample documents, year to date</span>}>
        <CardTitle>Documents on file ({docs.length})</CardTitle>
      </CardHead>
      <Tabs items={items} value={docId} onChange={onPick} label="Documents" />
      <pre className={styles.docText} aria-label="Document text">
        {text}
      </pre>
      <p className={styles.small}>{DOCUMENTS.find(doc => doc.id === docId)?.sub || 'Uploaded at the handoff'}</p>
    </Card>
  );
}

export function RecordCard({ view, record }) {
  return (
    <Card className={styles.recordCard} data-focus="record">
      <CardHead aside={record ? <Pill tone={view.recordOk ? 'ok' : 'bad'}>{view.recordCheck.figuresChecked - view.recordCheck.figuresWrong}/{view.recordCheck.figuresChecked} figures</Pill> : null}>
        <CardTitle>Typed record, checked in code</CardTitle>
      </CardHead>
      {record ? (
        <>
          <CheckList items={view.recordCheck.checks} label="Record checks" />
          <div className={styles.checklist}>
            <MiniLabel>Completeness: {view.complete.have} of {view.complete.total}</MiniLabel>
            <CheckList
              items={view.complete.items.map(item => ({ id: item.id, label: item.label, detail: item.because, status: item.have ? 'pass' : 'warn' }))}
              statusLabels={{ warn: 'Missing' }}
              label="Completeness checklist"
            />
          </div>
          <JsonDetails className={styles.json} summary="The record as JSON (the LLM's extraction)" value={record} />
        </>
      ) : (
        <EmptyState size="s">The record appears when the agent has read the documents.</EmptyState>
      )}
    </Card>
  );
}

export function LiveCard({ hasKey, edits, onEdit, onRerun, running, notice, presets, onAsk, question, onQuestion, answer, asking, askNotice }) {
  return (
    <Card className={styles.liveCard} data-focus="live">
      <CardHead aside={<Pill tone={hasKey ? 'live' : 'neutral'}>{hasKey ? 'Live with your link' : 'Preview mode'}</Pill>}>
        <CardTitle>Try it live</CardTitle>
      </CardHead>
      <MiniLabel>Change the figures, then re-run the agent</MiniLabel>
      <div className={styles.figureGrid}>
        {EDITABLE.map(field => (
          <label key={field.id} className={styles.figure}>
            <span>{field.label}</span>
            <Input type="number" inputMode="numeric" min={field.min} max={field.max} value={edits[field.id]} onChange={event => onEdit(field.id, event.target.value)} />
          </label>
        ))}
      </div>
      <div className={styles.liveActions}>
        <Button type="button" onClick={onRerun} disabled={running}>
          {running ? (
            <>
              <Spinner /> Running live
            </>
          ) : (
            <>
              <FiPlay aria-hidden /> Re-run the agent live
            </>
          )}
        </Button>
        <span className={styles.small}>About 20-30 s: the LLM reads five documents and proposes; each action is routed.</span>
      </div>
      {notice && (
        <Notice size="s" className={styles.notice} role="status">
          {notice}
        </Notice>
      )}

      <div className={styles.ask}>
        <MiniLabel>Ask about this file</MiniLabel>
        <div className={styles.chips}>
          {presets.map(preset => (
            <Chip key={preset} type="button" onClick={() => onAsk(preset)} disabled={asking}>
              {preset}
            </Chip>
          ))}
        </div>
        <form
          className={styles.askForm}
          onSubmit={event => {
            event.preventDefault();
            onAsk(question);
          }}
        >
          <label htmlFor="ct-question" className={srOnly}>
            Your question
          </label>
          <Input id="ct-question" value={question} maxLength={300} placeholder="What happens if they sell only half the SOL lot?" onChange={event => onQuestion(event.target.value)} />
          <Button type="submit" size="s" variant="secondary" disabled={asking || question.trim().length < 3}>
            Ask
          </Button>
        </form>
        {(answer.text || asking) && (
          <div className={styles.answer} aria-live="polite">
            {answer.label && <Pill>{answer.label}</Pill>}
            {asking && !answer.text ? <TypingDots label="Answering" /> : <MarkdownLite text={answer.text} />}
          </div>
        )}
        {askNotice && (
          <Notice size="s" className={styles.notice} role="status">
            {askNotice}
          </Notice>
        )}
      </div>
    </Card>
  );
}

export function AuditCard({ items }) {
  return (
    <Card className={styles.auditCard} data-focus="audit">
      <AuditTrail items={items} label="Audit trail" empty="Every step, by the agent, code, the household and the CPA, lands here." />
    </Card>
  );
}

export function ViewSwitch({ value, onChange, counts }) {
  return (
    <SegmentedControl
      label="Whose queue"
      value={value}
      onChange={onChange}
      options={[
        { value: 'household', label: `Household (${counts.household})` },
        { value: 'cpa', label: `CPA (${counts.cpa})` },
      ]}
    />
  );
}

export { formatMs };

// Affirm demo: a customer-servicing agent for sample buy-now-pay-later loans. The model works through
// tools, code enforces the policy, a decision model gives the odds a person should take over (rules can
// only make that stricter) and a hand-off comes with a note for the human agent.
// Live at /demo/affirm/ (unlisted, noindex). Without a demo key the suggested questions replay recorded
// live runs; with one, every turn calls /api/demo/affirm/turn/. Notes in ./README.md.
import { DemoLayout } from 'demos/DemoLayout';
import { getDemoKey, streamFromApi } from 'demos/client';
import {
  Button,
  Card,
  CardHead,
  CardTitle,
  ChatThread,
  CheckList,
  Chip,
  DecisionBadge,
  Dot,
  EmptyState,
  JsonDetails,
  MiniLabel,
  Notice,
  NoteGrid,
  Pill,
  PipelineStrip,
  ProbabilityBars,
  SectionHead,
  Spinner,
  StatusIcon,
  Tag,
  TextArea,
  Timeline,
  TimelineStep,
  ToolCall,
  ToolCallList,
  formatMs,
  pct,
  srOnly,
} from 'demos/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FiCheck, FiRotateCcw, FiSend, FiX } from 'react-icons/fi';
import styles from './Affirm.module.css';
import {
  PRESETS,
  QUEUES,
  applyEvent,
  callTone,
  callsOf,
  checkCounts,
  emptyRun,
  jevState,
  makeWorld,
  outcomeOf,
  runTurn,
  summarizeCall,
} from './agent';
import { CUSTOMER, LENDER, TODAY, fmtDate, maskNumber, money, ordinal } from './data';
import { EXAMPLE } from './example';

const TURN_PATH = '/api/demo/affirm/turn/';
const PREVIEW_NOTE = 'Preview mode: live runs need the private link from my email.';
const MAX_INPUT = 300;
const NAV = [
  { href: '#chat', label: 'Conversation' },
  { href: '#route', label: 'Hand-off' },
  { href: '#how', label: 'How it works' },
];
const ROUTE_BARS = [
  { value: 'agent', label: 'The agent', tone: 'ok' },
  { value: 'human', label: 'A person', tone: 'warn' },
];
const QUEUE_BARS = [
  { value: 'payments', label: 'Payments' },
  { value: 'disputes', label: 'Disputes' },
  { value: 'hardship', label: 'Hardship' },
];
const FLOW = [
  {
    label: 'Look it up',
    what: 'DeepSeek calls tools over her loans, up to 4 rounds, then answers',
    cost: '2-5 LLM calls',
  },
  {
    label: 'Hold the policy',
    what: 'Eligibility, masking, no promises or advice: code',
    cost: 'free',
  },
  {
    label: 'Decide',
    what: 'Jev: hand off? which queue? Rules can only add a person',
    cost: '1 Jev call',
  },
  {
    label: 'Hand off',
    what: 'A note for the human agent: asked, checked, left, next',
    cost: '1 LLM call',
  },
];
const NOTES = [
  {
    title: 'The model picks the tools; code owns the policy',
    text: 'DeepSeek decides what to look up and in what order. Eligibility, the 21-day limit, masking and what may be promised are plain functions it cannot talk its way past.',
  },
  {
    title: 'Odds, and rules that only add a person',
    text: 'Jev gives the odds a person should take over, so a team can tune the threshold per queue. Disputes, hardship, a refused change or an off-policy reply always add a person.',
  },
  {
    title: 'Masked before the model sees it',
    text: 'Full card and account numbers never leave the data layer: tools return the last 4, and the reply is scanned again before it is shown.',
  },
  {
    title: 'A hand-off carries the work',
    text: 'The human agent reads what was asked, what was checked (ids, amounts, dates), what is left and a first step, so the customer never repeats herself.',
  },
];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
let uid = 0;
const nextId = prefix => `${prefix}${(uid += 1)}`;

// Reveals events at a readable pace (tools finish in microseconds; nobody could follow them)
const PACE = {
  example: { llm: 240, call: 320, decide: 480, wordMs: 26 },
  live: { llm: 120, call: 180, decide: 240, wordMs: 18 },
  instant: { llm: 0, call: 0, decide: 0, wordMs: 0 },
};

function createPlayer(handle) {
  const queue = [];
  let draining = false;
  let cancelled = false;
  let waiters = [];

  async function drain() {
    draining = true;
    while (queue.length && !cancelled) {
      // eslint-disable-next-line no-await-in-loop
      await handle(queue.shift());
    }
    draining = false;
    waiters.forEach(resolve => resolve());
    waiters = [];
  }

  return {
    push(event) {
      if (cancelled) return;
      queue.push(event);
      if (!draining) drain();
    },
    idle() {
      if (!draining && !queue.length) return Promise.resolve();
      return new Promise(resolve => waiters.push(resolve));
    },
    cancel() {
      cancelled = true;
      queue.length = 0;
      waiters.forEach(resolve => resolve());
      waiters = [];
    },
    get cancelled() {
      return cancelled;
    },
  };
}

/** NDJSON lines from a stream, as they complete. */
function lineReader(onLine) {
  let buffer = '';
  return chunk => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        onLine(JSON.parse(line));
      } catch {
        // a partial or malformed line: skip it
      }
    }
  };
}

export default function AffirmDemo() {
  const [hasKey, setHasKey] = useState(false);
  const [turns, setTurns] = useState([]);
  const [runs, setRuns] = useState({});
  const [selected, setSelected] = useState(null);
  const [changes, setChanges] = useState([]);
  const [decisions, setDecisions] = useState({}); // runId -> 'confirmed' | 'declined'
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const playerRef = useRef(null);
  const autoplayed = useRef(false);

  const run = selected ? runs[selected] : null;
  const world = useMemo(() => makeWorld(changes), [changes]);

  useEffect(() => {
    setHasKey(Boolean(getDemoKey()));
  }, []);

  useEffect(() => () => playerRef.current?.cancel(), []);

  // The first seconds: the date-change example plays on load (labelled "Example run")
  useEffect(() => {
    if (autoplayed.current || !EXAMPLE.runs.date) return undefined;
    autoplayed.current = true;
    const timer = setTimeout(() => send(PRESETS[0].text, { forceExample: true }), 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateRun = (id, event) =>
    setRuns(current =>
      current[id] ? { ...current, [id]: applyEvent(current[id], event) } : current
    );
  const setTurnText = (id, text, extra = {}) =>
    setTurns(current =>
      current.map(turn => (turn.id === id ? { ...turn, text, ...extra } : turn))
    );

  function makeHandler(runId, agentTurnId, pace, isCancelled) {
    return async event => {
      if (event.t === 'reply') {
        updateRun(runId, event);
        if (!pace.wordMs) {
          setTurnText(agentTurnId, event.text, { streaming: false });
          return;
        }
        const words = event.text.split(/(\s+)/);
        let shown = '';
        for (let index = 0; index < words.length; index += 2) {
          if (isCancelled()) return;
          shown += words[index] + (words[index + 1] || '');
          setTurnText(agentTurnId, shown, { streaming: true });
          // eslint-disable-next-line no-await-in-loop
          await sleep(pace.wordMs);
        }
        setTurnText(agentTurnId, event.text, { streaming: false });
        return;
      }
      if (event.t === 'error') {
        updateRun(runId, event);
        setTurnText(agentTurnId, '', { failed: event.message });
        return;
      }
      updateRun(runId, event);
      const wait = pace[event.t === 'decide' ? 'decide' : event.t];
      if (wait) await sleep(wait);
    };
  }

  async function send(raw, { forceExample = false } = {}) {
    const text = String(raw || '')
      .trim()
      .slice(0, MAX_INPUT);
    if (!text || busy) return;
    const preset = PRESETS.find(item => item.text === text);
    const live = !forceExample && Boolean(getDemoKey());
    if (!live && !(preset && EXAMPLE.runs[preset.id])) {
      setNotice(
        `${PREVIEW_NOTE} In preview, the three suggested questions replay recorded live runs.`
      );
      return;
    }

    playerRef.current?.cancel();
    setNotice(
      live || forceExample
        ? ''
        : `${PREVIEW_NOTE} Replaying the recorded live run of this question.`
    );
    setError('');
    setBusy(true);
    setInput('');

    const kind = live ? 'live' : 'example';
    const runId = nextId('run');
    const customerTurn = { id: nextId('t'), role: 'customer', text, kind };
    const agentTurn = { id: nextId('t'), role: 'agent', text: '', runId, kind };
    // The live conversation only: replayed examples are demonstrations, not something she said
    const history = turns
      .filter(turn => turn.text && !turn.failed && turn.kind !== 'example')
      .slice(-6)
      .map(turn => ({ role: turn.role, text: turn.text }));
    setTurns(current => [...current, customerTurn, agentTurn]);
    setRuns(current => ({
      ...current,
      [runId]: { ...emptyRun(kind), status: 'running', text },
    }));
    setSelected(runId);

    const fast = prefersReducedMotion();
    const pace = fast ? PACE.instant : PACE[kind];
    let player = null;
    player = createPlayer(makeHandler(runId, agentTurn.id, pace, () => player.cancelled));
    playerRef.current = player;

    try {
      if (live) {
        await streamFromApi(
          TURN_PATH,
          { text, history, changes },
          lineReader(event => player.push(event))
        );
      } else {
        const recorded = EXAMPLE.runs[preset.id];
        player.push({ t: 'meta', model: EXAMPLE.model, cached: false });
        let round = 0;
        await runTurn(
          { text: recorded.text, history: [], changes: [] },
          {
            emit: event => player.push(event),
            model: async () => {
              const next = recorded.rounds[round] || {
                content: '',
                toolCalls: [],
                ms: 0,
              };
              round += 1;
              if (!fast) await sleep(Math.min(1000, 420 + next.ms * 0.05));
              return next;
            },
            decide: async () => {
              if (!fast) await sleep(200);
              return recorded.answers;
            },
            summarise: async () => {
              if (!fast) await sleep(650);
              return recorded.summary;
            },
            msFor: key => recorded.ms?.[key],
          }
        );
      }
      await player.idle();
    } catch (err) {
      player.cancel();
      const message = err.message || 'The agent could not be reached.';
      setError(message);
      setRuns(current => ({
        ...current,
        [runId]: applyEvent(current[runId], { t: 'error', message }),
      }));
      setTurnText(agentTurn.id, '', { failed: message });
    } finally {
      if (playerRef.current === player) setBusy(false);
    }
  }

  function confirmChange(runId, proposal) {
    if (decisions[runId]) return;
    setDecisions(current => ({ ...current, [runId]: 'confirmed' }));
    setChanges(current => [
      ...current.filter(change => change.loanId !== proposal.loan_id),
      { loanId: proposal.loan_id, toDay: proposal.to_day },
    ]);
    setTurns(current => [
      ...current,
      {
        id: nextId('t'),
        role: 'agent',
        system: true,
        text: `Done. Your ${proposal.item.toLowerCase()} payments are now due on the ${ordinal(
          proposal.to_day
        )}. Next payment: ${money(proposal.next_payment.amount)} on ${fmtDate(
          proposal.next_payment.to
        )}. No fee.`,
      },
    ]);
  }

  function declineChange(runId) {
    if (decisions[runId]) return;
    setDecisions(current => ({ ...current, [runId]: 'declined' }));
  }

  function reset() {
    playerRef.current?.cancel();
    playerRef.current = null;
    setTurns([]);
    setRuns({});
    setSelected(null);
    setChanges([]);
    setDecisions({});
    setNotice('');
    setError('');
    setBusy(false);
  }

  const messages = turns.map(turn =>
    turn.role === 'customer'
      ? { id: turn.id, side: 'end', name: CUSTOMER.name, text: turn.text }
      : {
          id: turn.id,
          side: 'start',
          name: `${LENDER.name} assistant`,
          avatar: 'FP',
          meta: turn.system
            ? 'applied by code'
            : turn.kind === 'example'
            ? 'Example run'
            : runs[turn.runId]?.cached
            ? 'Live · cached'
            : 'Live',
          text: turn.failed ? `Sorry, something went wrong: ${turn.failed}` : turn.text,
          pending: !turn.system && !turn.text && !turn.failed,
          streaming: turn.streaming,
          children: turn.runId ? (
            <TurnExtras
              run={runs[turn.runId]}
              decision={decisions[turn.runId]}
              selected={selected === turn.runId}
              many={Object.keys(runs).length > 1}
              onSelect={() => setSelected(turn.runId)}
              onConfirm={proposal => confirmChange(turn.runId, proposal)}
              onDecline={() => declineChange(turn.runId)}
              typing={turn.streaming}
            />
          ) : null,
        }
  );

  return (
    <DemoLayout
      company="Affirm"
      title="A servicing agent that fixes what it can and hands off the rest"
      tagline="A customer asks about a sample pay-over-time loan. An agent looks things up with tools and answers inside a policy that code enforces. A decision model gives the odds a person should take over and picks the queue, and every hand-off comes with a note for the human agent."
      accent="iris"
      nav={NAV}
      hero={<Glance run={run} />}
    >
      <div className={styles.page}>
        <section id="chat" className={styles.section} aria-labelledby="chat-heading">
          <h2 id="chat-heading" className={srOnly}>
            Conversation
          </h2>
          <div className={styles.grid}>
            <div className={styles.left}>
              <Card className={styles.chatCard}>
                <CardHead
                  aside={
                    <Button variant="ghost" size="s" onClick={reset}>
                      <FiRotateCcw aria-hidden /> New chat
                    </Button>
                  }
                >
                  <CardTitle>{LENDER.name} help</CardTitle>
                  <Tag soft>fictional lender</Tag>
                </CardHead>
                <p className={styles.cardLede}>
                  Signed in as {CUSTOMER.name}, {CUSTOMER.city}. Today is{' '}
                  {fmtDate(TODAY, { year: true })}.
                </p>
                <ChatThread
                  className={styles.thread}
                  messages={messages}
                  label="Chat with the servicing agent"
                  empty="Ask about a payment, a charge or your options."
                />
                <div
                  className={styles.presets}
                  role="group"
                  aria-label="Suggested questions"
                >
                  {PRESETS.map(preset => (
                    <Chip
                      key={preset.id}
                      type="button"
                      disabled={busy}
                      onClick={() => send(preset.text)}
                    >
                      {preset.text}
                    </Chip>
                  ))}
                </div>
                <form
                  className={styles.inputRow}
                  onSubmit={event => {
                    event.preventDefault();
                    send(input);
                  }}
                >
                  <label className={srOnly} htmlFor="affirm-input">
                    Message
                  </label>
                  <TextArea
                    id="affirm-input"
                    className={styles.input}
                    rows={2}
                    value={input}
                    maxLength={MAX_INPUT}
                    placeholder={
                      hasKey
                        ? 'Write as Maya…'
                        : 'Live typing needs the private link; pick a question above'
                    }
                    onChange={event => setInput(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        send(input);
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    pill
                    disabled={busy || !input.trim()}
                    aria-label="Send"
                  >
                    {busy ? <Spinner /> : <FiSend aria-hidden />}
                  </Button>
                </form>
                <p className={styles.small}>
                  {hasKey
                    ? `Live: DeepSeek and Jev on every turn, about 5 cents. ${input.length}/${MAX_INPUT}`
                    : 'Preview: the suggested questions replay recorded live runs.'}
                </p>
                {notice && (
                  <Notice size="s" className={styles.notice} role="status">
                    {notice}
                  </Notice>
                )}
                {error && (
                  <Notice kind="error" size="s" className={styles.notice} role="alert">
                    {error}
                  </Notice>
                )}
              </Card>
              <LoansCard world={world} changes={changes} />
            </div>

            <RunCard run={run} busy={busy} onReplay={send} />
          </div>
        </section>

        <section id="route" className={styles.section} aria-labelledby="route-heading">
          <SectionHead
            variant="eyebrow"
            kicker="Hand-off"
            titleId="route-heading"
            title="Should a person take over, and who?"
            lede="Jev answers two typed questions about the turn with probabilities. A rules floor in code can only add a person. On a hand-off the LLM writes the note the human agent reads first."
          />
          <div className={styles.routeGrid}>
            <DecisionCard run={run} />
            <HandoffCard run={run} busy={busy} onTry={text => send(text)} />
          </div>
        </section>

        <section id="how" className={styles.section} aria-labelledby="how-heading">
          <SectionHead
            variant="eyebrow"
            kicker="How it works"
            titleId="how-heading"
            title="One turn, four steps"
          />
          <PipelineStrip steps={FLOW} label="How one turn works" />
          <NoteGrid className={styles.notes} items={NOTES} />
        </section>
      </div>
    </DemoLayout>
  );
}

// --- hero ------------------------------------------------------------------------------------------

function kindLabel(run) {
  if (!run || run.kind === 'example') return 'Example run';
  return run.cached ? 'Live · cached' : 'Live';
}

function Glance({ run }) {
  const calls = run ? callsOf(run) : [];
  const decision = run?.decision;
  const route = decision?.final?.route;
  const human = decision?.answers?.handoff?.probabilities?.human;
  const outcome = run?.reply ? outcomeOf(run) : null;
  const counts = checkCounts(run?.reply?.checks);
  const working = run?.status === 'running' && !decision;
  const status = !run
    ? 'Waiting for a question'
    : run.status === 'error'
    ? 'Something went wrong'
    : !decision
    ? 'Working on it'
    : route === 'agent'
    ? 'Resolved by the agent'
    : `Handed to ${QUEUES[decision.final.queue]}`;
  const steps = [
    ...calls.map(call => ({ id: call.id, label: call.name, tone: callTone(call) })),
    ...(run?.reply
      ? [
          {
            id: 'guard',
            label: `policy ${counts.pass}/${counts.applied}`,
            tone: counts.fixed ? 'warn' : 'ok',
          },
        ]
      : []),
    ...(decision ? [{ id: 'decide', label: 'decide', tone: 'ok' }] : []),
  ];

  return (
    <Card tone="accent" className={styles.glance} aria-live="polite">
      <div className={styles.glanceTop}>
        <span className={styles.glanceKind}>{kindLabel(run)}</span>
        <span className={styles.glanceMeta}>
          {run?.ms != null ? formatMs(run.ms) : working ? 'running' : ''}
        </span>
      </div>
      <p className={styles.glanceAsk}>“{run?.text || PRESETS[0].text}”</p>
      <ol className={styles.glanceSteps} aria-label="Tool calls">
        {steps.map(step => (
          <li key={step.id} data-tone={step.tone}>
            {step.label}
          </li>
        ))}
        {working && (
          <li data-pending="">
            <Spinner /> thinking
          </li>
        )}
      </ol>
      <div className={styles.glanceStatus}>
        <strong>
          <Dot
            tone={!decision ? 'idle' : route === 'agent' ? 'ok' : 'warn'}
            motion={working ? 'pulse' : undefined}
          />
          {status}
        </strong>
        <span>{decision && outcome ? outcome.text : ' '}</span>
      </div>
      <div className={styles.handoff}>
        <span className={styles.handoffLabel}>Needs a person</span>
        <span className={styles.handoffTrack} aria-hidden>
          <span
            className={styles.handoffFill}
            style={{ width: `${(human ?? 0) * 100}%` }}
          />
          <span className={styles.handoffMark} />
        </span>
        <span className={styles.handoffValue}>{human != null ? pct(human) : '–'}</span>
      </div>
      <dl className={styles.glanceStats}>
        <div>
          <dt>Tool calls</dt>
          <dd>{calls.length}</dd>
        </div>
        <div>
          <dt>Policy checks</dt>
          <dd>{counts.applied ? `${counts.pass}/${counts.applied}` : '–'}</dd>
        </div>
        <div>
          <dt>Route</dt>
          <dd>
            {decision
              ? route === 'agent'
                ? 'Agent'
                : QUEUES[decision.final.queue]
              : '–'}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

// --- chat extras -------------------------------------------------------------------------------------

function TurnExtras({
  run,
  decision,
  selected,
  many,
  onSelect,
  onConfirm,
  onDecline,
  typing,
}) {
  if (!run || typing || !run.reply) return null;
  const outcome = outcomeOf(run);
  const final = run.decision?.final;
  const proposal = outcome.kind === 'proposal' ? outcome.proposal : null;
  return (
    <div className={styles.extras}>
      {proposal && (
        <div className={styles.proposal} data-state={decision || 'open'}>
          <div className={styles.proposalHead}>
            <MiniLabel>Proposed change · {proposal.item}</MiniLabel>
            <span className={styles.proposalChecks}>
              <StatusIcon status="pass" /> {proposal.checks.length}/
              {proposal.checks.length} rules pass
            </span>
          </div>
          <div className={styles.proposalDays}>
            <span>
              <small>Due day</small>
              <span>
                <s>{ordinal(proposal.from_day)}</s> →{' '}
                <strong>{ordinal(proposal.to_day)}</strong>
              </span>
            </span>
            <span>
              <small>Next payment</small>
              <span>
                <s>{fmtDate(proposal.next_payment.from)}</s> →{' '}
                <strong>{fmtDate(proposal.next_payment.to)}</strong>
              </span>
            </span>
            <span>
              <small>Fee</small>
              <strong>{money(proposal.fee)}</strong>
            </span>
          </div>
          {decision === 'confirmed' ? (
            <p className={styles.proposalDone}>
              <FiCheck aria-hidden /> Confirmed by Maya
            </p>
          ) : decision === 'declined' ? (
            <p className={styles.proposalDone}>Not applied</p>
          ) : (
            <div className={styles.proposalActions}>
              <Button size="s" onClick={() => onConfirm(proposal)}>
                <FiCheck aria-hidden /> Confirm: move to the {ordinal(proposal.to_day)}
              </Button>
              <Button size="s" variant="ghost" onClick={onDecline}>
                <FiX aria-hidden /> Not now
              </Button>
            </div>
          )}
        </div>
      )}
      {final && (
        <div className={styles.routeLine}>
          {final.route === 'agent' ? (
            <Pill tone="ok">Resolved by the agent</Pill>
          ) : (
            <Pill tone="warn">Handed to a person · {QUEUES[final.queue]} queue</Pill>
          )}
          {many && (
            <Button variant="link" size="s" onClick={onSelect} aria-pressed={selected}>
              {selected ? 'Showing its steps' : 'Show its steps'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// --- loans -------------------------------------------------------------------------------------------

function LoansCard({ world, changes }) {
  return (
    <Card className={styles.loansCard}>
      <CardHead aside={<Pill>sample data</Pill>}>
        <CardTitle size="s">Maya’s loans</CardTitle>
      </CardHead>
      <ul className={styles.loans}>
        {world.loans.map(loan => {
          const next = loan.schedule.find(item => item.status === 'scheduled');
          const changed = changes.find(change => change.loanId === loan.id);
          return (
            <li
              key={loan.id}
              className={styles.loan}
              data-closed={loan.status === 'paid_off' ? '' : undefined}
              data-changed={changed ? '' : undefined}
            >
              <div className={styles.loanHead}>
                <strong>{loan.item}</strong>
                <span className={styles.loanId}>{loan.id}</span>
              </div>
              <span className={styles.loanPlan}>
                {loan.merchant} · {loan.planLabel} · {maskNumber(loan.method.number)}
              </span>
              <span className={styles.loanNext}>
                {loan.status === 'paid_off' ? (
                  'Paid off'
                ) : (
                  <>
                    Next {money(next.amount)} on {fmtDate(next.due)}
                    {loan.dueDay && (
                      <>
                        {' · due the '}
                        <strong>{ordinal(loan.dueDay)}</strong>
                        {changed && <Tag tone="ok">changed</Tag>}
                      </>
                    )}
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// --- the run -----------------------------------------------------------------------------------------

function RunCard({ run, busy, onReplay }) {
  if (!run) {
    return (
      <Card className={styles.runCard}>
        <CardHead>
          <CardTitle>Agent run</CardTitle>
        </CardHead>
        <EmptyState size="s">
          Every tool call, check and decision of a turn shows up here.
        </EmptyState>
      </Card>
    );
  }
  const counts = checkCounts(run.reply?.checks);
  const rounds = run.steps.filter(step => step.kind === 'llm');
  const calls = callsOf(run);
  const decision = run.decision;
  const thinking = run.status === 'running' && !run.reply;
  const preset = PRESETS.find(item => item.text === run.text);

  return (
    <Card className={styles.runCard} aria-live="polite">
      <CardHead
        aside={
          <span className={styles.runAside}>
            {run.ms != null && <span className={styles.ms}>{formatMs(run.ms)}</span>}
            {run.kind === 'example' && preset && (
              <Button
                variant="ghost"
                size="s"
                disabled={busy}
                onClick={() => onReplay(preset.text, { forceExample: true })}
              >
                <FiRotateCcw aria-hidden /> Replay
              </Button>
            )}
          </span>
        }
      >
        <CardTitle>Agent run</CardTitle>
        <Pill tone={run.kind === 'example' ? 'neutral' : 'live'}>{kindLabel(run)}</Pill>
      </CardHead>
      {run.kind === 'example' && (
        <p className={styles.exampleNote}>
          Example run. DeepSeek’s tool calls and reply, Jev’s answer and the hand-off note
          were recorded from a live run on {fmtDate(EXAMPLE.recordedOn, { year: true })}.
          Every tool result, policy check and the rules floor is computed in your browser
          by the same code the API runs. Replayed faster; the times shown are the live
          ones.
        </p>
      )}
      <p className={styles.runAsk}>
        <MiniLabel>Customer</MiniLabel> “{run.text}”
      </p>
      <Timeline>
        {rounds.map((step, index) => {
          const own = calls.filter(call => call.round === step.round);
          const answer = !step.calls.length;
          return (
            <TimelineStep
              key={`r${step.round}`}
              index={index}
              status="done"
              title={answer ? 'Model · writes the reply' : `Model · round ${step.round}`}
              detail={
                answer
                  ? 'no more tools needed'
                  : `calls ${step.calls.map(call => call.name).join(', ')}`
              }
              ms={step.ms}
            >
              {step.note && <p className={styles.modelNote}>“{step.note}”</p>}
              {own.length > 0 && (
                <ToolCallList label={`Tool calls in round ${step.round}`}>
                  {own.map(call => (
                    <ToolCall
                      key={call.id}
                      name={call.name}
                      args={call.args}
                      result={call.result}
                      summary={summarizeCall(call)}
                      tone={callTone(call)}
                      argsLabel="arguments (from the LLM)"
                      resultLabel="result (from code)"
                    />
                  ))}
                </ToolCallList>
              )}
              {answer && run.reply && run.reply.draft !== run.reply.text && (
                <p className={styles.stepNote}>
                  The guardrails changed this draft before it was shown.
                </p>
              )}
            </TimelineStep>
          );
        })}
        {thinking && (
          <TimelineStep
            index={rounds.length}
            status="running"
            title={
              rounds.length
                ? 'Model · reading the results'
                : 'Model · reading the question'
            }
            detail="DeepSeek via fal"
          />
        )}
        {run.reply && (
          <TimelineStep
            index={rounds.length}
            status="done"
            title="Policy guardrails"
            detail={`code · ${counts.pass} of ${counts.applied} pass${
              counts.fixed ? `, ${counts.fixed} fixed` : ''
            }`}
          >
            <CheckList
              className={styles.checks}
              items={run.reply.checks}
              label="Guardrail checks"
            />
          </TimelineStep>
        )}
        {run.reply && (
          <TimelineStep
            index={rounds.length + 1}
            status={decision ? 'done' : 'running'}
            title="Decide"
            detail={
              decision
                ? `Jev: a person ${pct(
                    decision.answers.handoff?.probabilities?.human ?? 0
                  )} · rules: ${
                    decision.floor.route === 'human' ? 'a person' : 'none'
                  } → ${
                    decision.final.route === 'agent'
                      ? 'stays with the agent'
                      : `${QUEUES[decision.final.queue]} queue`
                  }`
                : 'Jev, two typed questions'
            }
            ms={decision?.ms}
          />
        )}
        {decision?.final.route === 'human' && (
          <TimelineStep
            index={rounds.length + 2}
            status={run.summary ? 'done' : 'running'}
            title="Hand-off note"
            detail={
              run.summary
                ? `${
                    run.summary.via === 'template' ? 'template' : 'LLM'
                  } · for the human agent`
                : 'DeepSeek writes it'
            }
            ms={run.summary?.ms}
          />
        )}
      </Timeline>
      {run.status === 'error' && (
        <Notice kind="error" size="s" className={styles.notice} role="alert">
          {run.error || 'The run failed.'}
        </Notice>
      )}
    </Card>
  );
}

// --- decision and hand-off --------------------------------------------------------------------------

function DecisionCard({ run }) {
  const decision = run?.decision;
  if (!decision) {
    return (
      <Card className={styles.decisionCard}>
        <CardHead>
          <CardTitle>Decision</CardTitle>
        </CardHead>
        <EmptyState size="s" loading={run?.status === 'running'}>
          {run?.status === 'running'
            ? 'Waiting for the reply…'
            : 'The odds and the route land here.'}
        </EmptyState>
      </Card>
    );
  }
  const { answers, floor, final } = decision;
  const state = jevState({
    text: run.text,
    reply: run.reply?.text || '',
    calls: callsOf(run),
  });
  return (
    <Card className={styles.decisionCard}>
      <CardHead
        aside={
          <Pill>
            Jev · 2 typed questions
            {decision.ms != null ? ` · ${formatMs(decision.ms)}` : ''}
          </Pill>
        }
      >
        <CardTitle>Decision</CardTitle>
      </CardHead>
      <div className={styles.bars}>
        <MiniLabel as="p" className={styles.question}>
          handoff · stay with the agent, or a person?
        </MiniLabel>
        <ProbabilityBars
          options={ROUTE_BARS}
          probabilities={answers.handoff?.probabilities}
          choice={final.jevRoute}
        />
      </div>
      <div className={styles.bars}>
        <MiniLabel as="p" className={styles.question}>
          queue · if a person takes it, which team?
        </MiniLabel>
        <ProbabilityBars
          options={QUEUE_BARS.map(bar => ({
            ...bar,
            tone: bar.value === final.queue ? 'warn' : undefined,
          }))}
          probabilities={answers.queue?.probabilities}
          choice={final.jevQueue}
        />
      </div>
      <div className={styles.floor}>
        <MiniLabel>Rules floor (code)</MiniLabel>
        {floor.reasons.length ? (
          <ul>
            {floor.reasons.map(reason => (
              <li key={reason}>
                <StatusIcon status="warn" /> {reason}
              </li>
            ))}
          </ul>
        ) : (
          <p>No rule requires a person for this turn.</p>
        )}
      </div>
      <div className={styles.final}>
        <MiniLabel>Final route</MiniLabel>
        <DecisionBadge tone={final.route === 'agent' ? 'ok' : 'warn'} size="l">
          {final.route === 'agent'
            ? 'Stays with the agent'
            : `Hand to a person · ${QUEUES[final.queue]} queue`}
        </DecisionBadge>
        <p className={styles.small}>
          The stricter of Jev’s pick and the rules.{' '}
          {final.raisedByRules
            ? 'Here the rules added a person Jev did not ask for.'
            : final.jevRoute === 'human' && floor.route === 'agent'
            ? 'Here Jev asked for a person; no rule required one.'
            : final.queueByRules
            ? 'Here the rules set the queue.'
            : 'Here they agree.'}
        </p>
      </div>
      <JsonDetails
        summary="What Jev saw (state JSON)"
        value={state}
        className={styles.jevState}
      />
    </Card>
  );
}

function HandoffCard({ run, busy, onTry }) {
  const final = run?.decision?.final;
  const summary = run?.summary;
  if (!final || final.route === 'agent' || !summary) {
    const human = run?.decision?.answers?.handoff?.probabilities?.human;
    const writing = final?.route === 'human' && !summary;
    return (
      <Card className={styles.handoffCard} tone="inset">
        <CardHead>
          <CardTitle>Note for the human agent</CardTitle>
        </CardHead>
        <EmptyState size="s" loading={writing}>
          {writing
            ? 'Writing the hand-off note…'
            : final?.route === 'agent'
            ? `No hand-off: the agent resolved this one (a person was ${pct(
                human ?? 0
              )} likely to be needed).`
            : 'When a turn goes to a person, the note they read first lands here.'}
        </EmptyState>
        {!writing && (
          <div className={styles.tryRow}>
            <span className={styles.small}>See a hand-off:</span>
            {PRESETS.slice(1).map(preset => (
              <Chip
                key={preset.id}
                type="button"
                disabled={busy}
                onClick={() => onTry(preset.text)}
              >
                {preset.label}
              </Chip>
            ))}
          </div>
        )}
      </Card>
    );
  }
  return (
    <Card className={styles.handoffCard}>
      <CardHead
        aside={<Tag tone={summary.tone === 'calm' ? 'ok' : 'warn'}>{summary.tone}</Tag>}
      >
        <CardTitle>Note for the human agent</CardTitle>
        <DecisionBadge tone="warn">{QUEUES[final.queue]} queue</DecisionBadge>
      </CardHead>
      <div className={styles.note}>
        <div>
          <MiniLabel>Asked</MiniLabel>
          <p>{summary.asked}</p>
        </div>
        <div>
          <MiniLabel>Checked</MiniLabel>
          <ul className={styles.noteList}>
            {summary.checked.map(item => (
              <li key={item}>
                <StatusIcon status="pass" /> {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <MiniLabel>Left for a person</MiniLabel>
          <ul className={styles.noteList}>
            {summary.left.map(item => (
              <li key={item}>
                <StatusIcon status="warn" /> {item}
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.nextStep}>
          <MiniLabel>Suggested next step</MiniLabel>
          <p>{summary.next_step}</p>
        </div>
      </div>
      <p className={styles.small}>
        {summary.via === 'template'
          ? 'Template note: the LLM summary was not available for this turn.'
          : `Written by DeepSeek from the run’s trace${
              summary.ms != null ? ` in ${formatMs(summary.ms)}` : ''
            }${run.kind === 'example' ? ' (recorded)' : ''}. Nothing is sent to anyone.`}
      </p>
    </Card>
  );
}

// Distru demo: an order-intake agent with typed decisions and MCP tools.
// Live at /demo/distru/ (unlisted, noindex). Without a demo key the page plays a
// pre-recorded example run; with one, runs and evals hit /api/demo/distru/run/.
import { DemoLayout } from 'demos/DemoLayout';
import { getDemoKey, streamFromApi } from 'demos/client';
import {
  Button,
  Card,
  Caret,
  CardHead,
  CardTitle,
  DecisionBadge,
  Dot,
  EmptyState,
  EvalTable,
  IndexBadge,
  JsonDetails,
  JsonView,
  KeyValues,
  McpConnectCommand,
  McpToolPanel,
  MiniLabel,
  Notice,
  NoteGrid,
  OptionList,
  Pill,
  PipelineStrip,
  ProbabilityBar,
  ProbabilityBars,
  SectionHead,
  Spinner,
  Tag,
  TextArea,
  Timeline,
  TimelineStep,
  formatMs,
  pct,
  srOnly,
} from 'demos/ui';
import { useEffect, useRef, useState } from 'react';
import {
  EXAMPLE,
  ROUTES,
  ROUTE_LABELS,
  SAMPLES,
  STAGES,
  SUB_ACCEPTABLE,
  SUB_PREAPPROVED,
  applyEvent,
  emptyRun,
  evalChecks,
  formatDate,
  money,
  runOrderAgent,
} from './agent';
import styles from './Distru.module.css';
import { MCP_SERVER, MCP_TOOLS, TOOLS, callTool } from './erp';

const RUN_PATH = '/api/demo/distru/run/';
const MCP_PATH = '/api/demo/distru/mcp/';
const ROUTE_TONE = { auto_confirm: 'ok', needs_review: 'warn', hold: 'bad' };
const ROUTE_OPTIONS = ROUTES.map(route => ({
  value: route,
  label: ROUTE_LABELS[route],
  tone: ROUTE_TONE[route],
}));
const DOT_TONE = { ok: 'ok', warn: 'warn', fail: 'bad' };
const TOOL_EXAMPLES = Object.fromEntries(TOOLS.map(tool => [tool.name, tool.example]));
const PREVIEW_NOTE = 'Preview mode: live runs need the private link from my email.';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const sampleById = id => SAMPLES.find(sample => sample.id === id);
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Reveals streamed events at a readable pace (tools finish in microseconds; nobody could follow them)
const PACE = { extraction: 260, tool: 200, decision: 380 };

// Binds the event now. A closure over the loop variable would not: the client build transpiles
// async loops for older browsers, so `event` becomes one shared variable, and React runs
// updaters later, after it has moved on.
const applying = event => run => applyEvent(run, event);

function createPlayer(setRun, { instant = false } = {}) {
  const queue = [];
  let cancelled = false;
  let draining = false;

  async function drain() {
    draining = true;
    while (queue.length && !cancelled) {
      const event = queue.shift();
      setRun(applying(event));
      const wait = instant
        ? 0
        : event.t === 'stage' && event.status === 'done'
        ? 160
        : PACE[event.t] || 0;
      if (wait) await sleep(wait);
    }
    draining = false;
  }

  return {
    push(event) {
      if (cancelled) return;
      queue.push(event);
      if (!draining) drain();
    },
    cancel() {
      cancelled = true;
      queue.length = 0;
    },
  };
}

/** Streams one live run, calling onEvent for each NDJSON event. Resolves when the stream ends. */
async function streamRun(email, onEvent) {
  let buffer = '';
  let finished = false;
  const handle = line => {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    if (event.t === 'done' || event.t === 'error') finished = true;
    onEvent(event);
  };
  await streamFromApi(RUN_PATH, { email }, chunk => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop();
    lines.forEach(handle);
  });
  handle(buffer);
  if (!finished) onEvent({ t: 'error', message: 'The run ended early. Try again.' });
}

function subjectOf(email) {
  return email.match(/^subject:\s*(.+)$/im)?.[1]?.trim() || 'Your order';
}

function senderOf(email) {
  return email.match(/^from:\s*(.+)$/im)?.[1]?.trim() || '';
}

export default function DistruDemo() {
  const [sampleId, setSampleId] = useState(EXAMPLE.sampleId);
  const [email, setEmail] = useState(sampleById(EXAMPLE.sampleId).email);
  const [run, setRun] = useState(() => emptyRun('example'));
  const [hasKey, setHasKey] = useState(false);
  const [notice, setNotice] = useState('');
  const [evals, setEvals] = useState({});
  const [evalNotice, setEvalNotice] = useState('');
  const player = useRef(null);
  const traceRef = useRef(null);

  const running = run.status === 'running';
  const liveBusy = running && run.kind === 'live';
  const evalsBusy = Object.values(evals).some(item => item.status === 'running');

  function playExample() {
    player.current?.cancel();
    const fast = prefersReducedMotion();
    const current = createPlayer(setRun, { instant: fast });
    player.current = current;
    const sample = sampleById(EXAMPLE.sampleId);
    setSampleId(sample.id);
    setEmail(sample.email);
    setRun({ ...emptyRun('example'), status: 'running', model: EXAMPLE.model });

    runOrderAgent(sample.email, {
      today: EXAMPLE.today,
      extract: async () => {
        if (!fast) await sleep(EXAMPLE.timings.extract);
        return EXAMPLE.extraction;
      },
      decide: async () => {
        if (!fast) await sleep(EXAMPLE.timings.decide);
        return EXAMPLE.answers;
      },
      draftReply: async function* () {
        for (const word of EXAMPLE.reply.split(/(?<=\s)/)) {
          if (!fast) await sleep(EXAMPLE.timings.wordMs);
          yield word;
        }
      },
      // Show what the live run took, not the shortened replay wait
      emit: event =>
        current.push(
          event.t === 'stage' &&
            event.status === 'done' &&
            EXAMPLE.recordedMs?.[event.id] != null
            ? { ...event, ms: EXAMPLE.recordedMs[event.id] }
            : event
        ),
    }).catch(error => current.push({ t: 'error', message: error.message }));
  }

  useEffect(() => {
    setHasKey(Boolean(getDemoKey()));
    playExample();
    return () => player.current?.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickSample(id) {
    setSampleId(id);
    setEmail(sampleById(id).email);
    setNotice('');
  }

  async function runLive(event) {
    event?.preventDefault();
    if (!hasKey) {
      setNotice(
        sampleId === EXAMPLE.sampleId
          ? `${PREVIEW_NOTE} Replaying the pre-recorded example instead.`
          : `${PREVIEW_NOTE} The trace shows the pre-recorded example run of sample 2.`
      );
      if (sampleId === EXAMPLE.sampleId) playExample();
      return;
    }
    setNotice('');
    player.current?.cancel();
    const current = createPlayer(setRun);
    player.current = current;
    setRun({ ...emptyRun('live'), status: 'running' });
    try {
      await streamRun(email, current.push);
    } catch (error) {
      current.push({ t: 'error', message: error.message });
    }
  }

  async function runEvals() {
    if (!hasKey) {
      setEvalNotice(
        `${PREVIEW_NOTE} Expectations are listed; results appear after a live run.`
      );
      return;
    }
    setEvalNotice('');
    await Promise.all(
      SAMPLES.map(async sample => {
        setEvals(state => ({ ...state, [sample.id]: { status: 'running' } }));
        const started = performance.now();
        let result = { ...emptyRun('eval'), status: 'running', sampleId: sample.id };
        try {
          await streamRun(sample.email, event => (result = applyEvent(result, event)));
        } catch (error) {
          result = applyEvent(result, { t: 'error', message: error.message });
        }
        const entry = {
          status: result.status,
          run: result,
          ms: performance.now() - started,
        };
        setEvals(state => ({ ...state, [sample.id]: entry }));
      })
    );
  }

  function viewEvalRun(sample) {
    const item = evals[sample.id];
    if (!item?.run) return;
    player.current?.cancel();
    setSampleId(sample.id);
    setEmail(sample.email);
    setRun(item.run);
    traceRef.current?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    });
  }

  return (
    <DemoLayout
      company="Distru"
      title="Order email to confirmed order: an agent with typed decisions"
      tagline="A buyer's messy wholesale email goes in. The agent extracts the order, checks it against the ERP through the same tools an MCP client would use, lets a decision model route it with visible probabilities, then drafts the sales order and the reply."
    >
      <div className={styles.page}>
        <FlowStrip />

        <section className={styles.section} ref={traceRef} aria-labelledby="run-heading">
          <h2 id="run-heading" className={srOnly}>
            Agent run
          </h2>
          <div className={styles.gridTop}>
            <EmailPanel
              email={email}
              sampleId={sampleId}
              onPick={pickSample}
              onEdit={value => {
                setEmail(value);
                setSampleId(
                  SAMPLES.find(sample => sample.email === value)?.id || 'custom'
                );
              }}
              onRun={runLive}
              busy={liveBusy}
              notice={notice}
              hasKey={hasKey}
            />
            <TracePanel run={run} onReplay={playExample} replayDisabled={liveBusy} />
          </div>
          <div className={styles.gridMid}>
            <DecisionPanel run={run} />
            <ReplyPanel run={run} email={email} />
          </div>
          <OrderPanel run={run} />
        </section>

        <McpSection />

        <EvalSection
          evals={evals}
          onRun={runEvals}
          busy={evalsBusy}
          notice={evalNotice}
          onView={viewEvalRun}
        />

        <DesignNotes />
      </div>
    </DemoLayout>
  );
}

// --- page sections ---------------------------------------------------------------------------

const FLOW = [
  { label: 'Extract', what: 'LLM, JSON mode', cost: '1 call' },
  { label: 'Check', what: '7 MCP tools vs ERP', cost: 'code, free' },
  { label: 'Decide', what: 'Jev: route + substitution', cost: '1 call' },
  { label: 'Draft', what: 'Sales order + reply', cost: '1 call' },
];

const SAMPLE_OPTIONS = SAMPLES.map(sample => ({
  value: sample.id,
  label: sample.label,
  hint: sample.hint,
}));

function FlowStrip() {
  return <PipelineStrip steps={FLOW} />;
}

function RouteBadge({ route, size }) {
  if (!route) return null;
  return (
    <DecisionBadge tone={ROUTE_TONE[route]} size={size}>
      {ROUTE_LABELS[route] || route}
    </DecisionBadge>
  );
}

function EmailPanel({ email, sampleId, onPick, onEdit, onRun, busy, notice, hasKey }) {
  return (
    <Card as="form" className={styles.emailCard} onSubmit={onRun}>
      <CardHead>
        <CardTitle>Inbound order email</CardTitle>
        <span className={styles.muted}>editable</span>
      </CardHead>
      <OptionList
        className={styles.samples}
        label="Sample emails"
        options={SAMPLE_OPTIONS}
        value={sampleId}
        onChange={onPick}
      />
      <label className={srOnly} htmlFor="order-email">
        Order email
      </label>
      <TextArea
        id="order-email"
        className={styles.email}
        value={email}
        maxLength={4000}
        spellCheck={false}
        onChange={event => onEdit(event.target.value)}
      />
      <div className={styles.runRow}>
        <Button type="submit" disabled={busy || !email.trim()}>
          {busy ? (
            <>
              <Spinner /> Running
            </>
          ) : (
            'Run agent'
          )}
        </Button>
        <span className={styles.muted}>
          {hasKey
            ? 'Live: about 3 cents a run, repeats are cached'
            : 'Preview: example run below'}
        </span>
      </div>
      {notice && (
        <Notice size="s" className={styles.notice} role="status">
          {notice}
        </Notice>
      )}
    </Card>
  );
}

function TracePanel({ run, onReplay, replayDisabled }) {
  const totalMs = STAGES.reduce((sum, stage) => sum + (run.stages[stage.id]?.ms || 0), 0);
  return (
    <Card aria-live="polite">
      <CardHead
        aside={
          <>
            {run.status === 'done' && (
              <span className={styles.muted}>{formatMs(totalMs)}</span>
            )}
            {run.kind === 'example' && run.status !== 'running' && (
              <Button variant="link" onClick={onReplay} disabled={replayDisabled}>
                Replay
              </Button>
            )}
          </>
        }
      >
        <CardTitle>Agent run</CardTitle>
        <RunBadge run={run} />
      </CardHead>
      {run.kind === 'example' && (
        <p className={styles.exampleNote}>
          Example run of sample 2. The DeepSeek and Jev outputs were recorded from a live
          run (replayed faster; the times shown are the live ones); every tool call, rule
          and order line is computed live in your browser by the same code the API runs.
        </p>
      )}
      <Timeline>
        {STAGES.map((stage, index) => (
          <StageRow key={stage.id} index={index} stage={stage} run={run} />
        ))}
      </Timeline>
      {run.error && (
        <Notice kind="error" size="s" className={styles.error} role="alert">
          {run.error}
        </Notice>
      )}
    </Card>
  );
}

function RunBadge({ run }) {
  if (run.kind === 'example') return <Pill>Example run</Pill>;
  if (run.kind === 'eval') return <Pill>Eval run</Pill>;
  if (run.status === 'idle') return null;
  return (
    <Pill tone="live">
      Live{run.model ? ` · ${run.model}` : ''}
      {run.cached ? ' · cached' : ''}
    </Pill>
  );
}

function StageRow({ index, stage, run }) {
  const state = run.stages[stage.id] || { status: 'pending' };
  const tools = run.tools.filter(tool => tool.stage === stage.id);
  return (
    <TimelineStep
      index={index}
      status={state.status}
      title={stage.label}
      detail={stage.detail}
      ms={state.ms}
    >
      {stage.id === 'extract' && run.extraction && <ExtractionView data={run.extraction} />}
      {tools.length > 0 && (
        <ul className={styles.tools}>
          {tools.map((tool, toolIndex) => (
            <ToolRow key={`${tool.name}-${toolIndex}`} tool={tool} />
          ))}
        </ul>
      )}
      {stage.id === 'decide' && run.decision && <DecisionLine decision={run.decision} />}
      {stage.id === 'draft' && run.reply && (
        <p className={styles.stageNote}>
          Reply {state.status === 'done' ? 'drafted' : 'streaming'} ·{' '}
          {run.reply.trim().split(/\s+/).length} words
        </p>
      )}
    </TimelineStep>
  );
}

function ExtractionView({ data }) {
  const fields = [
    [
      'Customer',
      [data.customer.name, data.customer.buyer_name].filter(Boolean).join(' · ') ||
        'not found',
    ],
    ['License', data.license_number || 'not in email'],
    [
      'Delivery',
      data.requested_delivery_date
        ? formatDate(data.requested_delivery_date)
        : 'not given',
    ],
    ['PO', data.po_number || 'none'],
  ];
  return (
    <div className={styles.extract}>
      <KeyValues className={styles.fields} items={fields} />
      <ul className={styles.extractLines}>
        {data.lines.map((line, index) => (
          <li key={index}>
            <span className={styles.quote}>{line.text}</span>
            <span className={styles.qty}>
              {line.qty ?? '?'}{' '}
              {line.unit === 'case' ? (line.qty === 1 ? 'case' : 'cases') : 'units'}
              {line.qty_vague && <Tag tone="warn">vague</Tag>}
            </span>
          </li>
        ))}
      </ul>
      <JsonDetails summary="Structured output (JSON)" value={data} />
    </div>
  );
}

function ToolRow({ tool }) {
  const args = JSON.stringify(tool.args);
  return (
    <li className={styles.tool}>
      <details>
        <summary>
          <Dot tone={DOT_TONE[tool.summary.level]} className={styles.toolDot} />
          <span className={styles.toolCall}>
            <code className={styles.toolName}>{tool.name}</code>
            <code className={styles.toolArgs}>{args}</code>
          </span>
          <span className={styles.toolSummary}>{tool.summary.text}</span>
        </summary>
        <div className={styles.toolDetail}>
          <div>
            <MiniLabel>arguments</MiniLabel>
            <JsonView value={tool.args} />
          </div>
          <div>
            <MiniLabel>result · {formatMs(tool.ms)}</MiniLabel>
            <JsonView value={tool.result} />
          </div>
        </div>
      </details>
    </li>
  );
}

function DecisionLine({ decision }) {
  return (
    <p className={styles.stageNote}>
      {decision.model ? (
        <>
          Jev picked <strong>{ROUTE_LABELS[decision.model.choice]}</strong> (
          {pct(decision.model.probabilities[decision.model.choice])})
          {decision.escalated && (
            <>
              , rules escalated to <strong>{ROUTE_LABELS[decision.route]}</strong>
            </>
          )}
          {decision.substitution.p != null && (
            <> · substitute OK {pct(decision.substitution.p)}</>
          )}
        </>
      ) : (
        <>Routed by rules: {ROUTE_LABELS[decision.route]}</>
      )}
    </p>
  );
}

function DecisionPanel({ run }) {
  const decision = run.decision;
  return (
    <Card>
      <CardHead>
        <CardTitle>Decision</CardTitle>
        <Pill>Jev · 1 call, 2 typed questions</Pill>
      </CardHead>
      {!decision ? (
        <Placeholder
          running={run.status === 'running'}
          text="Routing appears after the checks."
        />
      ) : (
        <>
          <div className={styles.decisionBlock}>
            <p className={styles.question}>
              <code>route</code> choice: auto_confirm, needs_review or hold?
            </p>
            {decision.model ? (
              <ProbabilityBars
                options={ROUTE_OPTIONS}
                probabilities={decision.model.probabilities}
                choice={decision.model.choice}
              />
            ) : (
              <p className={styles.muted}>{decision.error}</p>
            )}
          </div>

          <div className={styles.final}>
            <div className={styles.finalHead}>
              <MiniLabel className={styles.finalLabel}>Final route</MiniLabel>
              <RouteBadge route={decision.route} size="l" />
            </div>
            <p className={styles.finalWhy}>
              {decision.escalated
                ? `Rules escalated Jev's ${ROUTE_LABELS[
                    decision.model.choice
                  ].toLowerCase()} to ${ROUTE_LABELS[
                    decision.route
                  ].toLowerCase()}. Code can make a route stricter, never looser.`
                : decision.model
                ? `Jev's pick, and at least as strict as the rules require (floor: ${ROUTE_LABELS[
                    decision.floor
                  ].toLowerCase()}).`
                : 'Decided by the rules alone.'}
            </p>
            {decision.flags.length > 0 ? (
              <ul className={styles.flags}>
                {decision.flags.map((flag, index) => (
                  <li key={index}>
                    <Dot tone={flag.level === 'hold' ? 'bad' : 'warn'} />
                    <span>{flag.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.muted}>No rule flags: every check passed.</p>
            )}
          </div>

          <div className={styles.decisionBlock}>
            <p className={styles.question}>
              <code>substitution_ok</code> noul: would this buyer accept a substitute?
            </p>
            {decision.substitution.p != null ? (
              <>
                <ProbabilityBar
                  label="Yes"
                  value={decision.substitution.p}
                  tone={
                    !decision.substitution.relevant
                      ? undefined
                      : decision.substitution.p >= SUB_ACCEPTABLE
                      ? 'ok'
                      : 'bad'
                  }
                  strong
                  marks={[SUB_ACCEPTABLE, SUB_PREAPPROVED]}
                />
                <p className={styles.subNote}>
                  {substitutionText(decision.substitution)}
                </p>
              </>
            ) : (
              <p className={styles.muted}>No answer.</p>
            )}
          </div>

          <JsonDetails summary="What Jev saw (state JSON)" value={decision.state} />
        </>
      )}
    </Card>
  );
}

function substitutionText({ p, relevant }) {
  if (!relevant)
    return 'Asked on every run; nothing is out of stock here, so it does not change the order.';
  if (p >= SUB_PREAPPROVED) return 'Above 80%: the substitute ships without asking.';
  if (p >= SUB_ACCEPTABLE)
    return 'Between 50% and 80%: substitute pencilled in, buyer asked to confirm.';
  return 'Below 50%: no swap. The line is backordered instead.';
}

function Placeholder({ running, text }) {
  return (
    <EmptyState size="s" loading={running}>
      {running ? 'Waiting…' : text}
    </EmptyState>
  );
}

function ReplyPanel({ run, email }) {
  const streaming = run.stages.draft?.status === 'running';
  const to = senderOf(email);
  return (
    <Card>
      <CardHead aside={run.decision ? <RouteBadge route={run.decision.route} /> : null}>
        <CardTitle>Reply to buyer</CardTitle>
        <Pill>LLM draft</Pill>
      </CardHead>
      {!run.reply ? (
        <Placeholder
          running={run.status === 'running'}
          text="The draft reply appears here."
        />
      ) : (
        <div className={styles.mail}>
          <div className={styles.mailHead}>
            {to && (
              <div>
                <span>To</span>
                {to}
              </div>
            )}
            <div>
              <span>Subject</span>Re: {subjectOf(email)}
            </div>
          </div>
          <p className={styles.mailBody}>
            {run.reply}
            {streaming && <Caret variant="soft" />}
          </p>
        </div>
      )}
      {run.question && run.decision?.route !== 'auto_confirm' && (
        <p className={styles.oneQuestion}>
          <MiniLabel>The one question (picked by rules)</MiniLabel>
          {run.question}
        </p>
      )}
    </Card>
  );
}

function OrderPanel({ run }) {
  const order = run.order;
  return (
    <Card className={styles.orderCard}>
      <CardHead aside={<Pill>draft_sales_order · not submitted</Pill>}>
        <CardTitle>Draft sales order</CardTitle>
        {order && <code className={styles.orderId}>{order.order_id}</code>}
      </CardHead>
      {!order ? (
        <Placeholder
          running={run.status === 'running'}
          text={
            run.status === 'done'
              ? 'No order drafted: the account or items were not found.'
              : 'The priced order appears here.'
          }
        />
      ) : (
        <>
          <KeyValues
            className={styles.orderMeta}
            items={[
              [
                'Customer',
                <>
                  {order.customer} <span className={styles.muted}>{order.account_id}</span>
                </>,
              ],
              ['Price tier', order.price_tier],
              ['Terms', order.terms],
              [
                'Delivery',
                order.delivery_date ? formatDate(order.delivery_date) : 'to confirm',
              ],
            ]}
          />
          <div className={styles.orderTable} role="table" aria-label="Order lines">
            <div className={styles.orderHeader} role="row">
              <span role="columnheader">Product</span>
              <span role="columnheader">Units</span>
              <span role="columnheader">Unit price</span>
              <span role="columnheader">Total</span>
            </div>
            {order.lines.map((line, index) => (
              <div
                key={`${line.sku}-${index}`}
                className={styles.orderRow}
                role="row"
                data-backorder={line.backorder || undefined}
              >
                <span role="cell" className={styles.orderProduct}>
                  <strong>{line.name}</strong>
                  <span className={styles.orderCodes}>
                    {line.sku} · batch {line.batch} · tag {line.package_tag}
                  </span>
                  {line.note && (
                    <span className={styles.orderNote}>
                      <Tag tone={lineTone(line)} className={styles.noteTag}>
                        {lineTag(line)}
                      </Tag>
                      {line.note}
                    </span>
                  )}
                </span>
                <span role="cell" className={styles.num} data-label="Units">
                  {line.qty}
                  {line.requested !== line.qty && (
                    <span className={styles.muted}> / {line.requested}</span>
                  )}
                </span>
                <span role="cell" className={styles.num} data-label="Unit price">
                  {money(line.unit_price)}
                </span>
                <span
                  role="cell"
                  className={`${styles.num} ${styles.lineTotal}`}
                  data-label="Total"
                >
                  {money(line.line_total)}
                </span>
              </div>
            ))}
            <div className={styles.orderFoot} role="row">
              <span role="cell">Order total</span>
              <span role="cell" className={styles.num}>
                {money(order.total)}
              </span>
            </div>
          </div>
          <p className={styles.footnote}>{order.note}</p>
        </>
      )}
    </Card>
  );
}

function lineTag(line) {
  if (line.substitute_for) return 'substitute';
  if (line.backorder) return 'backorder';
  if (line.requested !== line.qty) return 'short';
  return 'confirm qty';
}

function lineTone(line) {
  if (line.substitute_for) return /OK per email/.test(line.note) ? 'ok' : 'warn';
  if (line.backorder) return 'bad';
  return 'warn';
}

// --- MCP --------------------------------------------------------------------------------------

function toolErrorText(error) {
  return error.toolError ? error.message : 'The tool could not run with these arguments.';
}

function McpSection() {
  const [origin, setOrigin] = useState('https://haiderb.com');
  const command = `claude mcp add --transport http ${MCP_SERVER.name} ${origin}${MCP_PATH}`;

  useEffect(() => setOrigin(window.location.origin), []);

  return (
    <section className={styles.section} aria-labelledby="mcp-heading">
      <SectionHead
        titleId="mcp-heading"
        title="Same tools, served over MCP"
        lede={
          <>
            The agent doesn&apos;t call private helpers. It calls the{' '}
            <code>{MCP_SERVER.name}</code> tool layer, which is also an MCP server, so
            Claude or Codex run the same checks against the same data. One implementation,
            two callers, one set of evals.
          </>
        }
      />

      <div className={styles.callers} aria-hidden>
        <div className={styles.callerCol}>
          <span className={styles.callerBox}>Order agent (above)</span>
          <span className={styles.callerBox}>Claude / Codex via MCP</span>
        </div>
        <span className={styles.callerArrow} />
        <span className={`${styles.callerBox} ${styles.callerHub}`}>
          <code>{MCP_SERVER.name}</code>
          <small>7 tools · JSON Schema · read-only</small>
        </span>
        <span className={styles.callerArrow} />
        <span className={styles.callerBox}>
          ERP + CRM + license registry (sample data)
        </span>
      </div>

      <McpToolPanel
        tools={MCP_TOOLS}
        examples={TOOL_EXAMPLES}
        initialTool="check_license"
        call={callTool}
        errorText={toolErrorText}
      />

      <McpConnectCommand
        className={styles.connect}
        label="Connect from Claude Code (stateless JSON-RPC, sample data, rate limited)"
        command={command}
      />
    </section>
  );
}

// --- evals ------------------------------------------------------------------------------------

const pretty = value => (value == null ? '–' : String(value).replace('_', ' '));

function EvalSection({ evals, onRun, busy, notice, onView }) {
  const done = SAMPLES.map(sample => evals[sample.id]).filter(item => item?.run?.summary);
  const checks = SAMPLES.flatMap(sample => {
    const item = evals[sample.id];
    return item?.run?.summary ? evalChecks(item.run.summary, sample.expect) : [];
  });
  const passed = checks.filter(check => check.pass).length;
  const allDone = done.length === SAMPLES.length && !busy;

  return (
    <section className={styles.section} aria-labelledby="eval-heading">
      <SectionHead
        titleId="eval-heading"
        title="Evals"
        lede="Each sample has expected outcomes. Run evals sends all three emails through the live agent and grades the final route, the license flag and the substitution call. Real runs, about 9 cents; identical emails replay from cache."
      />
      <div className={styles.evalBar}>
        <Button onClick={onRun} disabled={busy}>
          {busy ? (
            <>
              <Spinner /> Running 3 evals
            </>
          ) : (
            'Run evals'
          )}
        </Button>
        {checks.length > 0 && (
          <span
            className={styles.evalScore}
            data-all={allDone && passed === checks.length ? 'pass' : undefined}
          >
            {passed}/{checks.length} checks passed
          </span>
        )}
        {notice && (
          <Notice as="span" size="s" role="status">
            {notice}
          </Notice>
        )}
      </div>
      <div className={styles.evalGrid}>
        {SAMPLES.map((sample, index) => {
          const item = evals[sample.id];
          const summary = item?.run?.summary;
          const rows = evalChecks(summary, sample.expect).map(row => ({
            ...row,
            expected: pretty(row.expected),
            actual: row.actual != null && pretty(row.actual),
          }));
          return (
            <Card as="article" key={sample.id} className={styles.evalCard}>
              <CardHead
                nowrap
                aside={
                  <>
                    {item?.status === 'running' && <Spinner />}
                    {item?.status === 'error' && <Pill tone="bad">error</Pill>}
                  </>
                }
              >
                <IndexBadge>{index + 1}</IndexBadge>
                <CardTitle size="s">{sample.label}</CardTitle>
              </CardHead>
              <EvalTable rows={rows} />
              <div className={styles.evalFoot}>
                {summary ? (
                  <>
                    <span className={styles.muted}>
                      {summary.model_route
                        ? `Jev: ${ROUTE_LABELS[summary.model_route].toLowerCase()} ${pct(
                            summary.model_p
                          )}`
                        : 'Rules only'}
                      {item.ms ? ` · ${formatMs(item.ms)}` : ''}
                    </span>
                    <Button variant="link" onClick={() => onView(sample)}>
                      View run
                    </Button>
                  </>
                ) : (
                  <span className={styles.muted}>
                    {item?.status === 'error'
                      ? item.run?.error || 'Run failed'
                      : 'Not run yet'}
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

const NOTES = [
  {
    title: 'The LLM never decides',
    text: 'It extracts and writes. Deterministic tools check the facts, and Jev returns probabilities that code acts on.',
  },
  {
    title: 'Rules only escalate',
    text: "Hard checks (license, credit, account) run in code after the model, so a persuasive or hostile email can't talk its way into auto-confirm.",
  },
  {
    title: 'One tool layer',
    text: 'The agent and MCP clients call the same functions, so these evals cover what Claude or Codex would get too.',
  },
  {
    title: 'Cheap and cached',
    text: 'Two small LLM calls and one Jev call per order, about 3 cents. Repeat emails replay from cache for free.',
  },
];

function DesignNotes() {
  return (
    <section className={styles.section} aria-labelledby="notes-heading">
      <SectionHead titleId="notes-heading" title="Design choices" flush />
      <NoteGrid className={styles.notes} items={NOTES} />
    </section>
  );
}

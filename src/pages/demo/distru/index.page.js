// Distru demo: an order-intake agent with typed decisions and MCP tools.
// Live at /demo/distru/ (unlisted, noindex). Without a demo key the page plays a
// pre-recorded example run; with one, runs and evals hit /api/demo/distru/run/.
import { DemoLayout } from 'demos/DemoLayout';
import { getDemoKey, streamFromApi } from 'demos/client';
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
import { Bar, Check, Dot, JsonView, RouteBadge, Spinner, formatMs, pct } from './ui';

const RUN_PATH = '/api/demo/distru/run/';
const MCP_PATH = '/api/demo/distru/mcp/';
const ROUTE_TONE = { auto_confirm: 'ok', needs_review: 'warn', hold: 'bad' };
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
      emit: current.push,
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
          <h2 id="run-heading" className={styles.srOnly}>
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

function FlowStrip() {
  const steps = [
    { label: 'Extract', what: 'LLM, JSON mode', cost: '1 call' },
    { label: 'Check', what: '7 MCP tools vs ERP', cost: 'code, free' },
    { label: 'Decide', what: 'Jev: route + substitution', cost: '1 call' },
    { label: 'Draft', what: 'Sales order + reply', cost: '1 call' },
  ];
  return (
    <ol className={styles.flow} aria-label="How a run works">
      {steps.map((step, index) => (
        <li key={step.label} className={styles.flowStep}>
          <span className={styles.flowIndex}>{index + 1}</span>
          <span className={styles.flowText}>
            <strong>{step.label}</strong>
            <span>{step.what}</span>
          </span>
          <span className={styles.flowCost}>{step.cost}</span>
        </li>
      ))}
    </ol>
  );
}

function EmailPanel({ email, sampleId, onPick, onEdit, onRun, busy, notice, hasKey }) {
  return (
    <form className={`${styles.card} ${styles.emailCard}`} onSubmit={onRun}>
      <div className={styles.cardHead}>
        <h3 className={styles.cardTitle}>Inbound order email</h3>
        <span className={styles.muted}>editable</span>
      </div>
      <div className={styles.samples} role="group" aria-label="Sample emails">
        {SAMPLES.map((sample, index) => (
          <button
            key={sample.id}
            type="button"
            className={styles.sample}
            aria-pressed={sampleId === sample.id}
            onClick={() => onPick(sample.id)}
          >
            <span className={styles.sampleIndex}>{index + 1}</span>
            <span className={styles.sampleText}>
              <strong>{sample.label}</strong>
              <span>{sample.hint}</span>
            </span>
          </button>
        ))}
      </div>
      <label className={styles.srOnly} htmlFor="order-email">
        Order email
      </label>
      <textarea
        id="order-email"
        className={styles.textarea}
        value={email}
        maxLength={4000}
        spellCheck={false}
        onChange={event => onEdit(event.target.value)}
      />
      <div className={styles.runRow}>
        <button className={styles.button} type="submit" disabled={busy || !email.trim()}>
          {busy ? (
            <>
              <Spinner /> Running
            </>
          ) : (
            'Run agent'
          )}
        </button>
        <span className={styles.muted}>
          {hasKey
            ? 'Live: about 3 cents a run, repeats are cached'
            : 'Preview: example run below'}
        </span>
      </div>
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
    </form>
  );
}

function TracePanel({ run, onReplay, replayDisabled }) {
  const totalMs = STAGES.reduce((sum, stage) => sum + (run.stages[stage.id]?.ms || 0), 0);
  return (
    <div className={`${styles.card} ${styles.traceCard}`} aria-live="polite">
      <div className={styles.cardHead}>
        <h3 className={styles.cardTitle}>Agent run</h3>
        <RunBadge run={run} />
        <span className={styles.headRight}>
          {run.status === 'done' && (
            <span className={styles.muted}>{formatMs(totalMs)}</span>
          )}
          {run.kind === 'example' && run.status !== 'running' && (
            <button
              type="button"
              className={styles.linkButton}
              onClick={onReplay}
              disabled={replayDisabled}
            >
              Replay
            </button>
          )}
        </span>
      </div>
      {run.kind === 'example' && (
        <p className={styles.exampleNote}>
          Example run of sample 2. Model outputs are pre-recorded; every tool call, rule
          and order line is computed live in your browser by the same code the API runs.
        </p>
      )}
      <ol className={styles.stages}>
        {STAGES.map((stage, index) => (
          <StageRow key={stage.id} index={index} stage={stage} run={run} />
        ))}
      </ol>
      {run.error && (
        <p className={styles.error} role="alert">
          {run.error}
        </p>
      )}
    </div>
  );
}

function RunBadge({ run }) {
  if (run.kind === 'example')
    return (
      <span className={styles.pill} data-tone="info">
        Example run
      </span>
    );
  if (run.kind === 'eval')
    return (
      <span className={styles.pill} data-tone="info">
        Eval run
      </span>
    );
  if (run.status === 'idle') return null;
  return (
    <span className={styles.pill} data-tone="live">
      Live{run.model ? ` · ${run.model}` : ''}
      {run.cached ? ' · cached' : ''}
    </span>
  );
}

function StageRow({ index, stage, run }) {
  const state = run.stages[stage.id] || { status: 'pending' };
  const tools = run.tools.filter(tool => tool.stage === stage.id);
  return (
    <li className={styles.stage} data-status={state.status}>
      <span className={styles.stageMarker}>
        {state.status === 'running' ? (
          <Spinner />
        ) : state.status === 'done' ? (
          <Check pass />
        ) : (
          index + 1
        )}
      </span>
      <div className={styles.stageBody}>
        <div className={styles.stageHead}>
          <strong>{stage.label}</strong>
          <span className={styles.muted}>{stage.detail}</span>
          {state.ms != null && (
            <span className={styles.stageMs}>{formatMs(state.ms)}</span>
          )}
        </div>
        {stage.id === 'extract' && run.extraction && (
          <ExtractionView data={run.extraction} />
        )}
        {tools.length > 0 && (
          <ul className={styles.tools}>
            {tools.map((tool, toolIndex) => (
              <ToolRow key={`${tool.name}-${toolIndex}`} tool={tool} />
            ))}
          </ul>
        )}
        {stage.id === 'decide' && run.decision && (
          <DecisionLine decision={run.decision} />
        )}
        {stage.id === 'draft' && run.reply && (
          <p className={styles.stageNote}>
            Reply {state.status === 'done' ? 'drafted' : 'streaming'} ·{' '}
            {run.reply.trim().split(/\s+/).length} words
          </p>
        )}
      </div>
    </li>
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
      <dl className={styles.fields}>
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <ul className={styles.extractLines}>
        {data.lines.map((line, index) => (
          <li key={index}>
            <span className={styles.quote}>{line.text}</span>
            <span className={styles.qty}>
              {line.qty ?? '?'}{' '}
              {line.unit === 'case' ? (line.qty === 1 ? 'case' : 'cases') : 'units'}
              {line.qty_vague && (
                <span className={styles.tag} data-tone="warn">
                  vague
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
      <details className={styles.raw}>
        <summary>Structured output (JSON)</summary>
        <JsonView value={data} />
      </details>
    </div>
  );
}

function ToolRow({ tool }) {
  const args = JSON.stringify(tool.args);
  return (
    <li className={styles.tool}>
      <details>
        <summary>
          <Dot level={tool.summary.level} />
          <span className={styles.toolCall}>
            <code className={styles.toolName}>{tool.name}</code>
            <code className={styles.toolArgs}>{args}</code>
          </span>
          <span className={styles.toolSummary}>{tool.summary.text}</span>
        </summary>
        <div className={styles.toolDetail}>
          <div>
            <span className={styles.miniLabel}>arguments</span>
            <JsonView value={tool.args} />
          </div>
          <div>
            <span className={styles.miniLabel}>result · {formatMs(tool.ms)}</span>
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
    <div className={`${styles.card} ${styles.decisionCard}`}>
      <div className={styles.cardHead}>
        <h3 className={styles.cardTitle}>Decision</h3>
        <span className={styles.pill} data-tone="info">
          Jev · 1 call, 2 typed questions
        </span>
      </div>
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
              <div className={styles.bars}>
                {ROUTES.map(route => (
                  <Bar
                    key={route}
                    label={ROUTE_LABELS[route]}
                    value={decision.model.probabilities[route] || 0}
                    tone={ROUTE_TONE[route]}
                    strong={decision.model.choice === route}
                  />
                ))}
              </div>
            ) : (
              <p className={styles.muted}>{decision.error}</p>
            )}
          </div>

          <div className={styles.final}>
            <div className={styles.finalHead}>
              <span className={styles.miniLabel}>Final route</span>
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
                    <Dot level={flag.level === 'hold' ? 'fail' : 'warn'} />
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
                <Bar
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

          <details className={styles.raw}>
            <summary>What Jev saw (state JSON)</summary>
            <JsonView value={decision.state} />
          </details>
        </>
      )}
    </div>
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
    <div className={styles.placeholder}>
      {running && <Spinner />}
      <span>{running ? 'Waiting…' : text}</span>
    </div>
  );
}

function ReplyPanel({ run, email }) {
  const streaming = run.stages.draft?.status === 'running';
  const to = senderOf(email);
  return (
    <div className={`${styles.card} ${styles.replyCard}`}>
      <div className={styles.cardHead}>
        <h3 className={styles.cardTitle}>Reply to buyer</h3>
        <span className={styles.pill} data-tone="info">
          LLM draft
        </span>
        {run.decision && (
          <span className={styles.headRight}>
            <RouteBadge route={run.decision.route} />
          </span>
        )}
      </div>
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
            {streaming && <span className={styles.caret} aria-hidden />}
          </p>
        </div>
      )}
      {run.question && run.decision?.route !== 'auto_confirm' && (
        <p className={styles.oneQuestion}>
          <span className={styles.miniLabel}>The one question (picked by rules)</span>
          {run.question}
        </p>
      )}
    </div>
  );
}

function OrderPanel({ run }) {
  const order = run.order;
  return (
    <div className={`${styles.card} ${styles.orderCard}`}>
      <div className={styles.cardHead}>
        <h3 className={styles.cardTitle}>Draft sales order</h3>
        {order && <code className={styles.orderId}>{order.order_id}</code>}
        <span className={styles.headRight}>
          <span className={styles.pill} data-tone="info">
            draft_sales_order · not submitted
          </span>
        </span>
      </div>
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
          <dl className={styles.orderMeta}>
            <div>
              <dt>Customer</dt>
              <dd>
                {order.customer} <span className={styles.muted}>{order.account_id}</span>
              </dd>
            </div>
            <div>
              <dt>Price tier</dt>
              <dd>{order.price_tier}</dd>
            </div>
            <div>
              <dt>Terms</dt>
              <dd>{order.terms}</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>
                {order.delivery_date ? formatDate(order.delivery_date) : 'to confirm'}
              </dd>
            </div>
          </dl>
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
                      <span className={styles.tag} data-tone={lineTone(line)}>
                        {lineTag(line)}
                      </span>
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
    </div>
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

function McpSection() {
  const [name, setName] = useState('check_license');
  const [args, setArgs] = useState(() =>
    JSON.stringify(TOOLS.find(tool => tool.name === 'check_license').example, null, 2)
  );
  const [result, setResult] = useState(null);
  const [origin, setOrigin] = useState('https://haiderb.com');
  const [copied, setCopied] = useState(false);
  const callId = useRef(0);
  const tool = MCP_TOOLS.find(item => item.name === name);
  const command = `claude mcp add --transport http ${MCP_SERVER.name} ${origin}${MCP_PATH}`;

  useEffect(() => setOrigin(window.location.origin), []);

  function select(next) {
    setName(next);
    setArgs(JSON.stringify(TOOLS.find(item => item.name === next).example, null, 2));
    setResult(null);
  }

  function call(event) {
    event.preventDefault();
    let parsed;
    try {
      parsed = args.trim() ? JSON.parse(args) : {};
    } catch {
      setResult({ error: 'Arguments are not valid JSON.' });
      return;
    }
    const request = {
      jsonrpc: '2.0',
      id: ++callId.current,
      method: 'tools/call',
      params: { name, arguments: parsed },
    };
    const started = performance.now();
    let response;
    try {
      response = { isError: false, structuredContent: callTool(name, parsed) };
    } catch (error) {
      response = {
        isError: true,
        content: [
          {
            type: 'text',
            text: error.toolError
              ? error.message
              : 'The tool could not run with these arguments.',
          },
        ],
      };
    }
    setResult({ request, response, ms: performance.now() - started });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className={styles.section} aria-labelledby="mcp-heading">
      <div className={styles.sectionHead}>
        <h2 id="mcp-heading" className={styles.h2}>
          Same tools, served over MCP
        </h2>
        <p className={styles.lede}>
          The agent doesn&apos;t call private helpers. It calls the{' '}
          <code>{MCP_SERVER.name}</code> tool layer, which is also an MCP server, so
          Claude or Codex run the same checks against the same data. One implementation,
          two callers, one set of evals.
        </p>
      </div>

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

      <div className={`${styles.card} ${styles.mcpCard}`}>
        <div className={styles.toolList} role="tablist" aria-label="Tools">
          {MCP_TOOLS.map(item => (
            <button
              key={item.name}
              type="button"
              role="tab"
              aria-selected={item.name === name}
              className={styles.toolTab}
              onClick={() => select(item.name)}
            >
              <code>{item.name}</code>
              <span>{item.title}</span>
            </button>
          ))}
        </div>
        <div className={styles.toolPane} role="tabpanel">
          <div className={styles.toolDef}>
            <div className={styles.cardHead}>
              <h3 className={styles.cardTitle}>
                <code>{tool.name}</code>
              </h3>
              <span className={styles.pill} data-tone="ok">
                readOnlyHint
              </span>
            </div>
            <p className={styles.toolDesc}>{tool.description}</p>
            <details className={styles.raw} open>
              <summary>Tool definition (tools/list)</summary>
              <JsonView value={tool} className={styles.jsonTall} />
            </details>
          </div>
          <form className={styles.tryBox} onSubmit={call}>
            <label className={styles.miniLabel} htmlFor="tool-args">
              arguments
            </label>
            <textarea
              id="tool-args"
              className={`${styles.textarea} ${styles.code}`}
              value={args}
              spellCheck={false}
              rows={6}
              onChange={event => setArgs(event.target.value)}
            />
            <div className={styles.runRow}>
              <button className={styles.button} type="submit">
                Call tool
              </button>
              <span className={styles.muted}>
                Free: runs in your browser against the sample data
              </span>
            </div>
            {result?.error && <p className={styles.error}>{result.error}</p>}
            {result?.response && (
              <div className={styles.rpc}>
                <div>
                  <span className={styles.miniLabel}>request</span>
                  <JsonView value={result.request} />
                </div>
                <div>
                  <span className={styles.miniLabel}>
                    result{result.response.isError ? ' · isError' : ''} ·{' '}
                    {formatMs(result.ms)}
                  </span>
                  <JsonView value={result.response} className={styles.jsonTall} />
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      <div className={styles.connect}>
        <span className={styles.miniLabel}>
          Connect from Claude Code (stateless JSON-RPC, sample data, rate limited)
        </span>
        <div className={styles.connectRow}>
          <code className={styles.command}>{command}</code>
          <button type="button" className={styles.ghostButton} onClick={copy}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </section>
  );
}

// --- evals ------------------------------------------------------------------------------------

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
      <div className={styles.sectionHead}>
        <h2 id="eval-heading" className={styles.h2}>
          Evals
        </h2>
        <p className={styles.lede}>
          Each sample has expected outcomes. Run evals sends all three emails through the
          live agent and grades the final route, the license flag and the substitution
          call. Real runs, about 9 cents; identical emails replay from cache.
        </p>
      </div>
      <div className={styles.evalBar}>
        <button className={styles.button} type="button" onClick={onRun} disabled={busy}>
          {busy ? (
            <>
              <Spinner /> Running 3 evals
            </>
          ) : (
            'Run evals'
          )}
        </button>
        {checks.length > 0 && (
          <span
            className={styles.evalScore}
            data-all={allDone && passed === checks.length ? 'pass' : undefined}
          >
            {passed}/{checks.length} checks passed
          </span>
        )}
        {notice && (
          <span className={styles.notice} role="status">
            {notice}
          </span>
        )}
      </div>
      <div className={styles.evalGrid}>
        {SAMPLES.map((sample, index) => {
          const item = evals[sample.id];
          const summary = item?.run?.summary;
          const rows = evalChecks(summary, sample.expect);
          return (
            <article key={sample.id} className={`${styles.card} ${styles.evalCard}`}>
              <div className={styles.cardHead}>
                <span className={styles.sampleIndex}>{index + 1}</span>
                <h3 className={styles.cardTitle}>{sample.label}</h3>
                <span className={styles.headRight}>
                  {item?.status === 'running' && <Spinner />}
                  {item?.status === 'error' && (
                    <span className={styles.pill} data-tone="bad">
                      error
                    </span>
                  )}
                </span>
              </div>
              <div className={styles.evalTable}>
                <span className={styles.evalHead}>Check</span>
                <span className={styles.evalHead}>Expected</span>
                <span className={styles.evalHead}>Actual</span>
                {rows.map(row => (
                  <EvalRow key={row.id} row={row} />
                ))}
              </div>
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
                    <button
                      type="button"
                      className={styles.linkButton}
                      onClick={() => onView(sample)}
                    >
                      View run
                    </button>
                  </>
                ) : (
                  <span className={styles.muted}>
                    {item?.status === 'error'
                      ? item.run?.error || 'Run failed'
                      : 'Not run yet'}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function EvalRow({ row }) {
  const pretty = value => (value == null ? '–' : String(value).replace('_', ' '));
  return (
    <>
      <span className={styles.evalLabel}>{row.label}</span>
      <span className={styles.evalValue}>{pretty(row.expected)}</span>
      <span className={styles.evalValue} data-pass={row.pass ?? undefined}>
        <Check pass={row.pass} />
        {row.actual != null && pretty(row.actual)}
      </span>
    </>
  );
}

function DesignNotes() {
  const notes = [
    [
      'The LLM never decides',
      'It extracts and writes. Deterministic tools check the facts, and Jev returns probabilities that code acts on.',
    ],
    [
      'Rules only escalate',
      "Hard checks (license, credit, account) run in code after the model, so a persuasive or hostile email can't talk its way into auto-confirm.",
    ],
    [
      'One tool layer',
      'The agent and MCP clients call the same functions, so these evals cover what Claude or Codex would get too.',
    ],
    [
      'Cheap and cached',
      'Two small LLM calls and one Jev call per order, about 3 cents. Repeat emails replay from cache for free.',
    ],
  ];
  return (
    <section className={styles.section} aria-labelledby="notes-heading">
      <h2 id="notes-heading" className={styles.h2}>
        Design choices
      </h2>
      <ul className={styles.notes}>
        {notes.map(([title, text]) => (
          <li key={title}>
            <strong>{title}</strong>
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

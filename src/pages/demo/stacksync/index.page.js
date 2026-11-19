// Stacksync demo: a guardrailed CRM-to-ERP sync agent.
// Live at /demo/stacksync/ (unlisted, noindex). A CRM deal becomes a typed ERP sales-order write
// plan (LLM, JSON mode), code validates it against a schema and the ERP tables, a decision model
// gives the route with probabilities (auto-apply / approval queue / block) and code has the final
// say. "Apply" writes once under an idempotency key derived from the deal id + plan hash; a replayed
// retry is a no-op. The three samples replay recorded model outputs (instant); an edited deal runs
// live with a demo key through /api/demo/stacksync/plan/. Notes in ./README.md.
import { DemoLayout } from 'demos/DemoLayout';
import { getDemoKey, postJson } from 'demos/client';
import { NoteGrid, PipelineStrip, SectionHead, formatMs, pct, srOnly } from 'demos/ui';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CUSTOMERS, SAMPLES, sampleById } from './data';
import { EXAMPLES, EXAMPLE_META, slipped } from './example';
import { ApplyCard, AuditCard, ChecksCard, DealCard, ErpCard, MapCard, QueueList, VerdictCard, shortKey } from './panels';
import {
  ROUTE_LABEL,
  SESSION_PATTERN,
  applyOnce,
  fieldMap,
  finalRoute,
  idempotencyKey,
  memoryStore,
  money,
  newSessionId,
  planHash,
  readDeal,
  summarize,
  validatePlan,
} from './sync';
import styles from './Stacksync.module.css';

const API = '/api/demo/stacksync';
const NAV = [
  { href: '#route', label: 'Route' },
  { href: '#plan', label: 'Plan + checks' },
  { href: '#apply', label: 'Write once' },
  { href: '#queue', label: 'Approvals' },
  { href: '#audit', label: 'Audit' },
];

const FLOW = [
  { label: 'Read', what: 'The closed-won deal from the CRM', cost: 'free' },
  { label: 'Plan', what: 'The LLM drafts a typed ERP sales order', cost: '1 call' },
  { label: 'Check', what: 'Schema, mappings, totals, currency, policy', cost: 'code, free' },
  { label: 'Route', what: 'A fast decision model: apply, approve or block', cost: '1 call' },
  { label: 'Write', what: 'Once, under an idempotency key', cost: 'free' },
];

const NOTES = [
  {
    title: 'The model drafts, code decides',
    text: 'The LLM only proposes a write plan. It is parsed against a strict schema (unknown fields rejected) and checked against the ERP tables in code, so a confident wrong answer cannot reach the ERP.',
  },
  {
    title: 'Probabilities, then a floor',
    text: 'The decision model routes with probabilities you can threshold and audit. Code sets the floor: any failed hard check blocks, any policy flag needs a person. The model can be stricter, never looser.',
  },
  {
    title: 'Retries are safe',
    text: 'The idempotency key is the deal id plus a hash of the exact plan. It is claimed with SET NX before the sales order exists, so a retried webhook or a double click returns the stored order, never a second one.',
  },
  {
    title: 'Cheap and cached',
    text: 'About 2 cents for a new deal (one LLM call, one decision call); the same deal is drafted once. The three samples replay recorded runs, so they are instant and free.',
  },
];

const recordedDay = new Date(`${EXAMPLE_META.recorded}T12:00:00Z`).toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});
const EXAMPLE_NOTE = `Recorded run: the LLM's plan and the decision model's answer were recorded live on ${recordedDay} and replay here (times shown are the live ones). The checks, the field map, the final route and the write run now, on the same code as the API.`;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const pace = ms => (reducedMotion() ? 0 : ms);
const dealJson = sample => JSON.stringify(sample.deal, null, 2);
const SAMPLE_OPTIONS = [
  ...SAMPLES.map(({ value, label, hint }) => ({ value, label, hint })),
  { value: 'custom', label: 'Your edit', hint: 'Runs live with the private link' },
];

let auditIds = 0;
const audit = (actor, tone, text) => ({ id: `a${(auditIds += 1)}`, at: Date.now(), actor, tone, text });
let requestIds = 0;

function tabSession() {
  try {
    let session = sessionStorage.getItem('stacksyncSession');
    if (!session || !SESSION_PATTERN.test(session)) {
      session = newSessionId();
      sessionStorage.setItem('stacksyncSession', session);
    }
    return session;
  } catch {
    return newSessionId();
  }
}

const EMPTY_RUN = { status: 'idle', kind: 'example', reveal: 0 };

export default function StacksyncDemo() {
  const [hasKey, setHasKey] = useState(false);
  const [sampleId, setSampleId] = useState('clean');
  const [dealText, setDealText] = useState(() => dealJson(SAMPLES[0]));
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState('');
  const [inputError, setInputError] = useState('');
  const [run, setRun] = useState(EMPTY_RUN);
  const [requests, setRequests] = useState([]);
  const [orders, setOrders] = useState([]);
  const [appliedByKey, setAppliedByKey] = useState({});
  const [queue, setQueue] = useState([]);
  const [auditItems, setAuditItems] = useState([]);
  const [applying, setApplying] = useState(false);
  const [busyKey, setBusyKey] = useState(null);
  const runToken = useRef(0);
  const browserStore = useRef(null);
  const session = useRef(null);

  const log = useCallback((...entries) => setAuditItems(items => [...items, ...entries].slice(-60)), []);

  const parsed = useMemo(() => readDeal(dealText), [dealText]);
  const facts = parsed.facts || run.facts || null;

  // --- run a deal --------------------------------------------------------------------------------

  const reveal = useCallback(
    async (token, { kind, facts: runFacts, plan, llmMs, decision, hash, key, cached, sample }) => {
      const checks = validatePlan(plan, runFacts);
      const final = finalRoute(decision?.choice, checks);
      const base = { kind, facts: runFacts, plan, llmMs, decision, hash, key, cached, sample, checks, slip: false };
      const sum = summarize(checks);
      log(
        audit('LLM', 'accent', `Drafted the ERP write plan: ${plan?.items?.length ?? 0} lines, ${money(plan?.total, plan?.currency || 'USD')} (${formatMs(llmMs || 0)}${cached ? ', cached' : ''}${kind === 'example' ? ', recorded' : ''})`)
      );
      setRun({ ...base, status: 'checking', reveal: 0 });
      for (let index = 1; index <= checks.length; index += 1) {
        await sleep(pace(70));
        if (runToken.current !== token) return;
        setRun(current => ({ ...current, reveal: index }));
      }
      log(
        audit(
          'Code',
          sum.failed.length ? 'bad' : sum.review.length ? 'warn' : 'ok',
          `${sum.passed} of ${sum.total} checks pass${sum.failed.length ? `; failed: ${sum.failed.map(check => check.detail).join('; ')}` : ''}${
            sum.review.length ? `; review: ${sum.review.map(check => check.label.toLowerCase()).join(', ')}` : ''
          }`
        )
      );
      setRun(current => ({ ...current, status: 'deciding' }));
      await sleep(pace(320));
      if (runToken.current !== token) return;
      const probability = decision?.probabilities?.[decision.choice];
      log(audit('Decision model', 'accent', `Route: ${ROUTE_LABEL[decision?.choice] || 'none'} ${probability != null ? pct(probability) : ''} (${formatMs(decision?.ms || 0)})`));
      log(
        audit(
          'Code',
          final.route === 'auto' ? 'ok' : final.route === 'approval' ? 'warn' : 'bad',
          `Final route: ${ROUTE_LABEL[final.route]}${final.overruled ? ' (overruled the model)' : ''}. ${final.reason}.`
        )
      );
      setRun(current => ({ ...current, status: 'done', final }));

      if (final.route === 'approval') {
        const customer = CUSTOMERS[runFacts.companyId];
        setQueue(items =>
          items.some(item => item.key === key)
            ? items
            : [
                ...items,
                {
                  key,
                  hash,
                  plan,
                  deal: parsedDealText(runFacts, sample),
                  dealId: runFacts.id,
                  dealName: runFacts.name,
                  customer: customer?.name || runFacts.companyName,
                  customerNote: customer ? `${customer.entity} · ${customer.isNew ? 'new this month, no orders yet' : `since ${customer.since}`}` : 'not mapped',
                  total: plan.total,
                  currency: plan.currency,
                  probability: decision?.probabilities?.approval ?? 0,
                  reasons: checks.filter(check => check.status === 'warn'),
                  status: 'pending',
                },
              ]
        );
        log(audit('Queue', 'warn', `hs-deal-${runFacts.id} waits for a person: ${summarize(checks).review.map(check => check.detail).join('; ')}`));
      }
    },
    [log]
  );

  // The deal JSON the server needs for /apply (the sample's own JSON, or the edited text)
  const dealTextRef = useRef(dealText);
  dealTextRef.current = dealText;
  function parsedDealText(runFacts, sample) {
    return sample ? dealJson(sampleById(sample)) : dealTextRef.current;
  }

  const runDeal = useCallback(
    async (id, text) => {
      const token = (runToken.current += 1);
      setNotice('');
      setInputError('');
      const read = readDeal(text);
      if (read.error) {
        setInputError(read.error);
        return;
      }
      const sample = id !== 'custom' ? id : null;
      log(audit('CRM', 'muted', `Deal ${read.facts.id} closed won: ${read.facts.name} (${money(read.facts.amount, read.facts.currency || 'USD')})`));

      if (sample) {
        const example = EXAMPLES[sample];
        setRun({ ...EMPTY_RUN, status: 'drafting', kind: 'example', facts: read.facts, sample });
        await sleep(pace(650));
        if (runToken.current !== token) return;
        const hash = await planHash(example.plan);
        await reveal(token, {
          kind: 'example',
          facts: read.facts,
          plan: example.plan,
          llmMs: example.llmMs,
          decision: example.decision,
          hash,
          key: idempotencyKey(read.facts.id, hash),
          sample,
        });
        return;
      }

      if (!getDemoKey()) {
        setNotice('Preview mode: an edited deal runs live with the private link from my message. The three samples work without it.');
        return;
      }
      setRun({ ...EMPTY_RUN, status: 'drafting', kind: 'live', facts: read.facts });
      try {
        const result = await postJson(`${API}/plan/`, { deal: text });
        if (runToken.current !== token) return;
        await reveal(token, {
          kind: 'live',
          facts: read.facts,
          plan: result.plan,
          llmMs: result.llmMs,
          decision: result.decision,
          hash: result.hash,
          key: result.key,
          cached: result.cached,
          sample: null,
        });
      } catch (error) {
        if (runToken.current !== token) return;
        setRun(current => ({ ...current, status: 'error' }));
        setInputError(error.message);
        log(audit('Server', 'bad', `Live run failed: ${error.message}`));
      }
    },
    [log, reveal]
  );

  const started = useRef(false);
  useEffect(() => {
    setHasKey(Boolean(getDemoKey()));
    session.current = tabSession();
    browserStore.current = memoryStore();
    if (started.current) return;
    started.current = true;
    runDeal('clean', dealJson(SAMPLES[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pick(id) {
    setSampleId(id);
    if (id !== 'custom') {
      const text = dealJson(sampleById(id));
      setDealText(text);
      runDeal(id, text);
    } else {
      setEditing(true);
    }
  }

  function edit(text) {
    setDealText(text);
    const sample = SAMPLES.find(entry => dealJson(entry) === text);
    setSampleId(sample ? sample.value : 'custom');
  }

  // --- write once ------------------------------------------------------------------------------------

  async function write({ plan, key, hash, dealId, deal, approvedBy, attempt, label }) {
    const id = `r${(requestIds += 1)}`;
    const started = Date.now();
    const meta = [`Idempotency-Key: ${shortKey(key)}`, `attempt ${attempt}`];
    setRequests(rows => [
      ...rows.map(row => ({ ...row, highlight: false })),
      { id, at: started, method: 'POST', path: '/erp/salesOrders', status: 'pending', meta, highlight: true },
    ]);
    let result;
    try {
      if (getDemoKey()) {
        result = await postJson(`${API}/apply/`, {
          session: session.current,
          deal,
          plan: JSON.stringify(plan),
          key,
          approvedBy,
        });
      } else {
        await sleep(pace(260));
        result = await applyOnce(browserStore.current, { session: session.current, key, dealId, hash, plan, approvedBy });
      }
    } catch (error) {
      setRequests(rows => rows.map(row => (row.id === id ? { ...row, status: 409, outcome: 'refused', note: error.message } : row)));
      log(audit('ERP', 'bad', `Write refused: ${error.message}`));
      return null;
    }
    const ms = Date.now() - started;
    setRequests(rows =>
      rows.map(row =>
        row.id === id
          ? {
              ...row,
              status: result.status,
              outcome: result.replayed ? 'replayed' : 'created',
              note: result.replayed
                ? `Already applied with this key: ${result.order.salesOrder}, no duplicate sales order`
                : `${result.order.salesOrder} · ${money(result.order.total, result.order.currency)} · ${label}`,
              meta: [...meta, `${ms} ms`],
            }
          : row
      )
    );
    setOrders(result.orders);
    setAppliedByKey(map => ({ ...map, [key]: result.order }));
    log(
      result.replayed
        ? audit('ERP', 'muted', `Retry with the same key returned ${result.order.salesOrder}. No-op: no duplicate sales order.`)
        : audit('ERP', 'ok', `Sales order ${result.order.salesOrder} written for hs-deal-${dealId} (${money(result.order.total, result.order.currency)})${approvedBy ? `, approved by ${approvedBy}` : ''}`)
    );
    return result;
  }

  const attempts = useRef({});
  async function apply({ replay = false } = {}) {
    if (!run.key || run.status !== 'done') return;
    const attempt = (attempts.current[run.key] = (attempts.current[run.key] || 0) + 1);
    setApplying(true);
    await write({
      plan: run.plan,
      key: run.key,
      hash: run.hash,
      dealId: run.facts.id,
      deal: parsedDealText(run.facts, run.sample),
      attempt,
      label: replay ? 'retry' : 'auto-applied',
    });
    setApplying(false);
  }

  async function approve(item) {
    setBusyKey(item.key);
    const attempt = (attempts.current[item.key] = (attempts.current[item.key] || 0) + 1);
    log(audit('You', 'accent', `Approved hs-deal-${item.dealId} (${money(item.total, item.currency)})`));
    const result = await write({
      plan: item.plan,
      key: item.key,
      hash: item.hash,
      dealId: item.dealId,
      deal: item.deal,
      approvedBy: 'you',
      attempt,
      label: 'approved',
    });
    setQueue(items => items.map(entry => (entry.key === item.key ? { ...entry, status: result ? 'approved' : 'pending', order: result?.order } : entry)));
    setBusyKey(null);
  }

  function reject(item) {
    setQueue(items => items.map(entry => (entry.key === item.key ? { ...entry, status: 'rejected' } : entry)));
    log(audit('You', 'bad', `Rejected hs-deal-${item.dealId}: nothing written; sent back to ${item.customer}'s deal owner`));
  }

  function toggleSlip() {
    if (run.status !== 'done') return;
    const original = run.honestPlan || run.plan;
    const next = !run.slip;
    const plan = next ? slipped(original) : original;
    const checks = validatePlan(plan, run.facts);
    const final = finalRoute(run.decision?.choice, checks);
    setRun(current => ({ ...current, slip: next, plan, honestPlan: original, checks, final, reveal: checks.length }));
    const sum = summarize(checks);
    log(
      next
        ? audit('Code', 'bad', `Simulated model slip: ${sum.failed.map(check => check.detail).join('; ')}. Final route: ${ROUTE_LABEL[final.route]} (overruled the model).`)
        : audit('Code', 'muted', 'Honest plan restored.')
    );
  }

  // Keep the key and hash in step with a slipped plan (the key changes when the plan changes)
  useEffect(() => {
    let live = true;
    if (run.status === 'done' && run.plan && run.slip !== undefined) {
      planHash(run.plan).then(hash => {
        if (live && hash !== run.hash) setRun(current => ({ ...current, hash, key: idempotencyKey(current.facts.id, hash) }));
      });
    }
    return () => {
      live = false;
    };
  }, [run.plan, run.status, run.slip, run.hash]);

  const rows = run.plan && run.facts && run.checks ? fieldMap(run.plan, run.facts, run.checks) : null;
  const applied = run.key ? appliedByKey[run.key] : null;
  const canApply = run.status === 'done' && run.final?.route === 'auto';
  const queueRef = useRef(null);

  return (
    <DemoLayout
      company="Stacksync"
      title="CRM deal in, checked ERP write out"
      tagline="An LLM drafts the sales order, code checks every field against the ERP, a fast decision model routes it, and the write happens exactly once, even when the sync retries."
      accent="cobalt"
      nav={NAV}
    >
      <div className={styles.page}>
        <section id="route" className={styles.section} aria-labelledby="route-heading">
          <h2 id="route-heading" className={srOnly}>
            Deal and route
          </h2>
          <div className={styles.topGrid}>
            <DealCard
              samples={SAMPLE_OPTIONS}
              sampleId={sampleId}
              onPick={pick}
              facts={facts}
              dealText={dealText}
              onEdit={edit}
              editing={editing}
              onToggleEdit={() => setEditing(open => !open)}
              onRun={() => runDeal(sampleId, dealText)}
              running={['drafting', 'checking', 'deciding'].includes(run.status)}
              hasKey={hasKey}
              notice={notice}
              inputError={inputError}
            />
            <VerdictCard
              run={run}
              onApply={() => apply()}
              onOpenQueue={() => queueRef.current?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' })}
              applying={applying}
              applied={applied}
              exampleNote={EXAMPLE_NOTE}
            />
          </div>
        </section>

        <section className={styles.section} aria-label="How a run works">
          <PipelineStrip steps={FLOW} label="How a run works" />
        </section>

        <section id="plan" className={styles.section} aria-labelledby="plan-heading">
          <SectionHead
            titleId="plan-heading"
            title="The write plan, checked in code"
            lede="The LLM maps the deal onto an ERP sales order. Every field is checked against the schema and the ERP's own tables before anything is written."
          />
          <div className={styles.planGrid}>
            <MapCard rows={rows} plan={run.status === 'idle' ? null : run.plan} />
            <ChecksCard
              checks={run.checks}
              reveal={run.status === 'checking' ? run.reveal : run.checks?.length || 0}
              slipped={run.slip}
              onSlip={toggleSlip}
              canSlip={run.status === 'done' && !applied}
            />
          </div>
        </section>

        <section id="apply" className={styles.section} aria-labelledby="apply-heading">
          <SectionHead
            titleId="apply-heading"
            title="Write once, retry safely"
            lede="Syncs retry: webhooks redeliver, workers time out, people double-click. The key is the deal id plus the plan hash, claimed before the sales order exists, so a retry returns the same order."
          />
          <div className={styles.applyGrid}>
            <ApplyCard
              run={run}
              applied={applied}
              requests={requests}
              onApply={() => apply()}
              onReplay={() => apply({ replay: true })}
              applying={applying}
              hasKey={hasKey}
              canApply={canApply}
            />
            <ErpCard orders={orders} requestCount={requests.filter(row => row.status !== 'pending').length} />
          </div>
        </section>

        <section id="queue" ref={queueRef} className={styles.section} aria-labelledby="queue-heading">
          <SectionHead
            titleId="queue-heading"
            title="Approval queue"
            lede="Checks passed, but policy wants a person: a new customer, a big first order, a discount over 30%. Approve and it writes once, under the same key."
          />
          <QueueList items={queue} onApprove={approve} onReject={reject} busyKey={busyKey} />
        </section>

        <section id="audit" className={styles.section} aria-labelledby="audit-heading">
          <SectionHead titleId="audit-heading" title="Audit timeline" lede="Every step, who took it and what it decided." />
          <AuditCard items={auditItems} />
        </section>

        <section className={styles.section} aria-labelledby="notes-heading">
          <SectionHead titleId="notes-heading" title="Design choices" flush />
          <NoteGrid className={styles.notes} items={NOTES} />
        </section>
      </div>
    </DemoLayout>
  );
}

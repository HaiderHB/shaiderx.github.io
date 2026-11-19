// Apostra demo: an agent media-buying desk. Live at /demo/apostra/ (unlisted, noindex).
// A buyer brief goes to a buyer agent that calls AdCP-style MCP tools on three sample seller agents
// (simulated server-side), checks every product and the plan in code, shortlists with an LLM,
// scores fit and risk with a decision model, and books with idempotency keys. A retried
// create_media_buy returns the same buy; a counteroffer outside the brief goes to a person.
// The preset replays recorded model outputs (free, no key); a custom brief is a live run.
import { DemoLayout } from 'demos/DemoLayout';
import { getDemoKey, postJson, streamFromApi } from 'demos/client';
import { NoteGrid, PipelineStrip, SectionHead } from 'demos/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CUSTOM_IDEAS, PRESETS, PRESET_BRIEF, applyEvent, emptyRun, money, planChecks, planTotals } from './engine';
import {
  BookCard,
  BriefCard,
  CallsCard,
  EscalationCard,
  FinalPlanCard,
  Glance,
  MessagesCard,
  ScreenCard,
  ShortlistCard,
  useInspect,
} from './panels';
import styles from './Apostra.module.css';

const API = '/api/demo/apostra';
const NAV = [
  { href: '#brief', label: 'Brief' },
  { href: '#screen', label: 'Screen' },
  { href: '#book', label: 'Book' },
  { href: '#audit', label: 'Audit' },
  { href: '#notes', label: 'Design' },
];

const FLOW = [
  { label: 'Read', what: 'The LLM reads the brief into typed fields', cost: '1 call' },
  { label: 'Discover', what: 'get_products on three seller agents over MCP', cost: 'free' },
  { label: 'Check', what: 'Budget, CPM, flight, brand safety, audience', cost: 'code' },
  { label: 'Pick', what: 'The LLM shortlists; a decision model scores fit and risk', cost: '2 calls' },
  { label: 'Book', what: 'create_media_buy with an idempotency key; counters go to a person', cost: 'free' },
];

const EXAMPLE_NOTE =
  'Example run: the LLM’s reading of the brief, its shortlist and the decision model’s scores were recorded from a live run on Nov 18 and replay here. The three sample sellers, every guardrail and the bookings run on the server each time.';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

let auditIds = 0;
const audit = (actor, tone, text, at = Date.now()) => ({ id: `a${(auditIds += 1)}`, at, actor, tone, text });

/** Streams NDJSON events from the run route. */
async function streamEvents(body, onEvent) {
  let buffer = '';
  let finished = false;
  const handle = line => {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    if (event.t === 'done' || event.t === 'error') finished = true;
    onEvent(event);
  };
  await streamFromApi(`${API}/run/`, body, chunk => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop();
    lines.forEach(handle);
  });
  handle(buffer);
  if (!finished) onEvent({ t: 'error', at: Date.now(), message: 'The run ended early. Try again.' });
}

/** Reveals events at a pace a person can follow (the sellers answer in microseconds). */
function createPlayer(apply, pace) {
  const queue = [];
  let cancelled = false;
  let draining = false;
  async function drain() {
    draining = true;
    while (queue.length && !cancelled) {
      const event = queue.shift();
      const wait = pace(event);
      if (wait) await sleep(wait);
      if (!cancelled) apply(event);
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

const PACE = { meta: 0, brief: 650, message: 260, products: 320, shortlist: 850, scores: 600, plan: 420, booking: 260, escalate: 380, done: 200 };
const pacer = kind => event => {
  if (reducedMotion()) return 0;
  const base =
    event.t === 'call'
      ? event.call.name === 'tools/list'
        ? 180
        : event.call.name === 'get_products'
        ? 420
        : 560
      : PACE[event.t] ?? 0;
  return kind === 'live' ? Math.round(base * 0.5) : base;
};

function auditFor(event, run, sellerName) {
  switch (event.t) {
    case 'meta':
      return [audit('Buyer agent', 'muted', `Run ${event.runId} started with ${event.sellers.length} sample seller agents`, event.at)];
    case 'brief':
      return event.errors?.length
        ? [audit('LLM', 'bad', `Could not read ${event.errors.join(', ')} from the brief`, event.at)]
        : [audit('LLM', 'accent', `Read the brief into typed fields${event.ms ? ` (${(event.ms / 1000).toFixed(1)} s live)` : ''}; validated in code`, event.at)];
    case 'products': {
      const out = event.products.filter(product => !product.eligible);
      return [
        audit(
          'Guardrails',
          out.length ? 'warn' : 'ok',
          `${sellerName(event.seller)}: ${event.products.length - out.length} of ${event.products.length} products pass${
            out.length ? `; out: ${out.map(product => `${product.name} (${product.reason})`).join('; ')}` : ''
          }`,
          event.at
        ),
      ];
    }
    case 'shortlist': {
      const total = event.shortlist.picks.reduce((sum, pick) => sum + pick.budget, 0);
      return [audit('LLM', 'accent', `Shortlisted ${event.shortlist.picks.length} products and split ${money(total)}`, event.at)];
    }
    case 'scores': {
      const risky = Object.values(event.scores).filter(score => score.risk >= event.riskLimit).length;
      return [
        audit(
          'Decision model',
          risky ? 'warn' : 'ok',
          `Scored fit and safety risk for ${Object.keys(event.scores).length} picks in ${event.ms} ms; ${
            risky ? `${risky} over the ${event.riskLimit * 100}% risk limit` : `none over the ${event.riskLimit * 100}% risk limit`
          }`,
          event.at
        ),
      ];
    }
    case 'call':
      if (event.call.name !== 'create_media_buy') return [];
      if (event.call.status === 'error') return [audit(event.call.scope, 'bad', 'create_media_buy failed', event.at)];
      return event.call.status === 'awaiting'
        ? [audit(event.call.scope, 'warn', `create_media_buy answered with a counteroffer (key …${event.call.args.idempotency_key.slice(-12)})`, event.at)]
        : [audit(event.call.scope, 'ok', `create_media_buy booked ${event.call.summary} (key …${event.call.args.idempotency_key.slice(-12)})`, event.at)];
    case 'escalate':
      return [
        audit(
          'Guardrails',
          'bad',
          `${event.escalation.sellerName} counter at ${money(event.escalation.counter.fixed_price)}: ${event.escalation.reasons.join('; ')}. Escalated to a person`,
          event.at
        ),
      ];
    case 'done': {
      const totals = planTotals(run.lines);
      return [
        audit(
          'Buyer agent',
          'ok',
          `Plan: ${money(totals.booked)} booked${totals.pending ? `, ${money(totals.pending)} waiting for approval` : ''}`,
          event.at
        ),
      ];
    }
    case 'error':
      return [audit('Buyer agent', 'bad', event.message, event.at)];
    default:
      return [];
  }
}

export default function ApostraDemo() {
  const [hasKey, setHasKey] = useState(false);
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [text, setText] = useState(PRESET_BRIEF);
  const [run, setRun] = useState(() => emptyRun('example'));
  const [auditItems, setAuditItems] = useState([]);
  const [notice, setNotice] = useState('');
  const [retrying, setRetrying] = useState(null);
  const [deciding, setDeciding] = useState(false);
  const runRef = useRef(run);
  const player = useRef(null);
  const [inspect, setInspect, followLatest] = useInspect(run.calls);

  const isPreset = text.replace(/\s+/g, ' ').trim() === PRESET_BRIEF;
  const busy = run.status === 'running';

  const addAudit = items => items.length && setAuditItems(current => [...current, ...items]);

  function apply(event) {
    const before = runRef.current;
    const next = applyEvent(before, event);
    runRef.current = next;
    setRun(next);
    const names = id => next.sellers.find(seller => seller.id === id)?.name || id;
    addAudit(auditFor(event, next, names));
  }

  async function start() {
    setNotice('');
    if (!isPreset && !hasKey) {
      setNotice('Custom briefs run live models, so they need the private link from my message. The preset works for everyone.');
      return;
    }
    const kind = isPreset ? 'example' : 'live';
    player.current?.cancel();
    const fresh = emptyRun(kind, { status: 'running' });
    runRef.current = fresh;
    setRun(fresh);
    setAuditItems([]);
    followLatest();
    const runPlayer = createPlayer(apply, pacer(kind));
    player.current = runPlayer;
    try {
      await streamEvents({ brief: text, live: !isPreset }, runPlayer.push);
    } catch (error) {
      runPlayer.push({ t: 'error', at: Date.now(), message: error.message });
    }
  }

  // First load: the preset plays on its own
  useEffect(() => {
    setHasKey(Boolean(getDemoKey()));
    start();
    return () => player.current?.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickPreset(id) {
    const preset = PRESETS.find(item => item.id === id);
    setPresetId(id);
    setText(preset.brief);
    setNotice('');
  }

  // --- after the run: retry a booking, decide a counteroffer -----------------------------------------

  async function retry(line) {
    setRetrying(line.seller);
    try {
      const id = runRef.current.calls.reduce((max, call) => Math.max(max, call.id), 0) + 1;
      const reply = await postJson(`${API}/buy/`, { action: 'retry', seller: line.seller, args: line.args, record: line.record, callId: id });
      const { outcome } = reply;
      apply({
        t: 'call',
        at: Date.now(),
        call: {
          ...reply.call,
          id,
          scope: line.sellerName,
          status: outcome.error ? 'error' : 'allowed',
          replayed: outcome.replayed,
          summary: outcome.mediaBuyId || outcome.status,
          note: outcome.replayed
            ? `Same key: the seller returned ${outcome.mediaBuyId}, nothing new booked`
            : outcome.error || 'The store had no record of this key, so the seller answered again',
        },
      });
      addAudit([
        audit(
          line.sellerName,
          outcome.replayed ? 'accent' : 'warn',
          outcome.replayed
            ? `Retry with the same key returned ${outcome.mediaBuyId}: one booking, not two`
            : `Retry answered without a stored record (${outcome.mediaBuyId || outcome.error})`
        ),
      ]);
    } catch (error) {
      setNotice(error.message);
    }
    setRetrying(null);
  }

  async function decide(approve) {
    const escalation = runRef.current.escalation;
    if (!escalation) return;
    setDeciding(true);
    apply({ t: 'message', at: Date.now(), message: { id: `m-you-${Date.now()}`, from: 'you', to: escalation.seller, text: approve ? `Approved: run the full flight at ${money(escalation.counter.fixed_price)} CPM.` : `Declined. We'll keep the ${money(escalation.budget)} for a re-plan.` } });
    if (!approve) {
      apply({ t: 'booking', at: Date.now(), seller: escalation.seller, patch: { status: 'declined', note: 'Counteroffer declined' } });
      apply({ t: 'escalate', at: Date.now(), escalation: { ...escalation, status: 'rejected' } });
      addAudit([audit('You', 'muted', `Declined the ${escalation.sellerName} counter; ${money(escalation.budget)} stays unspent`)]);
      setDeciding(false);
      return;
    }
    try {
      const id = runRef.current.calls.reduce((max, call) => Math.max(max, call.id), 0) + 1;
      const reply = await postJson(`${API}/buy/`, {
        action: 'accept_counter',
        seller: escalation.seller,
        args: escalation.args,
        counter: { product_id: escalation.counter.product_id },
        callId: id,
      });
      const { outcome } = reply;
      if (outcome.error || !outcome.mediaBuyId) throw new Error(outcome.error || 'The seller did not confirm.');
      apply({
        t: 'call',
        at: Date.now(),
        call: { ...reply.call, id, scope: escalation.sellerName, status: 'allowed', replayed: outcome.replayed, summary: outcome.mediaBuyId, note: 'Approved by a person: counter accepted' },
      });
      apply({
        t: 'booking',
        at: Date.now(),
        seller: escalation.seller,
        patch: {
          status: 'booked',
          cpm: escalation.counter.fixed_price,
          override: true,
          impressions: escalation.impressionsAtCounter,
          mediaBuyId: outcome.mediaBuyId,
          args: reply.call.args,
          key: reply.call.args.idempotency_key,
          record: outcome.record,
        },
      });
      apply({ t: 'escalate', at: Date.now(), escalation: { ...escalation, status: 'approved', mediaBuyId: outcome.mediaBuyId } });
      apply({ t: 'message', at: Date.now(), message: { id: `m-booked-${Date.now()}`, from: escalation.seller, to: 'buyer', text: `Booked ${outcome.mediaBuyId} at ${money(escalation.counter.fixed_price)} CPM for the full flight.` } });
      addAudit([audit('You', 'ok', `Approved the ${escalation.sellerName} counter at ${money(escalation.counter.fixed_price)} CPM; booked ${outcome.mediaBuyId}`)]);
    } catch (error) {
      setNotice(error.message);
    }
    setDeciding(false);
  }

  // --- derived -------------------------------------------------------------------------------------

  const checks = useMemo(
    () => (run.brief && run.lines.length ? planChecks(run.brief, run.lines, { excluded: run.products.filter(p => !p.eligible) }) : []),
    [run.brief, run.lines, run.products]
  );

  const { attempts, bookingCounts } = useMemo(() => {
    const perKey = {};
    const counts = {};
    const items = run.calls
      .filter(call => call.name === 'create_media_buy')
      .map(call => {
        const key = call.args?.idempotency_key || '';
        perKey[key] = (perKey[key] || 0) + 1;
        const result = call.response?.result?.structuredContent;
        const count = (counts[call.seller] = counts[call.seller] || { requests: 0, ids: new Set() });
        count.requests += 1;
        if (result?.media_buy_id) count.ids.add(result.media_buy_id);
        return {
          id: `r${call.id}`,
          at: call.at,
          method: 'POST',
          path: `${call.scope} · create_media_buy`,
          status: 200,
          outcome: call.status === 'error' ? 'error' : call.replayed ? 'replayed' : result?.status === 'input-required' ? 'counteroffer' : 'booked',
          note: result?.media_buy_id || (result?.counter_offer ? `$${result.counter_offer.fixed_price} CPM offered` : ''),
          meta: [`key …${key.slice(-14)}`, `attempt ${perKey[key]}`],
          tone: call.replayed ? 'ok' : result?.status === 'input-required' ? 'warn' : undefined,
          highlight: call.replayed || undefined,
        };
      });
    const bookingCountsOut = Object.fromEntries(
      Object.entries(counts).map(([seller, count]) => [seller, { requests: count.requests, buys: count.ids.size }])
    );
    return { attempts: items, bookingCounts: bookingCountsOut };
  }, [run.calls]);

  const escalation = run.escalation ? { ...run.escalation, ceiling: run.brief?.cpm_ceiling } : null;

  return (
    <DemoLayout
      company="Apostra"
      title="One brief, three seller agents, a booked plan that stays inside the lines"
      tagline="A buyer agent takes a campaign brief, calls each seller's agent over MCP with AdCP-style tools, checks every product and the plan in code, books with idempotency keys and hands any counteroffer outside the brief to a person."
      accent="cobalt"
      nav={NAV}
      wide
      hero={<Glance run={run} kind={run.kind} />}
    >
      <div className={styles.page}>
        <PipelineStrip steps={FLOW} />

        <section id="brief" className={styles.section} aria-labelledby="brief-heading">
          <SectionHead
            variant="numbered"
            index={1}
            kicker="Step 1 · Brief to tool calls"
            titleId="brief-heading"
            title="A plain-language brief in, MCP tool calls out"
            lede="The buyer agent reads the brief, then asks each seller agent what it has: tools/list, then get_products with the brief's channels, dates and currency."
          />
          {run.kind === 'example' && <p className={styles.exampleNote}>{EXAMPLE_NOTE}</p>}
          <div className={styles.gridBrief}>
            <BriefCard
              presets={PRESETS}
              preset={presetId}
              onPreset={pickPreset}
              text={text}
              onText={setText}
              onRun={start}
              busy={busy}
              hasKey={hasKey}
              isPreset={isPreset}
              notice={notice}
              ideas={CUSTOM_IDEAS}
              onIdea={idea => {
                setText(idea);
                setNotice(hasKey ? '' : 'Custom briefs need the private link from my message.');
              }}
              run={run}
            />
            <CallsCard run={run} pending={busy} inspect={inspect} onInspect={setInspect} />
          </div>
        </section>

        <section id="screen" className={styles.section} aria-labelledby="screen-heading">
          <SectionHead
            variant="numbered"
            index={2}
            kicker="Step 2 · Screen and pick"
            titleId="screen-heading"
            title="Code rules products out. The model only picks from what is left."
            lede="Every product a seller returns is checked against the brief in code: channel, CPM ceiling, flight dates, brand safety and audience. The LLM shortlists from the survivors; a decision model scores each pick."
          />
          <div className={styles.gridScreen}>
            <ScreenCard run={run} />
            <ShortlistCard run={run} riskLimit={run.riskLimit} />
          </div>
        </section>

        <section id="book" className={styles.section} aria-labelledby="book-heading">
          <SectionHead
            variant="numbered"
            index={3}
            kicker="Step 3 · Book"
            titleId="book-heading"
            title="Book once, and stop at anything outside the brief"
            lede="Each create_media_buy carries an idempotency key, so a retried call returns the same buy instead of a second one. A counteroffer is re-checked against the same guardrails; if it fails, the agent asks a person."
          />
          <div className={styles.gridBook}>
            <BookCard
              run={run}
              checks={checks}
              attempts={attempts}
              onRetry={retry}
              retrying={retrying}
              bookingCounts={bookingCounts}
            />
            <EscalationCard
              escalation={escalation}
              onApprove={() => decide(true)}
              onReject={() => decide(false)}
              busy={deciding}
            />
          </div>
        </section>

        <section id="audit" className={styles.section} aria-labelledby="audit-heading">
          <SectionHead
            variant="numbered"
            index={4}
            kicker="Step 4 · Audit"
            titleId="audit-heading"
            title="What the agents said, what was booked, and who decided"
            lede="The messages between the buyer agent and each seller agent, the final plan with spend, impressions and blended CPM, and one trail of every step."
          />
          <div className={styles.gridAudit}>
            <MessagesCard run={run} sellers={run.sellers} />
            <FinalPlanCard run={run} auditItems={auditItems} />
          </div>
        </section>

        <section id="notes" className={styles.section} aria-labelledby="notes-heading">
          <SectionHead titleId="notes-heading" title="Design choices" flush />
          <NoteGrid className={styles.notes} items={NOTES} />
        </section>
      </div>
    </DemoLayout>
  );
}

const NOTES = [
  {
    title: 'The model proposes; code disposes',
    text: 'The LLM reads the brief and picks from eligible products. Whether a product breaks the CPM ceiling, the flight, the budget cap or a brand-safety exclusion is computed, never asked, and checked again on the plan and on every counteroffer.',
  },
  {
    title: 'Retries cannot double-book',
    text: 'Every create_media_buy carries an idempotency key that the seller claims atomically with its response. The same key returns the same buy; the same key with a different body is refused. The buy id is derived from the key as a second lock.',
  },
  {
    title: 'Agents stop at the edge of their mandate',
    text: 'A counteroffer inside the brief is accepted automatically. One outside it never is: the agent says why to the seller, holds that slice of budget and puts an approval card in front of a person.',
  },
  {
    title: 'Cheap, typed and traceable',
    text: 'About 3 cents a live run: two short LLM calls and one decision call scoring every pick at once. Repeats are cached. Every tool call keeps its JSON-RPC request and result, and every step lands in one audit trail.',
  },
];

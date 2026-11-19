// Apostra demo panels: the plan at a glance, the brief, the MCP call log with request/response,
// the product screen, the shortlist with scores, bookings with the retry, the approval card, the
// agent-to-agent messages and the final plan. Pure presentation; state lives in index.page.js.
import {
  ApprovalCard,
  AuditTrail,
  Button,
  Card,
  CardHead,
  CardTitle,
  ChatThread,
  CheckList,
  Chip,
  EmptyState,
  JsonView,
  KeyValues,
  McpCallLog,
  MiniLabel,
  Pill,
  ProbabilityBar,
  ProbabilityBars,
  RequestLog,
  RunStatus,
  Select,
  SplitBar,
  Spinner,
  StatusIcon,
  TextArea,
  formatMs,
} from 'demos/ui';
import { useEffect, useState } from 'react';
import { FiPlay, FiRotateCw } from 'react-icons/fi';
import { CHANNEL_LABEL, briefChips, compactMoney, impressions, money, planTotals } from './engine';
import styles from './Apostra.module.css';

const SELLER_TONE = { riverline: 'accent', hollowpine: 'ok', meridian: 'warn' };
const STATUS_PILL = {
  planned: { tone: 'neutral', label: 'Planned' },
  booked: { tone: 'ok', label: 'Booked' },
  awaiting: { tone: 'warn', label: 'Needs approval' },
  declined: { tone: 'neutral', label: 'Declined' },
  dropped: { tone: 'neutral', label: 'Kept out' },
  failed: { tone: 'bad', label: 'Failed' },
};

// --- hero: the plan at a glance --------------------------------------------------------------------

export function Glance({ run, kind }) {
  const totals = planTotals(run.lines);
  const budget = run.brief?.budget || 50000;
  const parts = run.lines
    .filter(line => line.status === 'booked' || line.status === 'awaiting')
    .map(line => ({
      label: `${line.sellerName}${line.status === 'awaiting' ? ' (waiting)' : ''}`,
      value: line.budget,
      tone: line.status === 'awaiting' ? 'muted' : SELLER_TONE[line.seller],
      display: compactMoney(line.budget),
    }));
  const running = run.status === 'running';
  return (
    <Card className={styles.glance} aria-live="polite" data-glance="">
      <div className={styles.glanceHead}>
        <RunStatus state={running ? (kind === 'live' ? 'live' : 'wait') : run.status === 'done' ? 'ended' : 'idle'}>
          {running ? 'Agent buying' : run.status === 'done' ? 'Plan booked' : run.status === 'error' ? 'Stopped' : 'Ready'}
        </RunStatus>
        <Pill tone="neutral">{kind === 'live' ? 'Live run' : 'Example run'}</Pill>
      </div>
      <div className={styles.glanceBig} data-focus="booked">
        <span className={styles.glanceLabel}>Booked</span>
        <span className={styles.glanceValue}>
          {money(totals.booked)}
          <span className={styles.glanceOf}> of {compactMoney(budget)}</span>
        </span>
        {totals.pending > 0 && (
          <a href="#book" className={styles.glanceWait}>
            {money(totals.pending)} waiting for your approval
          </a>
        )}
      </div>
      {parts.length ? (
        <SplitBar parts={parts} label="Spend by seller" />
      ) : (
        <div className={styles.glanceTrack} aria-hidden />
      )}
      <dl className={styles.glanceStats}>
        <div>
          <dt>Impressions</dt>
          <dd>{totals.impressions ? impressions(totals.impressions) : '–'}</dd>
        </div>
        <div>
          <dt>Blended CPM</dt>
          <dd>{totals.blendedCpm ? money(totals.blendedCpm, { cents: true }) : '–'}</dd>
        </div>
        <div>
          <dt>Tool calls</dt>
          <dd>{run.calls.length || '–'}</dd>
        </div>
      </dl>
    </Card>
  );
}

// --- the brief -----------------------------------------------------------------------------------------

export function BriefCard({ presets, preset, onPreset, text, onText, onRun, busy, hasKey, isPreset, notice, ideas, onIdea, run }) {
  const chips = briefChips(run.brief);
  return (
    <Card className={styles.briefCard}>
      <CardHead aside={<Pill tone="neutral">Sample advertiser</Pill>}>
        <CardTitle>The brief</CardTitle>
      </CardHead>
      <div className={styles.presetRow}>
        {presets.map(item => (
          <Chip key={item.id} aria-pressed={preset === item.id && isPreset} onClick={() => onPreset(item.id)} disabled={busy}>
            {item.label}
          </Chip>
        ))}
        {ideas.map(idea => (
          <Chip key={idea} onClick={() => onIdea(idea)} disabled={busy} title={idea}>
            {idea.split(',')[0]} {idea.split(',')[1]}
          </Chip>
        ))}
      </div>
      <label htmlFor="brief-text"className={styles.srOnlyLabel}>
        Campaign brief
      </label>
      <TextArea
        id="brief-text"
        className={styles.briefInput}
        value={text}
        rows={3}
        maxLength={600}
        onChange={event => onText(event.target.value)}
        disabled={busy}
      />
      <div className={styles.runRow}>
        <Button onClick={onRun} disabled={busy || text.trim().length < 12} data-focus="run">
          {busy ? <Spinner /> : <FiPlay aria-hidden />} {busy ? 'Buying' : 'Plan and book'}
        </Button>
        <span className={styles.muted}>
          {isPreset
            ? 'Preset: recorded model outputs, live sellers and bookings. Free.'
            : hasKey
            ? 'Custom brief: a live run, about 3 cents.'
            : 'Custom briefs need the private link from my message.'}
        </span>
      </div>
      {notice && <p className={styles.notice} role="status">{notice}</p>}
      <div className={styles.parsed} data-focus="parsed">
        <MiniLabel>What the LLM read{run.briefMs ? ` · ${formatMs(run.briefMs)}` : ''}</MiniLabel>
        {chips.length ? (
          <KeyValues className={styles.briefKv} items={chips.map(chip => [chip.label, chip.value])} />
        ) : (
          <p className={styles.muted}>Typed fields appear here, checked in code before any seller is called.</p>
        )}
      </div>
    </Card>
  );
}

// --- MCP calls ------------------------------------------------------------------------------------

const callStatuses = {
  allowed: { label: 'ok', tone: 'ok' },
  awaiting: { label: 'counteroffer', tone: 'warn' },
  replayed: { label: 'replayed', tone: 'ok' },
};

export function CallsCard({ run, pending, inspect, onInspect }) {
  const selected = run.calls.find(call => call.id === inspect) || run.calls[run.calls.length - 1];
  const rows = run.calls.map(call => ({
    id: call.id,
    name: call.name,
    scope: call.scope,
    status: call.replayed ? 'replayed' : call.status,
    args: call.name === 'tools/list' ? {} : briefArgs(call),
    note: call.note,
  }));
  return (
    <Card className={styles.callsCard}>
      <CardHead aside={<Pill tone="neutral">3 sample sellers</Pill>}>
        <CardTitle>MCP tool calls</CardTitle>
      </CardHead>
      <div className={styles.callLog} data-focus="calls">
        <McpCallLog
          calls={rows}
          statuses={callStatuses}
          scopeTones={{ 'Riverline TV': 'accent', 'Hollow Pine Audio': 'neutral', 'The Meridian Post': 'warn' }}
          pending={pending}
          pendingLabel="Calling seller agents…"
          empty="The buyer agent's calls to each seller agent stream in here."
          active={selected?.id}
          argsClip={60}
        />
      </div>
      {selected && (
        <div className={styles.inspect}>
          <div className={styles.inspectHead}>
            <MiniLabel as="label" htmlFor="inspect-call">
              Request and response
            </MiniLabel>
            <Select
              id="inspect-call"
              value={selected.id}
              onChange={event => onInspect(Number(event.target.value))}
              className={styles.inspectSelect}
            >
              {run.calls.map(call => (
                <option key={call.id} value={call.id}>
                  {call.id}. {call.name} · {call.scope}
                  {call.replayed ? ' (retry)' : ''}
                </option>
              ))}
            </Select>
          </div>
          <div className={styles.exchange}>
            <div>
              <MiniLabel>JSON-RPC request</MiniLabel>
              <JsonView value={selected.request} clip={1400} clipNote="Trimmed for the page" />
            </div>
            <div>
              <MiniLabel>Result{selected.replayed ? ' · replayed from the stored key' : ''}</MiniLabel>
              <JsonView value={selected.response} clip={1400} clipNote="Trimmed for the page" />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function briefArgs(call) {
  const args = call.args || {};
  if (call.name === 'get_products') return { buying_mode: args.buying_mode, channels: args.filters?.channels };
  if (call.name === 'create_media_buy') {
    return {
      idempotency_key: args.idempotency_key,
      packages: (args.packages || []).map(p => `${p.product_id} $${p.budget?.amount?.toLocaleString('en-US')}`),
    };
  }
  return args;
}

// --- screen: every product against the guardrails ------------------------------------------------

const CHECK_IDS = [
  ['channel', 'Channel'],
  ['cpm', 'CPM'],
  ['flight', 'Flight'],
  ['safety', 'Safety'],
  ['audience', 'Audience'],
];

export function ScreenCard({ run }) {
  return (
    <Card className={styles.screenCard}>
      <CardHead aside={run.products.length ? <Pill tone="neutral">{run.products.filter(p => p.eligible).length} of {run.products.length} pass</Pill> : null}>
        <CardTitle>Every product, checked in code</CardTitle>
      </CardHead>
      {run.products.length ? (
        <div className={styles.screenTable} role="table" aria-label="Products and guardrails">
          <div className={styles.screenRow} data-head="" role="row">
            <span role="columnheader">Product</span>
            <span role="columnheader" className={styles.num}>
              CPM
            </span>
            {CHECK_IDS.map(([id, label]) => (
              <span key={id} role="columnheader" className={styles.checkHead}>
                {label}
              </span>
            ))}
          </div>
          {run.products.map(product => (
            <div
              key={product.productId}
              className={styles.screenRow}
              role="row"
              data-eligible={product.eligible ? '' : undefined}
              data-focus={product.eligible ? undefined : `excluded-${product.productId}`}
            >
              <span role="cell" className={styles.productCell}>
                <span className={styles.productName}>{product.name}</span>
                <span className={styles.productMeta}>
                  {product.sellerName} · {CHANNEL_LABEL[product.channel]}
                  {!product.eligible && <strong className={styles.excluded}> · Out: {product.reason}</strong>}
                </span>
              </span>
              <span role="cell" className={styles.num}>
                {money(product.cpm)}
              </span>
              {CHECK_IDS.map(([id, label]) => {
                const check = product.checks.find(item => item.id === id);
                return (
                  <span key={id} role="cell" className={styles.checkCell} title={`${label}: ${check.detail}`}>
                    <StatusIcon status={check.pass ? 'pass' : 'fail'} />
                    <span className={styles.srOnlyLabel}>
                      {label} {check.pass ? 'pass' : 'fail'}: {check.detail}
                    </span>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState size="s">Products from each seller’s get_products land here, each with five checks.</EmptyState>
      )}
    </Card>
  );
}

const FIT_OPTIONS = [
  { value: 'strong', label: 'Strong fit', tone: 'ok' },
  { value: 'partial', label: 'Partial', tone: 'warn' },
  { value: 'weak', label: 'Weak', tone: 'bad' },
];

export function ShortlistCard({ run, riskLimit }) {
  const shortlist = run.shortlist;
  return (
    <Card className={styles.shortlistCard}>
      <CardHead aside={shortlist?.ms ? <Pill tone="neutral">LLM {formatMs(shortlist.ms)}</Pill> : null}>
        <CardTitle>Shortlist, budget split and scores</CardTitle>
      </CardHead>
      {shortlist ? (
        <>
          <ol className={styles.picks}>
            {shortlist.picks.map(pick => {
              const score = run.scores?.[pick.productId];
              return (
                <li key={pick.productId} className={styles.pick} data-focus={`pick-${pick.productId}`}>
                  <div className={styles.pickHead}>
                    <span className={styles.pickName}>
                      {pick.productName}
                      <span className={styles.productMeta}>
                        {pick.sellerName} · {money(pick.cpm)} CPM
                      </span>
                    </span>
                    <span className={styles.pickBudget}>{money(pick.budget)}</span>
                  </div>
                  <p className={styles.why}>“{pick.why}”</p>
                  <div className={styles.scores}>
                    <ProbabilityBars options={FIT_OPTIONS} probabilities={score?.fit?.probabilities || {}} choice={score?.fit?.choice} pending={!score} />
                    <ProbabilityBar
                      label="Safety risk"
                      value={score?.risk ?? 0}
                      tone={score?.risk >= riskLimit ? 'bad' : 'ok'}
                      marks={[riskLimit]}
                      pending={!score}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
          {shortlist.dropped.length > 0 && (
            <div className={styles.dropped}>
              <MiniLabel>Passed the checks, not picked</MiniLabel>
              <ul>
                {shortlist.dropped.map(item => (
                  <li key={item.productId}>
                    <span>{item.productName}</span>
                    <span className={styles.muted}> · {item.why}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className={styles.footnote}>
            The LLM picks and splits the budget; code rounds, caps by availability and keeps the total under the budget. A
            fast decision model scores fit and safety risk with probabilities; a pick at {Math.round(riskLimit * 100)}%
            risk or more is kept out of the plan.
            {run.scoresMs != null ? ` Scored in ${formatMs(run.scoresMs)}.` : ''}
          </p>
        </>
      ) : (
        <EmptyState size="s">The LLM’s picks appear here, each scored by a decision model.</EmptyState>
      )}
    </Card>
  );
}

// --- book: guardrails, bookings, retry ------------------------------------------------------------

export function BookCard({ run, checks, attempts, onRetry, retrying, bookingCounts }) {
  const lines = run.lines;
  return (
    <Card className={styles.bookCard}>
      <CardHead>
        <CardTitle>Plan checks and bookings</CardTitle>
      </CardHead>
      {checks.length ? (
        <div data-focus="checks">
          <CheckList items={checks} statusLabels={{ fixed: 'Approved' }} label="Plan guardrails" className={styles.checks} />
        </div>
      ) : (
        <EmptyState size="s">Budget cap, CPM ceiling, brand safety and flight dates are checked here before anything is booked.</EmptyState>
      )}
      {lines.length > 0 && (
        <ul className={styles.bookings} aria-label="Bookings">
          {lines.map((line, index) => {
            const first = lines.findIndex(other => other.seller === line.seller) === index;
            const pill = STATUS_PILL[line.status] || STATUS_PILL.planned;
            return (
              <li key={line.productId} className={styles.booking} data-status={line.status} data-focus={`booking-${line.seller}`}>
                <div className={styles.bookingMain}>
                  <span className={styles.pickName}>
                    {line.sellerName}
                    <span className={styles.productMeta}>
                      {line.productName} · {money(line.budget)} at {money(line.cpm)} · {impressions(line.impressions)} imps
                    </span>
                  </span>
                  <Pill tone={pill.tone}>{pill.label}</Pill>
                </div>
                <div className={styles.bookingMeta}>
                  {line.mediaBuyId ? (
                    <code className={styles.buyId}>{line.mediaBuyId}</code>
                  ) : line.status === 'awaiting' ? (
                    <span className={styles.muted}>Counteroffer at {money(line.offeredCpm)}: over the ceiling</span>
                  ) : (
                    <span className={styles.muted}>{line.note || '–'}</span>
                  )}
                  {first && line.status === 'booked' && line.args && (
                    <Button
                      size="s"
                      variant="secondary"
                      onClick={() => onRetry(line)}
                      disabled={retrying === line.seller}
                      data-focus={`retry-${line.seller}`}
                    >
                      {retrying === line.seller ? <Spinner /> : <FiRotateCw aria-hidden />} Retry the call
                    </Button>
                  )}
                </div>
                {first && bookingCounts[line.seller] != null && line.status === 'booked' && (
                  <p className={styles.bookCount}>
                    {bookingCounts[line.seller].requests} {bookingCounts[line.seller].requests === 1 ? 'request' : 'requests'} ·{' '}
                    <strong>
                      {bookingCounts[line.seller].buys} {bookingCounts[line.seller].buys === 1 ? 'booking' : 'bookings'}
                    </strong>{' '}
                    at {line.sellerName}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {attempts.length > 0 && (
        <div className={styles.requests} data-focus="requests">
          <MiniLabel>create_media_buy requests</MiniLabel>
          <RequestLog items={attempts} label="create_media_buy requests" />
        </div>
      )}
    </Card>
  );
}

export function EscalationCard({ escalation, onApprove, onReject, busy }) {
  if (!escalation) {
    return (
      <Card className={styles.escalationEmpty}>
        <CardTitle size="s">Human approval</CardTitle>
        <EmptyState size="s">
          When a seller counters outside the brief’s limits, the agent stops and asks a person here. It never accepts on its own.
        </EmptyState>
      </Card>
    );
  }
  const status = escalation.status || 'pending';
  return (
    <ApprovalCard
      className={styles.approval}
      data-focus="approval"
      status={status}
      statusText={{
        pending: 'The agent stopped: needs a person',
        approved: 'Approved by you: booked at the counter price',
        rejected: 'Declined: nothing booked with this seller',
      }}
      title={`${escalation.sellerName} countered at ${money(escalation.counter.fixed_price)} CPM`}
      meta={[
        ['Product', escalation.productName],
        ['Offer', `${money(escalation.counter.fixed_price)} CPM, was ${money(escalation.listCpm)}`],
        ['Ceiling', `${money(escalation.ceiling)} CPM`],
        ['Budget', money(escalation.budget)],
        ['Reach', `${impressions(escalation.impressionsAtCounter)} imps, was ${impressions(escalation.impressionsAtList)}`],
      ]}
      body={`Why it stopped: ${escalation.reasons.join('; ')}. Seller's reason: ${escalation.counter.reason}.`}
      onApprove={onApprove}
      onReject={onReject}
      approveLabel={`Approve ${money(escalation.counter.fixed_price)}`}
      rejectLabel="Decline"
      busy={busy}
    >
      {escalation.mediaBuyId && <code className={styles.buyId}>{escalation.mediaBuyId}</code>}
    </ApprovalCard>
  );
}

// --- messages, audit, final plan -------------------------------------------------------------------

export function MessagesCard({ run, sellers }) {
  const name = id => (id === 'buyer' ? 'Buyer agent' : id === 'you' ? 'You' : sellers.find(s => s.id === id)?.name || id);
  const messages = run.messages.map(message => ({
    id: message.id,
    side: message.from === 'buyer' || message.from === 'you' ? 'end' : 'start',
    name: name(message.from),
    avatar: message.from === 'buyer' ? 'BA' : message.from === 'you' ? 'You' : undefined,
    meta: message.to === 'all' ? 'to 3 seller agents' : `to ${name(message.to)}`,
    text: message.text,
  }));
  return (
    <Card className={styles.messagesCard}>
      <CardHead>
        <CardTitle>Agent-to-agent messages</CardTitle>
      </CardHead>
      <ChatThread className={styles.thread} messages={messages} empty="The agents' messages appear here." label="Agent messages" />
    </Card>
  );
}

export function FinalPlanCard({ run, auditItems }) {
  const lines = run.lines.filter(line => line.status !== 'dropped');
  const totals = planTotals(run.lines);
  return (
    <Card className={styles.finalCard}>
      <CardHead aside={run.brief ? <Pill tone="neutral">Budget {money(run.brief.budget)}</Pill> : null}>
        <CardTitle>The plan</CardTitle>
      </CardHead>
      {lines.length ? (
        <table className={styles.planTable}>
          <thead>
            <tr>
              <th>Seller</th>
              <th className={styles.num}>Spend</th>
              <th className={styles.num}>Impressions</th>
              <th className={styles.num}>CPM</th>
            </tr>
          </thead>
          <tbody>
            {lines.map(line => (
              <tr key={line.productId} data-status={line.status}>
                <td>
                  {line.sellerName}
                  <span className={styles.productMeta}>{STATUS_PILL[line.status]?.label}</span>
                </td>
                <td className={styles.num}>{money(line.budget)}</td>
                <td className={styles.num}>{impressions(line.impressions)}</td>
                <td className={styles.num}>{money(line.cpm)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Booked</td>
              <td className={styles.num}>{money(totals.booked)}</td>
              <td className={styles.num}>{totals.impressions ? impressions(totals.impressions) : '–'}</td>
              <td className={styles.num}>{totals.blendedCpm ? money(totals.blendedCpm, { cents: true }) : '–'}</td>
            </tr>
          </tfoot>
        </table>
      ) : (
        <EmptyState size="s">Spend by seller, expected impressions and the blended CPM.</EmptyState>
      )}
      <div className={styles.auditBox}>
        <MiniLabel>Audit trail</MiniLabel>
        <AuditTrail items={auditItems} empty="Every step the agent, the code and people take is logged here." />
      </div>
    </Card>
  );
}

/** Keeps the latest call selected unless the visitor picked one. */
export function useInspect(calls) {
  const [inspect, setInspect] = useState(null);
  const [pinned, setPinned] = useState(false);
  const last = calls[calls.length - 1]?.id ?? null;
  useEffect(() => {
    if (!pinned) setInspect(last);
  }, [last, pinned]);
  return [
    inspect,
    id => {
      setPinned(true);
      setInspect(id);
    },
    () => setPinned(false),
  ];
}

// Presentational cards for the Stacksync demo page. State lives in index.page.js.
import {
  ApprovalCard,
  AuditTrail,
  Button,
  Card,
  CardHead,
  CardTitle,
  CheckList,
  DecisionBadge,
  EmptyState,
  FieldMap,
  JsonDetails,
  MiniLabel,
  Notice,
  OptionList,
  Pill,
  ProbabilityBars,
  RequestLog,
  Spinner,
  StatusIcon,
  TextArea,
  formatMs,
  pct,
  srOnly,
} from 'demos/ui';
import { FiArrowDown, FiCode, FiPlay, FiRotateCw, FiZap } from 'react-icons/fi';
import { CUSTOMERS } from './data';
import { ROUTE_LABEL, ROUTE_TONE, ROUTE_VERDICT, money, summarize } from './sync';
import styles from './Stacksync.module.css';

const ROUTE_OPTIONS = [
  { value: 'auto', label: 'Auto-apply', tone: 'ok' },
  { value: 'approval', label: 'Approval', tone: 'warn' },
  { value: 'block', label: 'Block', tone: 'bad' },
];

export const shortKey = key => (key ? `${key.slice(0, 19)}…` : '');

// --- the deal -------------------------------------------------------------------------------------

export function DealCard({ samples, sampleId, onPick, facts, dealText, onEdit, editing, onToggleEdit, onRun, running, hasKey, notice, inputError }) {
  const custom = sampleId === 'custom';
  return (
    <Card className={styles.dealCard} data-focus="deal">
      <CardHead aside={<span className={styles.muted}>HubSpot-style JSON</span>}>
        <CardTitle>CRM deal</CardTitle>
      </CardHead>
      <OptionList label="Sample deals" options={samples} value={sampleId} onChange={onPick} className={styles.samples} />
      {facts && (
        <div className={styles.dealSummary} data-focus="dealSummary">
          <div className={styles.dealTop}>
            <span className={styles.dealName}>{facts.name || `Deal ${facts.id}`}</span>
            <span className={styles.dealAmount}>{money(facts.amount, facts.currency || 'USD')}</span>
          </div>
          <p className={styles.dealMeta}>
            {facts.companyName} · closed {facts.closedate} · {facts.currency}
          </p>
          <table className={styles.lines}>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Disc.</th>
              </tr>
            </thead>
            <tbody>
              {facts.lines.map(entry => (
                <tr key={entry.line}>
                  <td className={styles.mono}>{entry.sku}</td>
                  <td className={styles.num}>{entry.quantity}</td>
                  <td className={styles.num}>{money(entry.price, facts.currency || 'USD')}</td>
                  <td className={styles.num} data-hot={entry.discount > 30 || undefined}>
                    {entry.discount ? `${entry.discount}%` : '–'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className={styles.dealActions}>
        <Button type="button" onClick={onRun} disabled={running}>
          {running ? (
            <>
              <Spinner /> Running
            </>
          ) : (
            <>
              <FiPlay aria-hidden /> {custom ? 'Run it live' : 'Run again'}
            </>
          )}
        </Button>
        <Button type="button" variant="ghost" size="s" onClick={onToggleEdit} aria-expanded={editing}>
          <FiCode aria-hidden /> {editing ? 'Hide JSON' : 'Edit the JSON'}
        </Button>
      </div>
      {editing && (
        <>
          <label className={srOnly} htmlFor="stacksync-deal">
            Deal JSON
          </label>
          <TextArea
            id="stacksync-deal"
            code
            className={styles.editor}
            value={dealText}
            maxLength={6000}
            spellCheck={false}
            onChange={event => onEdit(event.target.value)}
          />
          <p className={styles.small}>
            {hasKey
              ? 'Change a quantity, a discount, a SKU or the currency, then run it live: the LLM drafts a new plan and every check runs again. Keep "amount" in step with the lines, or the totals check catches it.'
              : 'Edits run live with the private link from my message. The three samples work without it.'}
          </p>
        </>
      )}
      {inputError && (
        <Notice kind="error" size="s" className={styles.notice} role="alert">
          {inputError}
        </Notice>
      )}
      {notice && (
        <Notice size="s" className={styles.notice} role="status">
          {notice}
        </Notice>
      )}
    </Card>
  );
}

// --- the verdict ----------------------------------------------------------------------------------

export function VerdictCard({ run, onApply, onOpenQueue, applying, applied, exampleNote }) {
  const done = run.status === 'done';
  const route = run.final?.route;
  const probs = run.decision?.probabilities || {};
  const sum = run.checks?.length ? summarize(run.checks) : null;
  const modelChoice = run.decision?.choice;
  const waiting = !done && run.status !== 'idle' && run.status !== 'error';
  return (
    <Card className={styles.verdict} data-route={done ? route : undefined} data-focus="verdict" aria-live="polite">
      <CardHead
        aside={
          run.kind === 'live' ? <Pill tone="live">Live run</Pill> : <Pill>Recorded run</Pill>
        }
      >
        <CardTitle>Route for this write</CardTitle>
      </CardHead>

      <div className={styles.verdictTop} data-focus="verdictTop">
        {done ? (
          <>
            <DecisionBadge tone={ROUTE_TONE[route]} size="l">
              {ROUTE_VERDICT[route]}
            </DecisionBadge>
            <div className={styles.verdictProb}>
              <span className={styles.bigNumber}>{pct(probs[route] ?? 0)}</span>
              <span className={styles.muted}>
                {run.final.overruled
                  ? `model said ${ROUTE_LABEL[modelChoice].toLowerCase()} ${pct(probs[modelChoice] ?? 0)}`
                  : `${ROUTE_LABEL[route].toLowerCase()}, decision model`}
              </span>
            </div>
          </>
        ) : (
          <div className={styles.verdictWait}>
            {waiting && <Spinner />}
            <span>
              {run.status === 'drafting'
                ? 'The LLM is drafting the ERP write plan…'
                : run.status === 'checking'
                ? 'Code is checking the plan…'
                : run.status === 'deciding'
                ? 'The decision model is scoring the risk…'
                : run.status === 'error'
                ? 'The run stopped.'
                : 'Pick a deal to run.'}
            </span>
          </div>
        )}
      </div>

      <div className={styles.verdictBars} data-focus="bars">
        <MiniLabel>Decision model: route probabilities</MiniLabel>
        <ProbabilityBars
          options={ROUTE_OPTIONS}
          probabilities={probs}
          choice={done ? modelChoice : undefined}
          pending={!done || !run.decision}
        />
      </div>

      <div className={styles.codeSays} data-route={done ? route : undefined} data-focus="codeSays">
        {sum && done ? (
          <>
            <StatusIcon status={sum.failed.length ? 'fail' : sum.review.length ? 'warn' : 'pass'} />
            <span>
              <strong>
                {sum.passed} of {sum.total} checks pass
              </strong>
              {' · '}
              {run.final.overruled ? <strong>code overruled the model: </strong> : 'code: '}
              {run.final.reason.charAt(0).toLowerCase() + run.final.reason.slice(1)}
            </span>
          </>
        ) : (
          <span className={styles.muted}>Code checks the plan before the model is asked.</span>
        )}
      </div>

      {done && route === 'block' && sum?.failed.length > 0 && (
        <ul className={styles.reasons} data-focus="reasons">
          {sum.failed.map(check => (
            <li key={check.id}>
              <StatusIcon status="fail" />
              <span>
                <strong>{check.label}.</strong> {check.detail}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.verdictActions}>
        {done && route === 'auto' && (
          <Button type="button" onClick={onApply} disabled={applying || Boolean(applied)} data-focus="applyTop">
            {applying ? (
              <>
                <Spinner /> Writing
              </>
            ) : applied ? (
              `Applied as ${applied.salesOrder}`
            ) : (
              <>
                <FiZap aria-hidden /> Apply to ERP
              </>
            )}
          </Button>
        )}
        {done && route === 'approval' && (
          <Button type="button" variant="secondary" onClick={onOpenQueue}>
            <FiArrowDown aria-hidden /> Open the approval card
          </Button>
        )}
        {done && route === 'block' && <span className={styles.muted}>Nothing is written. Fix the deal in the CRM and it syncs again.</span>}
        {done && run.llmMs ? (
          <span className={styles.timing}>
            plan {formatMs(run.llmMs)} · route {formatMs(run.decision?.ms || 0)}
            {run.cached ? ' · cached' : ''}
          </span>
        ) : null}
      </div>
      {run.kind === 'example' && <p className={styles.small}>{exampleNote}</p>}
    </Card>
  );
}

// --- the plan -------------------------------------------------------------------------------------

export function MapCard({ rows, plan }) {
  return (
    <Card className={styles.mapCard} data-focus="map">
      <CardHead aside={<span className={styles.muted}>NetSuite-style sales order</span>}>
        <CardTitle>CRM → ERP field map</CardTitle>
      </CardHead>
      {rows ? (
        <FieldMap rows={rows} fromLabel="CRM deal" toLabel="ERP write plan" label="CRM to ERP field map" />
      ) : (
        <EmptyState size="s">The mapping appears when the plan is drafted.</EmptyState>
      )}
      {plan && <JsonDetails className={styles.planJson} summary="The write plan as JSON (the LLM's output)" value={plan} />}
    </Card>
  );
}

export function ChecksCard({ checks, reveal, slipped, onSlip, canSlip }) {
  const shown = (checks || []).slice(0, reveal);
  const sum = checks ? summarize(checks) : null;
  return (
    <Card className={styles.checksCard} data-focus="checks">
      <CardHead
        aside={
          sum && reveal >= checks.length ? (
            <Pill tone={sum.failed.length ? 'bad' : sum.review.length ? 'warn' : 'ok'}>
              {sum.passed}/{sum.total} pass
            </Pill>
          ) : null
        }
      >
        <CardTitle>Checks in code</CardTitle>
      </CardHead>
      <p className={styles.cardLede}>Schema first (unknown fields rejected), then the ERP tables and the policy. A failed hard check blocks the write whatever the model says.</p>
      {shown.length ? (
        <CheckList
          items={shown}
          label="Checks"
        />
      ) : (
        <EmptyState size="s">Checks run when the plan arrives.</EmptyState>
      )}
      {canSlip && (
        <div className={styles.slip} data-focus="slip">
          <Button type="button" variant="secondary" size="s" onClick={onSlip}>
            <FiRotateCw aria-hidden /> {slipped ? 'Put the honest plan back' : 'Simulate a model slip'}
          </Button>
          <span className={styles.small}>
            {slipped
              ? 'Simulated: the plan gained a field the ERP does not have and a rounded rate.'
              : 'What if the LLM adds a field or rounds a rate? Code catches it.'}
          </span>
        </div>
      )}
    </Card>
  );
}

// --- apply once -----------------------------------------------------------------------------------

export function ApplyCard({ run, applied, requests, onApply, onReplay, applying, hasKey, canApply }) {
  const key = run.key;
  return (
    <Card className={styles.applyCard} data-focus="apply">
      <CardHead aside={<span className={styles.muted}>{hasKey ? 'Server store, your session' : 'Simulated in this tab'}</span>}>
        <CardTitle>Write it once</CardTitle>
      </CardHead>
      <div className={styles.keyRow} data-focus="key">
        <MiniLabel>Idempotency key: deal id + plan hash</MiniLabel>
        <code className={styles.key}>{key || '–'}</code>
      </div>
      <div className={styles.applyButtons} data-focus="applyButtons">
        <Button type="button" onClick={onApply} disabled={!canApply || applying || Boolean(applied)}>
          {applied ? `Applied as ${applied.salesOrder}` : (
            <>
              <FiZap aria-hidden /> Apply to ERP
            </>
          )}
        </Button>
        <Button type="button" variant="secondary" onClick={onReplay} disabled={!applied || applying}>
          <FiRotateCw aria-hidden /> Replay the retry
        </Button>
      </div>
      {!canApply && !applied && (
        <p className={styles.small}>
          {run.final?.route === 'approval'
            ? 'This deal waits for a person in the approval queue below.'
            : run.final?.route === 'block'
            ? 'Blocked deals never reach the ERP.'
            : 'Run a deal first.'}
        </p>
      )}
      <div className={styles.requests} data-focus="requests">
        <RequestLog
          items={requests}
          label="ERP write requests"
          empty="Write requests to the ERP show up here."
        />
      </div>
    </Card>
  );
}

export function ErpCard({ orders, requestCount }) {
  return (
    <Card className={styles.erpCard} data-focus="erp">
      <CardHead aside={<span className={styles.muted}>sample ERP</span>}>
        <CardTitle>Sales orders in the ERP</CardTitle>
      </CardHead>
      <div className={styles.erpStat} data-focus="erpStat">
        <span className={styles.bigNumber}>{orders.length}</span>
        <span className={styles.muted}>
          sales order{orders.length === 1 ? '' : 's'} from {requestCount} write request{requestCount === 1 ? '' : 's'}
        </span>
      </div>
      {orders.length ? (
        <ul className={styles.orders}>
          {orders.map(order => (
            <li key={order.key}>
              <span className={styles.orderId}>{order.salesOrder}</span>
              <span className={styles.orderWho}>
                {Object.values(CUSTOMERS).find(customer => customer.entity === order.entity)?.name || order.entity}
                <span className={styles.muted}>
                  {' '}
                  · {order.lines} lines{order.approvedBy ? ` · approved by ${order.approvedBy}` : ''}
                </span>
              </span>
              <span className={styles.orderTotal}>{money(order.total, order.currency)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState size="s">No sales orders written yet.</EmptyState>
      )}
    </Card>
  );
}

// --- approval queue -------------------------------------------------------------------------------

export function QueueList({ items, onApprove, onReject, busyKey }) {
  if (!items.length) {
    return (
      <EmptyState size="m">
        Nothing waiting. Run “New logo, big discount” and it lands here with its reasons.
      </EmptyState>
    );
  }
  return (
    <div className={styles.queue}>
      {items.map(item => (
        <ApprovalCard
          key={item.key}
          className={styles.approval}
          data-focus="approval"
          status={item.status}
          statusText={{
            pending: 'Waiting for your approval',
            approved: item.order ? `Approved · written once as ${item.order.salesOrder}` : 'Approved',
            rejected: 'Rejected · nothing written, the rep is told why',
          }}
          title={`${item.customer} · ${money(item.total, item.currency)}`}
          meta={[
            ['Deal', `hs-deal-${item.dealId} · ${item.dealName}`],
            ['Customer', item.customerNote],
            ['Model', `approval queue ${pct(item.probability)}`],
          ]}
          onApprove={() => onApprove(item)}
          onReject={() => onReject(item)}
          approveLabel="Approve and write"
          rejectLabel="Reject"
          busy={busyKey === item.key}
        >
          <ul className={styles.reasons} data-focus="approvalReasons">
            {item.reasons.map(reason => (
              <li key={reason.id}>
                <StatusIcon status="warn" />
                <span>
                  <strong>{reason.label}.</strong> {reason.detail}
                </span>
              </li>
            ))}
          </ul>
        </ApprovalCard>
      ))}
    </div>
  );
}

export function AuditCard({ items }) {
  return (
    <Card className={styles.auditCard} data-focus="audit">
      <AuditTrail items={items} label="Audit timeline" empty="Every step of every run lands here." />
    </Card>
  );
}

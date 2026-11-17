// Presentational pieces of the Truss page: the hero glance, the invoice picker, the typed bill,
// the checks, the decision, the payment, the ledger and the audit trail. All state lives in
// index.page.js; these only render it.
import {
  AuditTrail,
  Button,
  Card,
  CardHead,
  CardTitle,
  Caret,
  DecisionBadge,
  DocumentScan,
  EmptyState,
  EvalTable,
  JsonDetails,
  KeyValues,
  MiniLabel,
  Notice,
  Pill,
  ProbabilityBars,
  RequestLog,
  SkeletonGrid,
  Spinner,
  StatGrid,
  StatTile,
  Tag,
  formatMs,
} from 'demos/ui';
import { FiAlertTriangle, FiCheck, FiRepeat, FiSend, FiUpload } from 'react-icons/fi';
import {
  DECISION_LABEL,
  DECISION_TONE,
  matchVendor,
  money,
  masked,
  shortDate,
} from './pipeline';
import styles from './Truss.module.css';

const OPTION_BARS = [
  { value: 'approve', label: 'Approve', tone: 'ok' },
  { value: 'hold', label: 'Hold', tone: 'warn' },
  { value: 'reject', label: 'Reject', tone: 'bad' },
];

const short = (id, size = 10) => (id ? `${String(id).slice(0, size)}…` : '');
const pctText = value => `${Math.round((value || 0) * 100)}%`;

// --- hero ------------------------------------------------------------------------------------

/** The run at a glance: what happened to this bill, in one card beside the page title. */
export function Glance({ run, pay, ledger, sample, upload }) {
  const bill = run.extraction?.bill;
  const final = run.decision?.final;
  const passed = run.checks.filter(check => check.pass === true).length;
  const charged = ledger.charges.filter(charge => bill && charge.invoiceNumber === bill.invoiceNumber);
  const deduped = ledger.requests.filter(request => request.outcome === 'replayed').length;
  const paid = charged.length > 0 && final === 'approve';

  let status = 'Pick an invoice';
  let tone;
  let sub = 'Read, checked, decided, paid once';
  if (run.status === 'running' && !run.extraction) status = 'Reading the invoice…';
  else if (run.status === 'running' && !run.decision) status = 'Checking the bill…';
  else if (run.status === 'running') status = 'Writing the note…';
  else if (run.status === 'error') {
    status = 'Run stopped';
    tone = 'bad';
    sub = 'Nothing was paid';
  } else if (final === 'approve' && (pay.phase === 'timedout' || pay.phase === 'retrying')) {
    status = 'No reply. Retrying…';
    sub = 'Same idempotency key, so no second charge';
  } else if (final === 'approve' && paid) {
    status = 'Paid once';
    tone = 'ok';
    sub = `${charged.length} charge · ${deduped} ${deduped === 1 ? 'retry' : 'retries'} deduplicated`;
  } else if (final === 'approve') {
    status = pay.phase === 'sending' ? 'Paying…' : 'Approved';
    tone = 'ok';
    sub = 'Ready to pay from the account on file';
  } else if (final === 'hold') {
    status = 'Held for review';
    tone = 'warn';
    sub = run.decision.floor.reasons[0]?.text || 'A person checks it first';
  } else if (final === 'reject') {
    status = 'Rejected';
    tone = 'bad';
    sub = run.checks.find(check => check.id === 'duplicate' && check.pass === false)
      ? 'Already paid: caught before payment'
      : run.decision.floor.reasons[0]?.text || 'Not paid';
  }

  const jev = run.decision?.jev;
  return (
    <Card tone="accent" className={styles.glance} aria-live="polite">
      <div className={styles.glanceTop}>
        <span className={styles.glanceKind}>
          {run.kind === 'example' ? 'Example run' : 'Live run'}
        </span>
        <span className={styles.glanceId}>{bill?.invoiceNumber || (upload ? upload.name : sample?.label)}</span>
      </div>
      <div className={styles.glanceWho}>
        {bill
          ? `${matchVendor(bill)?.name || bill.vendorName} · ${money(bill.amountDue)} ${bill.currency}`
          : sample
          ? `${sample.label} · ${sample.hint}`
          : 'Your invoice'}
      </div>
      <div className={styles.glanceStatus}>
        <strong data-tone={tone}>{status}</strong>
        <span className={styles.glanceSub}>{sub}</span>
      </div>
      <dl className={styles.glanceStats}>
        <div>
          <dt>Checks</dt>
          <dd>{run.checks.length ? `${passed}/${run.checks.length}` : '–'}</dd>
        </div>
        <div>
          <dt>Decision</dt>
          <dd>{final ? `${DECISION_LABEL[final].split(' ')[0]}${jev?.probabilities ? ` ${pctText(jev.probabilities[jev.choice])}` : ''}` : '–'}</dd>
        </div>
        <div>
          <dt>Charges</dt>
          <dd>{bill ? charged.length : '–'}</dd>
        </div>
      </dl>
    </Card>
  );
}

// --- step 1: the invoice and the typed bill -----------------------------------------------------

export function InvoicePicker({ samples, value, onPick, upload, onUpload, hasKey, disabled }) {
  return (
    <div className={styles.picker} role="radiogroup" aria-label="Sample invoices">
      {samples.map(sample => (
        <button
          key={sample.id}
          type="button"
          role="radio"
          aria-checked={value === sample.id && !upload}
          className={styles.pick}
          data-active={(value === sample.id && !upload) || undefined}
          onClick={() => onPick(sample.id)}
          disabled={disabled}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.pickThumb} src={sample.image} alt="" width={64} height={83} />
          <span className={styles.pickText}>
            <strong>{sample.label}</strong>
            <span>{sample.hint}</span>
            <Tag tone={sample.expect === 'approve' ? 'ok' : sample.expect === 'hold' ? 'warn' : 'bad'}>
              {sample.tag}
            </Tag>
          </span>
        </button>
      ))}
      <label
        className={styles.pick}
        data-upload
        data-active={upload ? true : undefined}
        data-disabled={!hasKey || disabled || undefined}
        title={hasKey ? 'Upload an invoice image (PNG, JPEG or WebP)' : 'Uploading needs the private link'}
      >
        <span className={styles.pickIcon} aria-hidden>
          <FiUpload />
        </span>
        <span className={styles.pickText}>
          <strong>{upload ? 'Your invoice' : 'Your own invoice'}</strong>
          <span>{upload ? upload.name : hasKey ? 'PNG, JPEG or WebP' : 'Live link only'}</span>
        </span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className={styles.fileInput}
          disabled={!hasKey || disabled}
          onChange={event => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) onUpload(file);
          }}
        />
      </label>
    </div>
  );
}

export function InvoiceImage({ sample, upload, run }) {
  const src = upload?.dataUrl || sample?.image;
  const reading = run.status === 'running' && !run.extraction;
  return (
    <DocumentScan
      className={styles.doc}
      src={src}
      alt={upload ? `Uploaded invoice ${upload.name}` : `Sample invoice from ${sample?.label}`}
      width={upload?.width || sample?.width}
      height={upload?.height || sample?.height}
      scanning={reading}
      done={Boolean(run.extraction)}
      href={upload ? undefined : sample?.image}
      caption={
        reading
          ? 'Reading the image…'
          : upload
          ? 'Your upload'
          : 'Sample invoice image (fictional). Open it full size.'
      }
    />
  );
}

function BillLines({ bill }) {
  return (
    <div className={styles.lines} role="table" aria-label="Line items">
      <div className={styles.lineHead} role="row">
        <span role="columnheader">Line</span>
        <span role="columnheader">Qty × rate</span>
        <span role="columnheader">Amount</span>
      </div>
      {bill.lines.map((line, index) => (
        <div key={index} className={styles.line} role="row">
          <span role="cell">{line.description}</span>
          <span role="cell" className={styles.mono}>
            {line.quantity.toLocaleString('en-CA')} {line.unit} × {money(line.unitPrice, { sign: false })}
          </span>
          <span role="cell" className={styles.mono}>
            {money(line.amount, { sign: false })}
          </span>
        </div>
      ))}
    </div>
  );
}

export function BillCard({ run, exampleNote }) {
  const extraction = run.extraction;
  const bill = extraction?.bill;
  const reading = run.status === 'running' && !extraction;
  return (
    <Card aria-live="polite">
      <CardHead
        aside={
          extraction ? (
            <span className={styles.pills}>
              <Pill tone={extraction.valid ? 'ok' : 'warn'}>
                {extraction.valid ? 'Schema valid' : 'Schema errors'}
              </Pill>
              <Pill>{extraction.fields} fields</Pill>
              <Pill>
                {extraction.model}
                {extraction.ms ? ` · ${formatMs(extraction.ms)}` : ''}
              </Pill>
              {extraction.cached && <Pill tone="live">cached read</Pill>}
            </span>
          ) : null
        }
      >
        <CardTitle>Typed bill</CardTitle>
      </CardHead>
      {run.kind === 'example' && exampleNote && <p className={styles.exampleNote}>{exampleNote}</p>}
      {!extraction ? (
        reading ? (
          <SkeletonGrid count={3} label="Reading the invoice" />
        ) : (
          <EmptyState size="s">The invoice fields appear here once the image is read.</EmptyState>
        )
      ) : !bill ? (
        <Notice kind="error" size="s">
          The image could not be read into a bill ({extraction.errors.join('; ')}). It is held for a
          person.
        </Notice>
      ) : (
        <div className={styles.bill}>
          <KeyValues
            className={styles.billKv}
            items={[
              ['Vendor', bill.vendorName],
              ['Invoice', <span key="inv" className={styles.mono}>{bill.invoiceNumber}</span>],
              ['PO', <span key="po" className={styles.mono}>{bill.poNumber || '–'}</span>],
              ['Billing', bill.billingRef || '–'],
              ['Dated', shortDate(bill.invoiceDate)],
              ['Due', `${shortDate(bill.dueDate)} · ${bill.terms}`],
            ]}
          />
          <BillLines bill={bill} />
          <div className={styles.billFoot}>
            <dl className={styles.totals}>
              <div>
                <dt>Subtotal</dt>
                <dd>{money(bill.subtotal)}</dd>
              </div>
              <div>
                <dt>HST {bill.taxPercent}%</dt>
                <dd>{money(bill.taxAmount)}</dd>
              </div>
              <div>
                <dt>Retainage {bill.retainagePercent}%</dt>
                <dd>−{money(bill.retainageAmount)}</dd>
              </div>
              <div data-strong>
                <dt>Amount due</dt>
                <dd>
                  {money(bill.amountDue)} {bill.currency}
                </dd>
              </div>
            </dl>
            <div className={styles.remit}>
              <MiniLabel>Remit to (as printed)</MiniLabel>
              <span className={styles.remitBank}>{bill.remitTo.bankName || '–'}</span>
              <span className={styles.mono}>
                {bill.remitTo.institution}-{bill.remitTo.transit} {masked(bill.remitTo.account)}
              </span>
              <span className={styles.flags}>
                {bill.bankChangeNotice && <Tag tone="bad">says bank changed</Tag>}
                <Tag tone={bill.lienWaiver ? 'ok' : 'warn'}>
                  {bill.lienWaiver ? 'lien waiver' : 'no lien waiver'}
                </Tag>
              </span>
            </div>
          </div>
          <JsonDetails summary="The model's JSON" value={extraction.raw} />
        </div>
      )}
    </Card>
  );
}

// --- step 2: checks and decision ------------------------------------------------------------------

export function ChecksCard({ run }) {
  const { checks } = run;
  const passed = checks.filter(check => check.pass === true).length;
  const failed = checks.length - passed;
  const waiting = run.status === 'running' && checks.length === 0;
  return (
    <Card className={styles.checksCard}>
      <CardHead
        aside={
          checks.length ? (
            <Pill tone={failed ? 'bad' : 'ok'}>
              {passed}/{checks.length} passed
            </Pill>
          ) : null
        }
      >
        <CardTitle>Checks in code</CardTitle>
      </CardHead>
      <p className={styles.cardLede}>
        Against the vendor file, the purchase order and every payment already made. No model is
        asked whether the numbers add up.
      </p>
      {checks.length ? (
        <EvalTable
          className={styles.checks}
          columns={['Check', 'Vendor file / rule', 'On this bill']}
          rows={checks.map(check => ({
            id: check.id,
            label: check.label,
            expected: check.expected,
            actual: check.actual,
            pass: check.pass,
          }))}
        />
      ) : (
        <EmptyState size="s" loading={waiting}>
          {waiting ? 'Waiting for the typed bill…' : 'Eight checks run once the bill is read.'}
        </EmptyState>
      )}
    </Card>
  );
}

export function DecisionCard({ run }) {
  const decision = run.decision;
  const jev = decision?.jev;
  const noteRunning = run.stages.note?.status === 'running';
  return (
    <Card className={styles.decisionCard} aria-live="polite">
      <CardHead
        aside={
          jev?.probabilities ? (
            <Pill>
              Jev{jev.ms ? ` · ${formatMs(jev.ms)}` : ''}
              {jev.cached ? ' · cached' : ''}
            </Pill>
          ) : null
        }
      >
        <CardTitle>Decision</CardTitle>
      </CardHead>
      {!decision ? (
        <EmptyState size="s" loading={run.status === 'running' && run.checks.length > 0}>
          The decision model weighs the checks; code sets the floor.
        </EmptyState>
      ) : (
        <div className={styles.decision}>
          <div>
            <MiniLabel>Decision model</MiniLabel>
            {jev?.probabilities ? (
              <ProbabilityBars
                className={styles.bars}
                options={OPTION_BARS}
                probabilities={jev.probabilities}
                choice={jev.choice}
              />
            ) : (
              <p className={styles.small}>{jev?.error || 'Not asked: the bill could not be read.'}</p>
            )}
          </div>
          <div className={styles.floor}>
            <MiniLabel>Rules floor (code)</MiniLabel>
            {decision.floor.reasons.length ? (
              <ul>
                {decision.floor.reasons.map(reason => (
                  <li key={reason.text} data-tone={DECISION_TONE[reason.choice]}>
                    <FiAlertTriangle aria-hidden /> {reason.text}{' '}
                    <span className={styles.floorMin}>→ at least {reason.choice}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.floorOk}>
                <FiCheck aria-hidden /> Every check passed: the model may approve.
              </p>
            )}
          </div>
          <div className={styles.final}>
            <DecisionBadge size="l" tone={DECISION_TONE[decision.final]}>
              {DECISION_LABEL[decision.final]}
            </DecisionBadge>
            <span className={styles.finalWhy}>
              {decision.by === 'rules'
                ? `The rules overrule the model${jev?.choice ? ` (it said ${jev.choice})` : ''}: the stricter call wins.`
                : 'The stricter of the model and the rules.'}
            </span>
          </div>
          <div className={styles.note}>
            <MiniLabel>Reviewer note · DeepSeek</MiniLabel>
            {run.note ? (
              <p>
                {run.note}
                {noteRunning && <Caret variant="soft" />}
              </p>
            ) : run.noteError ? (
              <p className={styles.small}>{run.noteError}</p>
            ) : (
              <EmptyState size="s" loading={noteRunning}>
                Writing…
              </EmptyState>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// --- step 3: pay once ---------------------------------------------------------------------------------

const PHASE_TEXT = {
  idle: '',
  sending: 'Sending the payment…',
  timedout: 'No reply in 1.5 s. Did the charge go through? Retrying with the same key…',
  retrying: 'Retrying with the same idempotency key…',
  done: '',
  refused: '',
};

export function PayCard({ run, payTo, pay, onPay, onTimeoutRetry, onRetrySame, onNewKey, onForce, hasKey, kind }) {
  const decision = run.decision;
  const bill = run.extraction?.bill;
  const busy = ['sending', 'timedout', 'retrying'].includes(pay.phase);
  const paidOnce = pay.paymentId != null;

  if (!decision || run.status !== 'done') {
    return (
      <Card className={styles.payCard}>
        <CardHead>
          <CardTitle>Payment</CardTitle>
        </CardHead>
        <EmptyState size="s" loading={run.status === 'running'}>
          {run.status === 'running' ? 'Waiting for the decision…' : 'Only an approved bill can be paid.'}
        </EmptyState>
      </Card>
    );
  }

  if (decision.final !== 'approve') {
    const reason =
      decision.floor.reasons[0]?.text || (decision.final === 'reject' ? 'Rejected' : 'Held for review');
    return (
      <Card className={styles.payCard} data-blocked>
        <CardHead aside={<Pill tone={DECISION_TONE[decision.final]}>not paid</Pill>}>
          <CardTitle>Payment</CardTitle>
        </CardHead>
        <div className={styles.blocked} data-tone={DECISION_TONE[decision.final]}>
          <strong>
            {decision.final === 'reject' ? 'Stopped before payment' : 'Held: no money moves until a person checks it'}
          </strong>
          <span>{reason}</span>
        </div>
        <p className={styles.small}>
          The payment endpoint checks the decision too: it pays only bills this run approved, whatever
          the browser sends.
        </p>
        <div className={styles.payActions}>
          <Button variant="secondary" size="s" onClick={onForce} disabled={busy || !bill}>
            {busy ? <Spinner /> : <FiSend aria-hidden />} Try to pay it anyway
          </Button>
        </div>
        {pay.message && (
          <Notice size="s" className={styles.notice} role="status">
            {pay.message}
          </Notice>
        )}
      </Card>
    );
  }

  return (
    <Card className={styles.payCard}>
      <CardHead aside={paidOnce ? <Pill tone="ok">paid once</Pill> : <Pill tone="ok">approved</Pill>}>
        <CardTitle>Payment</CardTitle>
      </CardHead>
      <KeyValues
        className={styles.payKv}
        items={[
          ['Pay', <strong key="amt">{money(bill.amountDue)} {bill.currency}</strong>],
          ['To', payTo ? `${payTo.name}, ${payTo.bank} ${payTo.account} (on file)` : bill.vendorName],
          ['Bill', <span key="bill" className={styles.mono}>{run.billId}</span>],
          [
            'Idempotency key',
            <span key="key" className={styles.keyValue}>
              {pay.key}
            </span>,
          ],
        ]}
      />
      <div className={styles.payActions}>
        {!paidOnce ? (
          <>
            <Button onClick={onTimeoutRetry} disabled={busy}>
              {busy ? <Spinner /> : <FiRepeat aria-hidden />} Simulate a timeout and retry
            </Button>
            <Button variant="secondary" onClick={onPay} disabled={busy}>
              <FiSend aria-hidden /> Pay
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" size="s" onClick={onRetrySame} disabled={busy}>
              {busy ? <Spinner /> : <FiRepeat aria-hidden />} Send the same request again
            </Button>
            <Button variant="ghost" size="s" onClick={onNewKey} disabled={busy}>
              Pay again with a new key
            </Button>
          </>
        )}
      </div>
      {(busy || pay.message) && (
        <p className={styles.payPhase} role="status" data-busy={busy || undefined}>
          {busy && <Spinner />} {PHASE_TEXT[pay.phase] || pay.message}
        </p>
      )}
      {pay.attempts.length > 0 && (
        <ol className={styles.attempts} aria-label="What the browser saw">
          {pay.attempts.map(attempt => (
            <li key={attempt.n} data-tone={attempt.timedOut ? 'bad' : attempt.status >= 400 ? 'warn' : 'ok'}>
              <span className={styles.attemptN}>Attempt {attempt.n}</span>
              <span>
                {attempt.pending
                  ? 'sent, waiting…'
                  : attempt.timedOut
                  ? `no reply after ${formatMs(attempt.ms)}: timed out`
                  : attempt.replayed
                  ? `${attempt.status}, replayed ${attempt.paymentId}: no new charge`
                  : attempt.status === 201
                  ? `${attempt.status}, charged ${attempt.paymentId}`
                  : `${attempt.status}: ${attempt.error}`}
              </span>
            </li>
          ))}
        </ol>
      )}
      {!hasKey && kind === 'example' && (
        <p className={styles.small}>
          Preview: the payment endpoint runs in your browser on the same code as the API, with the
          same keys and checks.
        </p>
      )}
    </Card>
  );
}

export function LedgerCard({ ledger, timedOut, kind, onNewSession, busy }) {
  const deduped = ledger.requests.filter(request => request.outcome === 'replayed').length;
  const refused = ledger.requests.filter(request => ['refused', 'blocked', 'in_progress'].includes(request.outcome)).length;
  return (
    <Card className={styles.ledgerCard}>
      <CardHead
        aside={
          <span className={styles.ledgerHead}>
            <Pill>{kind === 'example' ? 'in your browser' : 'server ledger'}</Pill>
            <Button
              variant="ghost"
              size="s"
              onClick={onNewSession}
              disabled={busy}
              title="Start a new session: an empty ledger, nothing paid yet"
            >
              New session
            </Button>
          </span>
        }
      >
        <CardTitle>Ledger</CardTitle>
      </CardHead>
      <StatGrid columns={3} className={styles.ledgerStats}>
        <StatTile label="Charges" value={ledger.charges.length} tone="tint" />
        <StatTile label="Requests" value={ledger.requests.length} />
        <StatTile label="Retries deduplicated" value={deduped} note={refused ? `${refused} refused` : undefined} />
      </StatGrid>
      {ledger.charges.length > 0 && (
        <ul className={styles.charges} aria-label="Charges">
          {ledger.charges.map(charge => (
            <li key={charge.paymentId}>
              <span className={styles.mono}>{charge.paymentId}</span>
              <span>
                {charge.vendorName} · {charge.invoiceNumber}
              </span>
              <strong>{money(charge.amount)}</strong>
              <span className={styles.muted}>to {charge.to}</span>
            </li>
          ))}
        </ul>
      )}
      <MiniLabel className={styles.logLabel}>Requests the payment endpoint received</MiniLabel>
      <RequestLog
        items={ledger.requests.map(request => ({
          id: request.id,
          at: request.at,
          method: 'POST',
          path: '/pay',
          status: request.status,
          outcome: request.outcome,
          note: timedOut.has(`${request.key}:${request.attempt}`)
            ? `${request.note}. The browser had already given up waiting.`
            : request.note,
          meta: [`key ${short(request.key, 14)}`, `attempt ${request.attempt}`, request.paymentId].filter(Boolean),
          highlight: request.outcome === 'replayed',
        }))}
        empty="No payment requests yet."
      />
    </Card>
  );
}

// --- audit -------------------------------------------------------------------------------------------

export function AuditCard({ items, trace }) {
  return (
    <Card className={styles.auditCard}>
      <CardHead aside={<Pill>{items.length} entries</Pill>}>
        <CardTitle>Audit trail</CardTitle>
      </CardHead>
      <AuditTrail items={items} empty="Every step of a run lands here: what read the bill, what each check found, who decided, every payment request." />
      {trace && <JsonDetails className={styles.trace} summary="Trace as JSON (what the logs keep)" value={trace} />}
    </Card>
  );
}

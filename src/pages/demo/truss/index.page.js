// Truss demo: a bill-to-payment agent for a general contractor's accounts payable.
// Live at /demo/truss/ (unlisted, noindex). An invoice image becomes a typed bill (Gemini), code
// checks it against the vendor file, the PO and the paid ledger, a decision model approves, holds or
// rejects under a rules floor, and the payment goes out with an idempotency key, so a retried
// request never charges twice. Without a demo key the page replays recorded model outputs and runs
// the checks and the payment endpoint in the browser; with one it calls /api/demo/truss/*.
import { DemoLayout } from 'demos/DemoLayout';
import { getDemoKey, streamFromApi } from 'demos/client';
import { Button, Notice, NoteGrid, PipelineStrip, SectionHead, Spinner, formatMs } from 'demos/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FiPlay } from 'react-icons/fi';
import { SAMPLES, sampleById } from './data';
import { EXAMPLES, EXAMPLE_META } from './example';
import {
  AuditCard,
  BillCard,
  ChecksCard,
  DecisionCard,
  Glance,
  InvoiceImage,
  InvoicePicker,
  LedgerCard,
  PayCard,
} from './panels';
import {
  SESSION_PATTERN,
  billRecord,
  handlePayment,
  memoryStore,
  newBillId,
  newIdempotencyKey,
  newSessionId,
  readLedger,
  saveBill,
} from './payments';
import {
  DECISION_LABEL,
  applyEvent,
  emptyRun,
  matchVendor,
  money,
  masked,
  runBill,
  shortDate,
} from './pipeline';
import styles from './Truss.module.css';

const API = '/api/demo/truss';
const PREVIEW_NOTE = 'Preview mode: live runs need the private link from my message.';
const NAV = [
  { href: '#read', label: 'Read' },
  { href: '#decide', label: 'Check + decide' },
  { href: '#pay', label: 'Pay once' },
  { href: '#audit', label: 'Audit' },
  { href: '#notes', label: 'Design' },
];

const FLOW = [
  { label: 'Read', what: 'Gemini reads the invoice image into a typed bill', cost: '1 call' },
  { label: 'Check', what: 'Vendor, PO, math, retainage, ledger, bank', cost: 'code, free' },
  { label: 'Decide', what: 'Jev: approve, hold or reject; rules set the floor', cost: '1 call' },
  { label: 'Note', what: 'DeepSeek writes the reviewer note', cost: '1 call' },
  { label: 'Pay', what: 'Idempotency key: a retry never charges twice', cost: 'free' },
];

const TIMEOUT_MS = 1500; // the browser gives up waiting
const SLOW_BANK_MS = 2500; // the simulated slow reply, after the charge is committed
const BACKOFF_MS = 700;

const recordedDay = new Date(`${EXAMPLE_META.recorded}T12:00:00Z`).toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});
const EXAMPLE_NOTE = `Example run: the vision model's JSON, the decision model's answer and the note were recorded from a live run on ${recordedDay} and replay faster here (times shown are the live ones). The checks, the rules floor and the payment endpoint run in your browser on the same code as the API.`;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const shortKey = key => (key ? `${key.slice(0, 13)}…` : '');
let auditIds = 0;
const audit = (actor, tone, text, at = Date.now(), ref) => ({
  id: `a${(auditIds += 1)}`,
  at,
  actor,
  tone,
  text,
  ref,
});

/** This tab's live session (namespaces its payments on the server). */
function liveSession() {
  try {
    let session = sessionStorage.getItem('trussSession');
    if (!session || !SESSION_PATTERN.test(session)) {
      session = newSessionId();
      sessionStorage.setItem('trussSession', session);
    }
    return session;
  } catch {
    return newSessionId();
  }
}

async function imageDataUrl(src) {
  const blob = await (await fetch(src)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not load the image.'));
    reader.readAsDataURL(blob);
  });
}

/** Scales an uploaded image to at most 1700 px on its long side, as JPEG (keeps requests small). */
async function readUpload(file) {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('Use a PNG, JPEG or WebP image.');
  if (file.size > 12_000_000) throw new Error('That image is over 12 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Could not open that image.'));
      element.src = url;
    });
    const scale = Math.min(1, 1700 / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.round(image.naturalWidth * scale);
    const height = Math.round(image.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    if (dataUrl.length > 2_600_000) throw new Error('That image is too detailed; try a smaller one.');
    return { dataUrl, width, height, name: file.name.slice(0, 40) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Streams NDJSON events from a demo route into onEvent. */
async function streamEvents(path, body, onEvent) {
  let buffer = '';
  let finished = false;
  const handle = line => {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    if (event.t === 'done' || event.t === 'error') finished = true;
    onEvent(event);
  };
  await streamFromApi(`${API}/${path}/`, body, chunk => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop();
    lines.forEach(handle);
  });
  handle(buffer);
  if (!finished) onEvent({ t: 'error', message: 'The run ended early. Nothing was paid; try again.' });
}

/** Reveals events at a pace a person can follow; checks run in microseconds. */
function createPlayer(apply, pace) {
  const queue = [];
  let cancelled = false;
  let draining = false;
  async function drain() {
    draining = true;
    while (queue.length && !cancelled) {
      const event = queue.shift();
      apply(event);
      const wait = pace(event);
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

const pacer = kind => event => {
  if (prefersReducedMotion()) return 0;
  if (event.t === 'check') return kind === 'example' ? 190 : 140;
  if (event.t === 'extract') return 420;
  if (event.t === 'decision') return 520;
  if (event.t === 'stage' && event.status === 'done') return 90;
  return 0;
};

async function* typeOut(text, wordMs) {
  for (const word of String(text).split(/(?<=\s)/)) {
    if (wordMs) await sleep(wordMs);
    yield word;
  }
}

// --- audit entries from run events ---------------------------------------------------------------

function auditFor(event, run) {
  const kind = run.kind;
  switch (event.t) {
    case 'meta':
      return kind === 'live'
        ? [
            audit(
              'Server',
              'muted',
              `Run ${event.runId} started for image ${event.image?.sha}… (${Math.round((event.image?.bytes || 0) / 1024)} KB)`,
              event.at
            ),
          ]
        : [audit('Browser', 'muted', 'Example run started: recorded model outputs; checks and payments computed here', event.at)];
    case 'extract': {
      if (!event.bill) {
        return [audit('Gemini', 'bad', `Could not read the image into a bill (${event.errors.join('; ')})`, event.at)];
      }
      return [
        audit(
          'Gemini',
          'accent',
          `Read the image into a typed bill: ${event.bill.invoiceNumber}, ${event.fields} fields, ${
            event.valid ? 'schema valid' : `schema errors: ${event.errors.join('; ')}`
          } (${event.model}${event.ms ? `, ${formatMs(event.ms)}` : ''}${event.cached ? ', cached read' : ''})`,
          event.at
        ),
      ];
    }
    case 'stage':
      if (event.id === 'checks' && event.status === 'done') {
        const failed = run.checks.filter(check => check.pass !== true);
        return [
          audit(
            'Code',
            failed.length ? 'warn' : 'ok',
            `${run.checks.length} checks: ${run.checks.length - failed.length} passed${
              failed.length ? `; failed: ${failed.map(check => `${check.label} (${check.actual})`).join('; ')}` : ''
            }`,
            event.at
          ),
        ];
      }
      if (event.id === 'note' && event.status === 'done' && run.note) {
        return [audit('DeepSeek', 'muted', `Reviewer note written (${run.note.split(/\s+/).length} words)`, event.at)];
      }
      return [];
    case 'decision': {
      const jev = event.jev;
      const model = jev?.probabilities
        ? `Model: ${jev.choice} ${Math.round((jev.probabilities[jev.choice] || 0) * 100)}%`
        : 'Model: no answer';
      const floor = event.floor.reasons.length
        ? `rules floor: ${event.floor.choice} (${event.floor.reasons[0].text})`
        : 'rules floor: approve allowed';
      const tone = event.final === 'approve' ? 'ok' : event.final === 'hold' ? 'warn' : 'bad';
      return [
        audit(
          'Jev',
          tone,
          `${model}; ${floor}. Final: ${DECISION_LABEL[event.final].toLowerCase()}${
            event.by === 'rules' ? ' (the rules overruled the model)' : ''
          }`,
          event.at
        ),
      ];
    }
    case 'done':
      return [
        audit(
          kind === 'live' ? 'Server' : 'Browser',
          event.final === 'approve' ? 'ok' : 'muted',
          `Bill ${run.billId} saved as ${event.final}${
            event.final === 'approve' ? ': payable once' : ': the payment endpoint will refuse it'
          }`,
          event.at
        ),
      ];
    case 'error':
      return [audit(kind === 'live' ? 'Server' : 'Browser', 'bad', event.message, event.at)];
    default:
      return [];
  }
}

// --- the page --------------------------------------------------------------------------------------

const emptyPay = () => ({ key: null, phase: 'idle', attempts: [], paymentId: null, message: '' });

export default function TrussDemo() {
  const [hasKey, setHasKey] = useState(false);
  const [sampleId, setSampleId] = useState('northline');
  const [upload, setUpload] = useState(null);
  const [run, setRun] = useState(() => emptyRun('example'));
  const [pay, setPay] = useState(emptyPay);
  const [ledger, setLedger] = useState({ charges: [], requests: [] });
  const [auditItems, setAuditItems] = useState([]);
  const [notice, setNotice] = useState('');
  const runRef = useRef(run);
  const payRef = useRef(pay);
  const ledgerRef = useRef(ledger);
  const player = useRef(null);
  const preview = useRef({ store: memoryStore(), session: newSessionId() });
  const session = useRef(null);
  const autoPay = useRef(false);
  const timedOut = useRef(new Set()); // key:attempt the browser gave up on, for the request log

  const sample = sampleById(sampleId);
  const busy = run.status === 'running';
  const payBusy = ['sending', 'timedout', 'retrying'].includes(pay.phase);
  const bill = run.extraction?.bill;
  const vendor = useMemo(() => (bill ? matchVendor(bill) : null), [bill]);
  const payTo = vendor
    ? { name: vendor.name, bank: vendor.bank.name, account: masked(vendor.bank.account) }
    : null;

  // A server log line with a `ref` lands right after the browser line that sent that request
  const addAudit = items => {
    if (!items.length) return;
    setAuditItems(current => {
      const next = [...current];
      for (const item of items) {
        const index = item.ref ? next.map(entry => entry.ref).lastIndexOf(item.ref) : -1;
        if (index >= 0) next.splice(index + 1, 0, item);
        else next.push(item);
      }
      return next;
    });
  };
  const updatePay = patch =>
    setPay(current => {
      const next = { ...current, ...(typeof patch === 'function' ? patch(current) : patch) };
      payRef.current = next;
      return next;
    });
  const putLedger = next => {
    ledgerRef.current = next;
    setLedger(next);
  };

  function applyRunEvent(event) {
    const before = runRef.current;
    const next = applyEvent(before, event);
    runRef.current = next;
    setRun(next);
    addAudit(auditFor(event, event.t === 'stage' || event.t === 'done' ? next : before));
    if (event.t === 'decision' && event.final === 'approve') {
      updatePay({ ...emptyPay(), key: newIdempotencyKey() });
    }
  }

  function startRun(kind) {
    player.current?.cancel();
    const fresh = emptyRun(kind, { status: 'running' });
    runRef.current = fresh;
    setRun(fresh);
    updatePay(emptyPay());
    const nextPlayer = createPlayer(applyRunEvent, pacer(kind));
    player.current = nextPlayer;
    return nextPlayer;
  }

  // --- example replay: recorded model outputs, everything else computed here --------------------

  async function playExample(id, { thenPay = false } = {}) {
    const example = EXAMPLES[id];
    if (!example) return;
    setUpload(null);
    setSampleId(id);
    autoPay.current = thenPay;
    const { store, session: previewSession } = preview.current;
    const previewLedger = await readLedger(store, previewSession);
    putLedger(previewLedger);
    const runPlayer = startRun('example');
    const billId = newBillId();
    const runId = `example_${id}`;
    const fast = prefersReducedMotion();
    runPlayer.push({
      t: 'meta',
      at: Date.now(),
      runId,
      billId,
      models: { vision: example.extraction.model, llm: EXAMPLE_META.llm, decision: 'jev' },
    });
    let variant = 'clean';
    try {
      await runBill({
        charges: previewLedger.charges,
        emit: runPlayer.push,
        extract: async () => {
          if (!fast) await sleep(1800);
          return { ...example.extraction, cached: false };
        },
        decide: async state => {
          const duplicate = /FAILED/.test(state.checks['Not already paid'] || '');
          const ownPayment = previewLedger.charges.some(charge => charge.invoiceNumber === state.bill.invoice);
          variant = duplicate && ownPayment && example.decisions.paid ? 'paid' : 'clean';
          if (!fast) await sleep(300);
          return example.decisions[variant].decision;
        },
        writeNote: facts => {
          // the "paid" note names this session's payment (stored as placeholders in example.js)
          const own = previewLedger.charges.find(charge => charge.invoiceNumber === facts.invoice);
          const note = example.decisions[variant].note
            .replace('{paymentId}', own?.paymentId || 'the earlier payment')
            .replace('{paidOn}', own ? shortDate(own.paidOn) : 'an earlier date');
          return typeOut(note, fast ? 0 : 34);
        },
        beforeDone: async done => {
          if (done.bill) {
            await saveBill(
              store,
              previewSession,
              billRecord({ billId, runId, bill: done.bill, vendor: matchVendor(done.bill), final: done.final })
            );
          }
        },
      });
    } catch (error) {
      runPlayer.push({ t: 'error', message: error.message });
    }
  }

  // First load: the clean invoice plays, then the timeout-and-retry payment
  useEffect(() => {
    setHasKey(Boolean(getDemoKey()));
    session.current = liveSession();
    playExample('northline', { thenPay: true });
    return () => player.current?.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!autoPay.current || run.status !== 'done' || run.kind !== 'example') return undefined;
    autoPay.current = false;
    if (run.decision?.final !== 'approve') return undefined;
    const timer = setTimeout(() => payWithTimeout(), prefersReducedMotion() ? 0 : 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.status, run.kind]);

  // --- live run ---------------------------------------------------------------------------------------

  async function fetchLedger() {
    const demoKey = getDemoKey();
    const response = await fetch(`${API}/ledger/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(demoKey && { 'x-demo-key': demoKey }) },
      body: JSON.stringify({ session: session.current }),
    });
    if (!response.ok) throw new Error('ledger');
    return response.json();
  }

  async function runLive() {
    const runPlayer = startRun('live');
    try {
      const image = upload?.dataUrl || (await imageDataUrl(sample.image));
      try {
        putLedger(await fetchLedger());
      } catch {
        /* the run still works; the ledger refreshes after a payment */
      }
      await streamEvents(
        'process',
        { session: session.current, image, sampleId: upload ? null : sampleId },
        runPlayer.push
      );
    } catch (error) {
      runPlayer.push({ t: 'error', message: error.message });
    }
  }

  async function readAndCheck() {
    setNotice('');
    if (!hasKey) {
      if (upload) {
        setNotice(`${PREVIEW_NOTE} Pick a sample invoice to replay its recorded run.`);
        return;
      }
      setNotice(`${PREVIEW_NOTE} This replays the recorded run for this invoice.`);
      await playExample(sampleId);
      return;
    }
    await runLive();
  }

  function resetRun(kind) {
    player.current?.cancel();
    const fresh = emptyRun(kind);
    runRef.current = fresh;
    setRun(fresh);
    updatePay(emptyPay());
  }

  function pick(id) {
    if (busy || payBusy) return;
    setUpload(null);
    setSampleId(id);
    setNotice('');
    resetRun(hasKey ? 'live' : 'example');
  }

  async function onUpload(file) {
    setNotice('');
    try {
      const image = await readUpload(file);
      setUpload(image);
      resetRun('live');
    } catch (error) {
      setNotice(error.message);
    }
  }

  // --- payments ------------------------------------------------------------------------------------------

  /** One POST /pay. Resolves { status, data, replayed, ms } or { timedOut, ms }. */
  async function sendPay({ key, attempt, delayMs = 0, timeoutMs = 10000, label }) {
    const current = runRef.current;
    const started = Date.now();
    if (current.kind === 'example') {
      const { store, session: previewSession } = preview.current;
      const result = await handlePayment(store, {
        session: previewSession,
        billId: current.billId,
        idempotencyKey: key,
        attempt,
        label,
      });
      const data = { ...result.body, ledger: await readLedger(store, previewSession) };
      await sleep(prefersReducedMotion() ? 0 : Math.min(delayMs || 140, timeoutMs));
      if (delayMs > timeoutMs) return { timedOut: true, ms: Date.now() - started };
      return { status: result.status, data, replayed: Boolean(result.replayed), ms: Date.now() - started };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const demoKey = getDemoKey();
      const response = await fetch(`${API}/pay/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': key,
          ...(demoKey && { 'x-demo-key': demoKey }),
        },
        body: JSON.stringify({
          session: session.current,
          billId: current.billId,
          idempotencyKey: key,
          attempt,
          label,
          delayMs,
        }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      return {
        status: response.status,
        data,
        replayed: response.headers.get('Idempotent-Replayed') === 'true',
        ms: Date.now() - started,
      };
    } catch (error) {
      if (error.name === 'AbortError') return { timedOut: true, ms: Date.now() - started };
      return { status: 0, data: { message: 'Network error' }, ms: Date.now() - started };
    } finally {
      clearTimeout(timer);
    }
  }

  /** Records a reply: the attempt row, the ledger and the server's own log lines in the audit trail. */
  function takeReply(n, reply) {
    const { status, data, replayed, ms } = reply;
    const paymentId = data.payment?.paymentId || data.paymentId || null;
    updatePay(current => ({
      attempts: current.attempts.map(item =>
        item.n === n
          ? { ...item, pending: false, status, replayed, ms, paymentId, error: data.message || data.error }
          : item
      ),
      paymentId: current.paymentId || (status === 201 ? data.payment?.paymentId : null),
    }));
    if (data.ledger) {
      const seen = new Set(ledgerRef.current.requests.map(request => request.id));
      const fresh = data.ledger.requests.filter(request => !seen.has(request.id));
      addAudit(
        fresh.map(request =>
          audit(
            'Payments API',
            request.outcome === 'charged' ? 'ok' : request.outcome === 'replayed' ? 'accent' : 'warn',
            `${request.status} ${request.outcome}: ${request.note}${request.paymentId ? ` (${request.paymentId})` : ''} · key ${shortKey(request.key)}, attempt ${request.attempt}`,
            request.at,
            `${request.key}:${request.attempt}`
          )
        )
      );
      putLedger(data.ledger);
    }
  }

  async function attempt(n, key, options) {
    updatePay(current => ({ attempts: [...current.attempts, { n, key, pending: true }] }));
    addAudit([
      audit(
        'Browser',
        'muted',
        `POST /pay · key ${shortKey(key)} · attempt ${n}${options.label ? ` (${options.label})` : ''}`,
        Date.now(),
        `${key}:${n}`
      ),
    ]);
    const reply = await sendPay({ key, attempt: n, ...options });
    if (reply.timedOut) {
      timedOut.current.add(`${key}:${n}`);
      updatePay(current => ({
        attempts: current.attempts.map(item =>
          item.n === n ? { ...item, pending: false, timedOut: true, ms: reply.ms } : item
        ),
      }));
      addAudit([
        audit('Browser', 'bad', `No reply after ${formatMs(reply.ms)}: timed out. The browser cannot tell whether the charge went through.`),
      ]);
      return reply;
    }
    takeReply(n, reply);
    return reply;
  }

  function finishPay(message = '') {
    const current = ledgerRef.current;
    const deduped = current.requests.filter(request => request.outcome === 'replayed').length;
    const charges = current.charges.length;
    addAudit([
      audit(
        'Ledger',
        charges ? 'ok' : 'muted',
        `${charges} ${charges === 1 ? 'charge' : 'charges'}, ${deduped} ${deduped === 1 ? 'retry' : 'retries'} deduplicated`
      ),
    ]);
    updatePay({ phase: 'done', message });
  }

  async function payWithTimeout() {
    const key = payRef.current.key;
    if (!key) return;
    updatePay({ phase: 'sending', message: '' });
    const first = await attempt(payRef.current.attempts.length + 1, key, {
      delayMs: SLOW_BANK_MS,
      timeoutMs: TIMEOUT_MS,
      label: 'slow bank reply',
    });
    if (first.timedOut) {
      updatePay({ phase: 'timedout' });
      await sleep(prefersReducedMotion() ? 0 : BACKOFF_MS);
      updatePay({ phase: 'retrying' });
      await attempt(payRef.current.attempts.length + 1, key, { label: 'retry, same key' });
    }
    finishPay();
  }

  async function payOnce() {
    const key = payRef.current.key;
    if (!key) return;
    updatePay({ phase: 'sending', message: '' });
    await attempt(payRef.current.attempts.length + 1, key, {});
    finishPay();
  }

  async function retrySame() {
    const key = payRef.current.key;
    updatePay({ phase: 'retrying', message: '' });
    await attempt(payRef.current.attempts.length + 1, key, { label: 'same key again' });
    finishPay();
  }

  async function payNewKey() {
    const key = newIdempotencyKey();
    updatePay({ phase: 'sending', message: '', key });
    const reply = await attempt(payRef.current.attempts.length + 1, key, { label: 'new key' });
    finishPay(reply.status === 409 ? 'Refused with 409: this invoice is already paid, whatever the key.' : '');
  }

  async function forcePay() {
    const key = newIdempotencyKey();
    updatePay({ ...emptyPay(), key, phase: 'sending' });
    const reply = await attempt(1, key, { label: 'not approved' });
    updatePay({
      phase: 'refused',
      message:
        reply.status === 403
          ? `Refused with 403: ${reply.data.message}`
          : reply.status === 401
          ? 'The payment endpoint needs the private link.'
          : `Status ${reply.status}`,
    });
  }

  // --- trace -----------------------------------------------------------------------------------------------

  const trace = useMemo(() => {
    if (!run.extraction && !run.decision) return null;
    const meta = run.events.find(event => event.t === 'meta');
    return {
      runId: run.runId,
      billId: run.billId,
      kind: run.kind,
      image: meta?.image || { sample: sampleId },
      models: run.models,
      extraction: run.extraction && {
        invoice: run.extraction.bill?.invoiceNumber,
        fields: run.extraction.fields,
        valid: run.extraction.valid,
        errors: run.extraction.errors,
        ms: run.extraction.ms,
        cached: run.extraction.cached,
      },
      checks: run.checks.map(check => ({ id: check.id, pass: check.pass, found: check.actual })),
      decision: run.decision && {
        model: run.decision.jev?.choice || null,
        probabilities: run.decision.jev?.probabilities || null,
        floor: run.decision.floor.choice,
        floorReasons: run.decision.floor.reasons.map(reason => reason.text),
        final: run.decision.final,
        by: run.decision.by,
      },
      payment: pay.key && {
        idempotencyKey: pay.key,
        attempts: pay.attempts.map(item => ({
          attempt: item.n,
          status: item.timedOut ? 'timeout' : item.status ?? 'pending',
          replayed: Boolean(item.replayed),
          paymentId: item.paymentId || null,
          ms: item.ms ?? null,
        })),
      },
      ledger: {
        charges: ledger.charges.map(charge => `${charge.paymentId} ${money(charge.amount)} ${charge.invoiceNumber}`),
        requests: ledger.requests.map(request => `${request.status} ${request.outcome} attempt ${request.attempt}`),
      },
    };
  }, [run, pay, ledger, sampleId]);

  const runLabel = hasKey ? 'Read and check' : 'Read and check (example)';
  const totalMs =
    run.status === 'done' && run.kind === 'live' && run.started && run.finished
      ? run.finished - run.started
      : null;

  return (
    <DemoLayout
      company="Truss"
      title="Bill to payment: an invoice image in, one checked payment out"
      tagline="A subcontractor invoice arrives as an image. Gemini reads it into a typed bill, code checks it against the PO, the vendor file and every payment already made, a decision model approves, holds or rejects under a rules floor, and the payment goes out with an idempotency key, so a retried request never charges twice."
      accent="cobalt"
      nav={NAV}
      wide
      hero={<Glance run={run} pay={pay} ledger={ledger} sample={sample} upload={upload} />}
    >
      <div className={styles.page}>
        <PipelineStrip steps={FLOW} />

        <section id="read" className={styles.section} aria-labelledby="read-heading">
          <SectionHead
            variant="numbered"
            index={1}
            kicker="Step 1 · Read"
            titleId="read-heading"
            title="An invoice image in, a typed bill out"
            lede="Three sample bills from subcontractors on one project: a clean progress bill, a resent invoice that was already paid, and one asking to be paid to a new bank account."
          />
          <InvoicePicker
            samples={SAMPLES}
            value={sampleId}
            onPick={pick}
            upload={upload}
            onUpload={onUpload}
            hasKey={hasKey}
            disabled={busy || payBusy}
          />
          <div className={styles.gridRead}>
            <div className={styles.docCol}>
              <div className={styles.runBox}>
                <Button onClick={readAndCheck} disabled={busy || payBusy}>
                  {busy ? <Spinner /> : <FiPlay aria-hidden />} {busy ? 'Running' : runLabel}
                </Button>
                <span className={styles.muted}>
                  {busy
                    ? run.kind === 'live'
                      ? 'Live run'
                      : 'Replaying the example'
                    : totalMs
                    ? `Live run: ${formatMs(totalMs)}`
                    : hasKey
                    ? 'Live: about 3 cents a run'
                    : 'Preview: recorded example'}
                </span>
              </div>
              {notice && (
                <Notice size="s" className={styles.notice} role="status">
                  {notice}
                </Notice>
              )}
              {run.status === 'error' && (
                <Notice kind="error" size="s" className={styles.notice} role="alert">
                  {run.error}
                </Notice>
              )}
              <InvoiceImage sample={sample} upload={upload} run={run} />
            </div>
            <BillCard run={run} exampleNote={EXAMPLE_NOTE} />
          </div>
        </section>

        <section id="decide" className={styles.section} aria-labelledby="decide-heading">
          <SectionHead
            variant="numbered"
            index={2}
            kicker="Step 2 · Check + decide"
            titleId="decide-heading"
            title="Code checks it. A model calls it. The stricter call wins."
            lede="Eight checks run in code. A decision model then picks approve, hold or reject with its probabilities shown; a failed check or a bank change can never be auto-approved."
          />
          <div className={styles.gridDecide}>
            <ChecksCard run={run} />
            <DecisionCard run={run} />
          </div>
        </section>

        <section id="pay" className={styles.section} aria-labelledby="pay-heading">
          <SectionHead
            variant="numbered"
            index={3}
            kicker="Step 3 · Pay once"
            titleId="pay-heading"
            title="Pay once, even when the request retries"
            lede="The browser makes one idempotency key per payment and reuses it on every retry. Simulate a slow bank: the browser gives up after 1.5 s and retries, and the ledger still shows one charge."
          />
          <div className={styles.gridPay}>
            <PayCard
              run={run}
              payTo={payTo}
              pay={pay}
              onPay={payOnce}
              onTimeoutRetry={payWithTimeout}
              onRetrySame={retrySame}
              onNewKey={payNewKey}
              onForce={forcePay}
              hasKey={hasKey}
              kind={run.kind}
            />
            <LedgerCard ledger={ledger} timedOut={timedOut.current} kind={run.kind} />
          </div>
        </section>

        <section id="audit" className={styles.section} aria-labelledby="audit-heading">
          <SectionHead
            variant="numbered"
            index={4}
            kicker="Step 4 · Audit"
            titleId="audit-heading"
            title="Tell what happened in production"
            lede="Every step lands in one trail: what read the bill, what each check found, who decided and why, and every payment request with its key and outcome. The server logs the same as one JSON line per step, keyed by run id."
          />
          <AuditCard items={auditItems} trace={trace} />
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
    title: 'Models read and judge; code decides what is true',
    text: 'The vision model only turns pixels into a typed bill, validated against a schema. Whether the math adds up, the PO has room or the invoice was paid is computed, never asked.',
  },
  {
    title: 'The rules set a floor the model cannot go under',
    text: 'The decision model sees every check and gives its probabilities, but a failed check or a changed bank account can never end in "approve": the final call is the stricter of the two.',
  },
  {
    title: 'Two locks on every payment',
    text: 'An idempotency key, claimed atomically before money moves, makes retries safe. A second claim on vendor + invoice number blocks a new key for a bill already paid. The endpoint also re-checks that the bill was approved.',
  },
  {
    title: 'Cheap, cached and traceable',
    text: 'About 3 cents a run: one vision call, one decision call, one short note. The same image is read once. Every run and payment request logs one JSON line with its run id, key and outcome.',
  },
];

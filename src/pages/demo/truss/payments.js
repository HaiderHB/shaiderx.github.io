// The payment endpoint's logic, shared by POST /api/demo/truss/pay/ (Redis store) and the page's
// preview mode (an in-memory store in the browser). Two layers keep a bill from being paid twice:
//   1. Idempotency key: the client makes one key per payment and reuses it on every retry. The
//      first request claims the key atomically (SET NX) before any money moves; a retry with the
//      same key gets the stored response back and creates nothing. Same key, different request: 422.
//      Same key while the first is still running: 409, retry later.
//   2. One payment per invoice: a second claim (SET NX on vendor + invoice number) blocks a new
//      key for a bill that is already paid (a double-click, two tabs, a resubmitted form).
// Every request, including the deduplicated ones, is appended to the session's request log.
// Pure JS: the store is injected ({ get, set, setIfAbsent, push, list }).
import { digits, masked } from './pipeline';

export const PAY_TTL = 6 * 3600;
export const KEY_PATTERN = /^idem_[A-Za-z0-9_-]{8,48}$/;
export const SESSION_PATTERN = /^ses_[A-Za-z0-9_-]{8,40}$/;
export const BILL_PATTERN = /^bill_[A-Za-z0-9_-]{6,40}$/;

const keys = {
  bill: (session, billId) => `truss:bill:${session}:${billId}`,
  idem: (session, key) => `truss:idem:${session}:${key}`,
  paid: (session, bill) => `truss:paid:${session}:${bill.vendorId}:${bill.invoiceNumber}`,
  charges: session => `truss:charges:${session}`,
  requests: session => `truss:requests:${session}`,
};

const randomId = (prefix, length = 10) => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let id = '';
  for (let i = 0; i < length; i += 1) id += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `${prefix}_${id}`;
};

export const newSessionId = () => randomId('ses', 16);
export const newIdempotencyKey = () => randomId('idem', 20);
export const newBillId = () => randomId('bill', 12);
const newPaymentId = () => randomId('pmt', 10);

/** The approved bill the payment endpoint will pay: written by the run, read by /pay. */
export function billRecord({ billId, bill, vendor, final, runId }) {
  return {
    billId,
    runId,
    final,
    vendorId: vendor?.id || null,
    vendorName: vendor?.name || bill.vendorName,
    invoiceNumber: bill.invoiceNumber,
    invoiceDate: bill.invoiceDate,
    poNumber: bill.poNumber,
    subtotal: bill.subtotal,
    dueDate: bill.dueDate,
    amount: bill.amountDue,
    currency: bill.currency,
    // money goes to the account on the vendor file, never to whatever the invoice prints
    payTo: vendor ? { bank: vendor.bank.name, account: masked(vendor.bank.account) } : null,
  };
}

export async function saveBill(store, session, record) {
  await store.set(keys.bill(session, record.billId), record, PAY_TTL);
}

export async function readLedger(store, session) {
  const [charges, requests] = await Promise.all([
    store.list(keys.charges(session)),
    store.list(keys.requests(session)),
  ]);
  return { charges, requests };
}

const fingerprint = (record, amount) =>
  [record.billId, record.vendorId, record.invoiceNumber, amount, digits(record.payTo?.account)].join('|');

/**
 * Handles one POST /payments. Returns { status, body, replayed }.
 * request: { session, billId, idempotencyKey, amount, attempt, label }
 */
export async function handlePayment(store, request, { now = () => Date.now() } = {}) {
  const { session, billId, idempotencyKey } = request;
  const started = now();
  const log = async entry => {
    const item = {
      id: randomId('req', 8),
      at: started,
      key: idempotencyKey,
      attempt: request.attempt || 1,
      label: request.label || null,
      ms: Math.max(1, now() - started),
      ...entry,
    };
    await store.push(keys.requests(session), item, PAY_TTL);
    return item;
  };

  const record = await store.get(keys.bill(session, billId));
  if (!record) {
    const body = { error: 'not_found', message: 'No bill with that id in this session.' };
    await log({ status: 404, outcome: 'refused', note: 'Unknown bill' });
    return { status: 404, body };
  }
  if (record.final !== 'approve') {
    const body = {
      error: 'not_approved',
      message: `This bill is ${record.final === 'reject' ? 'rejected' : 'on hold'}. Only approved bills can be paid.`,
    };
    await log({ status: 403, outcome: 'refused', note: `Bill is ${record.final === 'reject' ? 'rejected' : 'on hold'}` });
    return { status: 403, body };
  }

  // The amount comes from the approved bill; a different amount is a different request
  const amount = Number.isFinite(request.amount) ? request.amount : record.amount;
  const fp = fingerprint(record, amount);
  const idemKey = keys.idem(session, idempotencyKey);

  // 1. Claim the idempotency key before anything else happens
  const claimed = await store.setIfAbsent(idemKey, { state: 'in_progress', fp, at: started }, PAY_TTL);
  if (!claimed) {
    const existing = await store.get(idemKey);
    if (!existing || existing.fp !== fp) {
      const body = { error: 'key_reused', message: 'This idempotency key was used for a different request.' };
      await log({ status: 422, outcome: 'refused', note: 'Key reused with a different body' });
      return { status: 422, body };
    }
    if (existing.state === 'in_progress') {
      const body = { error: 'in_progress', message: 'The first request with this key is still running. Retry shortly.' };
      await log({ status: 409, outcome: 'in_progress', note: 'Original still in flight' });
      return { status: 409, body };
    }
    const { status, body } = existing.response;
    await log({
      status,
      outcome: 'replayed',
      paymentId: body.payment?.paymentId || null,
      note: 'Same key: stored response returned, no new charge',
    });
    return { status, body: { ...body, replayed: true }, replayed: true };
  }

  // 2. One payment per invoice, whatever the key
  const paymentId = newPaymentId();
  const first = await store.setIfAbsent(
    keys.paid(session, record),
    { paymentId, key: idempotencyKey },
    PAY_TTL
  );
  if (!first) {
    const earlier = await store.get(keys.paid(session, record));
    const response = {
      status: 409,
      body: {
        error: 'already_paid',
        message: `${record.invoiceNumber} is already paid (${earlier?.paymentId}).`,
        paymentId: earlier?.paymentId || null,
      },
    };
    await store.set(idemKey, { state: 'done', fp, response }, PAY_TTL);
    await log({ status: 409, outcome: 'blocked', paymentId: earlier?.paymentId || null, note: 'Invoice already paid under another key' });
    return response;
  }

  // 3. Move the money (simulated rail: one ledger entry), then store the response under the key
  const charge = {
    paymentId,
    vendorId: record.vendorId,
    vendorName: record.vendorName,
    invoiceNumber: record.invoiceNumber,
    invoiceDate: record.invoiceDate,
    poNumber: record.poNumber,
    subtotal: record.subtotal,
    amount,
    currency: record.currency,
    to: record.payTo?.account || '?',
    bank: record.payTo?.bank || '?',
    paidOn: new Date(started).toISOString().slice(0, 10),
    createdAt: started,
    idempotencyKey,
  };
  await store.push(keys.charges(session), charge, PAY_TTL);
  const response = { status: 201, body: { payment: charge } };
  await store.set(idemKey, { state: 'done', fp, response }, PAY_TTL);
  await log({ status: 201, outcome: 'charged', paymentId, note: 'Charge created' });
  return response;
}

/** In-memory store with the same interface (preview mode, tests). */
export function memoryStore() {
  const data = new Map();
  const clone = value => (value == null ? value : JSON.parse(JSON.stringify(value)));
  return {
    async get(key) {
      return clone(data.get(key) ?? null);
    },
    async set(key, value) {
      data.set(key, clone(value));
    },
    async setIfAbsent(key, value) {
      if (data.has(key)) return false;
      data.set(key, clone(value));
      return true;
    },
    async push(key, value) {
      const list = data.get(key) || [];
      list.push(clone(value));
      data.set(key, list);
    },
    async list(key) {
      return clone(data.get(key) || []);
    },
  };
}

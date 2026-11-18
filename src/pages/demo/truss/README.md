# Truss demo: bill to payment

Unlisted prototype at `/demo/truss/?k=<key>`, an unofficial prototype by Haider (no Truss logo,
not presented as their product). A general contractor's accounts-payable inbox gets subcontractor
invoices as images. The agent reads each one into a typed bill, checks it in code against the
vendor file, the purchase order and every payment already made, decides approve / hold / reject
with visible probabilities under a rules floor, and pays approved bills with an idempotency key, so
a retried request never charges twice. Everything that happened is in one audit trail.

The wow in the first ten seconds: on load, the clean invoice image is read into a checked bill, the
payment is sent while the "bank" replies too slowly, the browser times out and retries with the
same key, and the hero card lands on **Paid once · 1 charge · 1 retry deduplicated**.

Built for the Senior Full Stack Engineer (AI-native) role, whose post asks for exactly this kind of
care on money-moving paths: what happens when a request is retried, whether a customer could be
charged twice, and whether you can tell what happened in production.

## What is on the page

1. **Read.** Three sample invoices (PNG, US Letter at 150 dpi) from fictional subcontractors on one
   fictional project, plus "your own invoice" with a live link:
   - **Northline Electric** INV-NE-1187: a clean progress bill (PO-2291, retainage 10%).
   - **Keystone Drywall** INV-KD-0412: a "reminder" copy of an invoice already paid on Oct 30
     (PMT-88213 in the sample ledger).
   - **Crestline Mechanical** INV-CM-2290: asks to be paid to a new bank account ("our banking
     details have changed"), with a different phone number than the vendor file.
   Gemini (`gemini-3.5-flash-lite`, structured output) reads the image into a typed bill; the JSON is
   validated against the same schema in code (types, dates, line items) and money becomes cents.
2. **Check + decide.** Eight checks in code (`runChecks`): vendor on file (tax number or name), PO
   issued to this vendor, within the PO balance (including anything this session already paid),
   line math (qty x rate, lines = subtotal, HST 13%), retainage 10% and amount due, not already paid
   (vendor + invoice number, or vendor + amount + date, against the paid ledger plus this session's
   payments), bank details against the vendor file (and any "details changed" notice), lien waiver.
   Then Jev answers one `choice` question (approve / hold / reject) about the bill and the check
   results, with probabilities shown. The **rules floor** in code: any failed or unrunnable check is
   at least "hold"; an exact duplicate is "reject". The final call is the **stricter** of the two, and
   no answer from the model counts as "hold". DeepSeek (via fal) writes a two-sentence reviewer note
   from the facts (for a bank change: call the number on the vendor file, not the one on the invoice).
3. **Pay once.** Approved bills get an idempotency key (made in the browser, one per payment).
   *Simulate a timeout and retry* sends the payment while the server holds its reply for 2.5 s after
   committing the charge; the browser gives up at 1.5 s, waits 0.7 s and retries with the same key.
   The ledger shows one charge, two requests and one deduplicated retry. After paying: *Send the same
   request again* (replayed), *Pay again with a new key* (409, already paid). On a held or rejected bill,
   *Try to pay it anyway* gets a 403 from the endpoint: it pays only bills the run approved.
4. **Audit.** One trail of every step (who read the bill, each check, the model's call and the floor,
   the note, every payment request with its key, attempt and outcome, the browser's timeout), and the
   same as a JSON trace. The server logs one JSON line per run and per payment request
   (`evt: truss.run`, `truss.pay`) with the run id, bill id, key and outcome.

## How a run works

| Step | What | Model | Cost |
| --- | --- | --- | --- |
| Read | Invoice image → typed bill, schema-validated | Gemini `gemini-3.5-flash-lite` (native `generateContent`, `responseJsonSchema`) | 1 call, ~1.5k image tokens |
| Check | 8 checks against `data.js` and the session ledger | code | free |
| Decide | approve / hold / reject + rules floor | Jev `choice` | 1 call |
| Note | Two-sentence reviewer note, streamed | DeepSeek V3.2 via fal (`DEMO_LLM`), 300 max tokens | 1 call |
| Pay | Idempotent payment on a simulated rail | code + Redis (`SET NX`) | free |

## Routes

All `POST`, wrapped in `demoApi()` (key, rate limit, daily budgets):

| Route | Body | Cost units |
| --- | --- | --- |
| `/api/demo/truss/process/` | `{ session, image (data URL ≤ 2 MB), sampleId? }` → NDJSON events | 3 (`COST.llm` vision + `COST.decision` + `COST.llm` note); 1 when the same image was already read |
| `/api/demo/truss/pay/` | `{ session, billId, idempotencyKey, attempt?, label?, delayMs? }` (or an `Idempotency-Key` header) | free (no model) |
| `/api/demo/truss/ledger/` | `{ session }` | free |

Caching: the extraction is cached by image hash for 24 h (`cached`-style, in the demo store), Jev by
its exact state and the note by its exact facts, so repeating a sample costs one unit and replays in
about a second. The checks and the decision floor always re-run, because the session's payments change
the answer (pay Northline, run it again: it is now a duplicate and is rejected).

Inputs are clamped: the image must be a PNG, JPEG or WebP data URL between 2 KB and 2 MB (body limit
3 MB); ids and keys match fixed patterns; `delayMs` is capped at 3 s. Uploads are scaled to 1700 px in
the browser first.

## Payments: how "never twice" works (`payments.js`)

1. **Approved bills only.** The process route saves the bill (`billRecord`) with its final decision
   *before* it sends the last event. `/pay` loads it by id; anything not approved is refused (403).
   Money goes to the account on the vendor file, never to whatever the invoice prints.
2. **Idempotency key, claimed first.** `SET truss:idem:<session>:<key> NX` before anything else. The
   winner charges; the stored response is written under the key. A retry with the same key gets that
   response back (`Idempotent-Replayed: true`, same status, same payment id) and creates nothing. The
   same key with a different request is refused (422); the same key while the first is still running
   gets 409 (retry later).
3. **One payment per invoice.** A second `SET NX` on vendor + invoice number blocks a *new* key for a
   bill already paid (double clicks, two tabs, a resubmitted form): 409 `already_paid`.
4. **Every request is logged** (`RPUSH`), including the deduplicated and refused ones, so the ledger
   can say "2 requests, 1 charge, 1 deduplicated".

The same module runs in the browser in preview mode on an in-memory store with the same interface.

## Modes

- **Preview (no key):** on load the Northline example plays, then the timeout-and-retry payment.
  *Read and check (example)* replays the recorded run for whichever sample is picked. Only model
  outputs are stored in `example.js` (Gemini's JSON per invoice, Jev's answer per check state, the
  note); the schema validation, the checks, the rules floor and the payment endpoint run in the
  browser on the same code as the API. Labelled "Example run" on the page and in the hero.
- **Live (`?k=` key):** *Read and check* posts the invoice image to `/process/`; payments go to
  `/pay/` with a real `AbortController` timeout and a real retry. The pills say "cached read" when
  the image was read before. Uploading your own invoice works here (an unknown vendor is held).

`example.js` was recorded on Nov 17 from live runs on the deployed preview with the demo key: Northline
(and its payment: a 1.5 s client timeout against a 2.5 s server hold, then a retry with the same key:
201 charged, 201 replayed, one charge), Keystone, Crestline, then Northline again after paying it (the
duplicate state). The recorder posted to `/process/` and `/pay/` with curl and kept only the model
outputs and timings. One substitution: the "paid" note named the recording session's payment id and
date, so they are stored as `{paymentId}` / `{paidOn}` and filled from your session's payment on replay.
Never edit the outputs by hand.

## Env vars

- `GOOGLE_API_KEY` (Gemini vision), `JEV_API_KEY`, `FAL_API_KEY` (DeepSeek via fal), and the Upstash
  Redis vars `KV_REST_API_URL` / `KV_REST_API_TOKEN` (idempotency keys, ledger, caches; without them
  the store is per serverless instance).
- Optional: `DEMO_VISION_MODEL` (default `gemini-3.5-flash-lite`), `DEMO_LLM_MODEL`, `JEV_MODEL`.

## What I assumed

- One general contractor's AP in Ontario: CAD, HST 13% on the subtotal, a 10% holdback (retainage)
  withheld from the subtotal on every progress bill, amount due = subtotal + HST − holdback. Real
  holdback rules vary by province and contract (and release on a schedule); this demo checks the
  arithmetic, not the law.
- Vendors are matched by tax number first, then by name; POs carry a value, billed-to-date and the
  retainage percent. Canadian EFT details (institution, transit, account) identify the account.
- "Duplicate" means the same vendor and invoice number (reject), or the same vendor, amount and
  invoice date under another number (hold).
- A bank-detail change is the classic payment-fraud pattern (vendor email compromise), so it always
  holds for a call-back to the phone number on file.
- Payments go out on a simulated rail; "charge" means a ledger entry.

## What I cut

- No real money movement, bank file (EFT/ACH) or payment status webhooks; no scheduling to the due
  date (the button pays now).
- No approval chains, roles or a review queue: "hold" is a state, not a workflow.
- No lien-waiver document parsing (the invoice's statement is trusted), no holdback release, no
  partial payments or credit memos, no multi-page PDFs.
- Idempotency keys expire after 6 h and an "in progress" key never recovers on its own (a real system
  needs a lock timeout plus a check with the rail before retrying).
- Sessions are per browser tab, not per user; no auth beyond the demo key.

## With real data

- Swap `data.js` for the GC's vendor master, open POs (with change orders and billed-to-date from the
  ERP) and paid history; keep the `runChecks` shape and add checks that need history: price drift per
  line vs. the PO's schedule of values, invoices out of sequence, vendor insurance/WSIB expiry.
- Postgres instead of Redis: a `payment_requests` table with a unique index on `(org, idempotency_key)`
  and a unique partial index on `(vendor_id, invoice_number) where status <> 'void'`; claim, charge and
  record in one transaction, and store the response for replays. Same rules, enforced by the database.
- Evals: a labelled set of real invoice images (scans, photos, multi-page PDFs, handwritten totals)
  graded field by field against the extraction, plus a set of bills with known outcomes for the
  decision; gate model, prompt and threshold changes on both. Log Jev's probabilities against what
  reviewers did to calibrate when "approve" can skip a person.
- Production trace: ship the `truss.run` / `truss.pay` JSON lines to the log pipeline, alert on 409/422
  spikes and on any second charge per invoice (which should be impossible).

## Testing

- `npm run build` passes. The pipeline and the payment logic were exercised in Node: all three samples, pay +
  replay + a new key blocked (409), a forced payment on held and rejected bills (403), the duplicate after paying.
- On the Vercel preview with the demo key (Playwright at 1360 px and 390 px, no horizontal scroll, no page
  errors): live runs for Northline (approve 97%), Crestline (hold 100%) and Northline again after paying it
  (reject 100%, "within PO balance" counts the session's payment); the live timeout and retry (attempt 1 aborted
  by the browser at 1.5 s, attempt 2 `201 replayed`, one charge); "Pay again with a new key" refused with 409;
  "Try to pay it anyway" refused with 403. With curl: the same timeout and retry, and a call without a key (401).
- Preview mode (no key) at 1360 px and 390 px: the on-load example, all three samples, the payment paths.

## Launch film

`video/films/truss` (kit 2.1, launch format, 68.7 s): SPEC.md (beat table), REVIEW.md (QA and honesty notes).
Web encode at `public/demo-videos/truss.mp4`.

## Take-down

Delete `src/pages/demo/truss/`, `src/pages/api/demo/truss/`, `public/demo-assets/truss/`,
`scripts/demo-assets/truss-invoices.cjs`, the `truss` entries in `src/demos/keys.json` and
`public/demo-videos/truss.mp4` about 30 days after sending.

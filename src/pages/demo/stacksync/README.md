# Stacksync demo: a guardrailed CRM-to-ERP sync agent

Unlisted prototype at `/demo/stacksync/?k=<key>`. A closed-won CRM deal (HubSpot-shaped JSON)
becomes a typed ERP sales-order write plan (NetSuite-shaped). The LLM drafts the plan; code
validates it against a strict schema and the ERP's own tables; a fast decision model gives the
route with probabilities (auto-apply / approval queue / block); code has the final say; and the
write happens exactly once under an idempotency key, however often the sync retries.

Wow in the first ten seconds: the page opens on the clean deal already turning into a checked
write: a green "Safe to apply", 97% auto-apply, 11 of 11 checks passing.

Built on `src/demos/ui` (catalog in `src/demos/ui/README.md`). Added to the kit for this demo:
`FieldMap` (new) and a `warn` status on `CheckList`.

## What is on the page

1. **Route** (`#route`): three sample deals plus an editable JSON box, and the verdict card:
   the route badge, the decision model's probability bars, the check summary and why code chose
   the final route. Blocked deals list their reasons here.
2. **Plan + checks** (`#plan`): the CRM → ERP field map (each mapping pass / review / fail),
   the write plan as JSON, and 11 checks in code. "Simulate a model slip" adds a field the ERP
   does not have and rounds a rate, to show code blocking a plan the model had scored 97%
   auto-apply.
3. **Write once** (`#apply`): the idempotency key (deal id + plan hash), Apply, "Replay the
   retry", the request log (201 created, then 200 replayed: no duplicate) and the ERP's sales
   orders (2 requests → 1 order).
4. **Approvals** (`#queue`): the risky deal lands as an approve / reject card with its reasons;
   Approve writes once under the same key.
5. **Audit** (`#audit`): every step, its actor and what it decided.

## How a run works

| Step | What | Cost |
| --- | --- | --- |
| Read | `readDeal()` parses the deal (max 12 lines, 6,000 chars) | free |
| Plan | The LLM (JSON mode, temperature 0, 900 max tokens) drafts the sales order from the deal plus the ERP reference tables (`PLAN_SYSTEM` in `sync.js`) | `COST.llm` |
| Check | `validatePlan()`: schema (required, types, formats), unknown fields rejected, customer and subsidiary mapped, every SKU mapped to an ERP item, line math, total = CRM amount, currency = the customer's ERP currency, external id + date tie back to the deal; policy: discounts ≤ 30%, new-customer first order ≤ $50k | free |
| Route | The decision model answers one typed choice (auto / approval / block) with probabilities from the deal facts and check results; `finalRoute()` applies the floor (hard fail → block, policy flag → approval; the model can be stricter, never looser) | `COST.decision` |
| Write | `applyOnce()`: key = `deal-<id>-<plan hash>`, claimed with `setJSONIfAbsent` (SET NX) before the order exists; a retry returns the stored order | free |

Routes: `POST /api/demo/stacksync/plan/` (live custom deals; 2 units, 1 when the deal is cached)
and `POST /api/demo/stacksync/apply/` (free, key required). `/apply` re-runs every check
server-side, recomputes the key from the deal and the plan (a mismatched key is refused), and only
writes a plan that a run cleared (a live `/plan` run stored under its hash, or a recorded sample).

## Modes

- **Preview (no key):** the three samples replay recorded model outputs (`example.js`, recorded
  live 2026-11-18). The checks, field map, final route and the write run in the browser on the
  same code as the API, against an in-tab store. Editing the JSON asks for the private link.
- **Live (`?k=` key):** the samples still replay (instant, free), but Apply / Approve go to the
  server store (durable with Redis, per tab session). An edited deal runs the whole pipeline live.

## Env vars

| Var | Needed for | Without it |
| --- | --- | --- |
| `FAL_API_KEY` | The live plan (LLM) | `/plan` errors; samples still work |
| `JEV_API_KEY` | The live route (decision model) | `/plan` errors; samples still work |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Durable idempotency keys and budgets | In-memory per serverless instance |
| `DEMO_LLM_MODEL` | Optional model override | The default demo LLM |

## What I assumed

- One seller ("Fieldline") with two subsidiaries (US, UK), three ERP customers and four ERP
  items. A SKU without an ERP item (a pre-order) and a deal in a currency the customer is not
  billed in are the two most common reasons a CRM → ERP order write fails, so the broken deal
  has both.
- The deal's `amount` is the source of truth the plan must match; editing a line without the
  amount is caught by the totals check (on purpose).
- Policy limits (30% discount, $50k new-customer first order) are made up and live in `data.js`.
- Customers are already synced (the customer map is a table); this demo covers the order write.

## What I cut

- Real CRM / ERP connections, webhooks and two-way sync (the ERP is a store).
- Currency conversion and creating missing ERP items: the agent blocks and sends it back instead.
- Partial writes, updates to an existing order (an amended deal gets a new plan hash, so a new
  key; a real system would update the order linked by `externalId`).
- Auth on the approval queue (anyone with the link approves as "you").

## With real data

- Read the reference tables (customers, items, subsidiaries, currencies) from the ERP through the
  sync's own cache, and the policy from a config the finance team owns.
- Calibrate the decision model's thresholds on historical orders (what finance approved or
  fixed), and log every route with its probabilities for evals.
- Key writes on `externalId` too, and reconcile: a nightly check that every closed-won deal has
  exactly one order.

## Testing

- Preview mode at 1360 px and 390 px, dark and light: all three samples, apply, replay, approve,
  block, model slip (Playwright screenshots).
- Live with the private key: an edited deal through `/plan` (LLM + decision model, about 8 s),
  then `/apply` 201 and the replay 200; an inconsistent edit correctly blocked by the totals check.

## Take-down

Delete `src/pages/demo/stacksync/`, `src/pages/api/demo/stacksync/` and the slug's entries in
`src/demos/keys.json`.

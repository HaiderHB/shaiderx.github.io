# CoinTracker demo: an agent whose work a household and its CPA can review

Unlisted prototype at `/demo/cointracker/?k=<key>`, built for the Product Engineer role on Nino. It answers
the posting's asks: turn an agent into a product people can understand, review and approve; handle
incomplete information, interruptions, retries and human handoffs; verify that a task really finished.

**Wow in the first seconds:** the agent's timeline runs, and four proposed actions land already sorted
into **auto-run**, **your approval** and **CPA review**, each with the decision model's probability bars.
On the two that move money, the auto-run option is struck through and locked: "Money moves, so it never
auto-runs. Code enforces this whatever the model says."

Scaffolded on 2026-11-19 with `node scripts/new-demo.js cointracker "CoinTracker"`; components come from
`src/demos/ui`.

## What is on the page

1. **Filing progress** (hero card): documents 5/7, actions approved n/4, CPA review n/1, and a status.
2. **The agent**: "Prepare my 2026 tax file" and a six-step timeline (find documents, read them into a
   typed record, check completeness, propose actions, route every action, build interest and dividends).
   Step 6 pauses on the missing 1099-INT.
3. **Proposed actions**, in three lanes by final route, with probability bars and the code guard line.
   "Test the guard" swaps in a simulated model answer (auto-run 88%) for the sell order; code still holds it.
4. **Review and approve**: a household queue and a CPA queue (switch). Each card shows what the agent saw,
   why, the numbers, the upside and tradeoff, what will happen, and the checks code ran. Approve, Edit
   (code recomputes every dependent number and the idempotency key) or Reject. A failed hard check
   disables Approve.
5. **Send once, verify**: the approved sell order goes to a simulated broker under an idempotency key.
   "Simulate a broker timeout" makes attempt 1 go through but lose its confirmation; the client retries
   with the same key and gets the first order back. "Replay the retry" proves it again. "Verify it
   finished" re-reads the broker (one order for the key, lot down by the right amount, cash in, loss on the
   books) and only then marks the action done. The 401(k) change runs the same way against simulated payroll.
6. **Handoff**: the auto-run request lists the two missing documents. "Upload the sample 1099-INT" (or
   "None this year") resumes the run at step 6, not from the start, and builds interest and dividends.
7. **The file**: the documents as text, the typed record with its checks and the completeness checklist,
   "Try it live" (edit four figures and re-run, or ask a question about the file), the audit trail.

## How a run works

| Step | What | Cost |
| --- | --- | --- |
| Read | The LLM copies the five documents into a typed record (JSON mode). Code checks the schema (no unknown fields), every one of 26 figures against the source document, 1099-B arithmetic, qualified ≤ ordinary dividends, the 401(k) limit | `COST.llm` |
| Check | The checklist for this household (7 items, each with a reason) against the documents on file | free |
| Propose | The LLM proposes 3-5 actions of four typed shapes: `request_documents`, `harvest_loss`, `raise_401k`, `cpa_review`. Code checks each: lot exists and is held, quantity, basis/value/loss arithmetic, paychecks left, the $24,500 limit, room left under it, amounts against the intake, and redoes the tax estimate | `COST.llm` |
| Route | The decision model picks auto / household / CPA per action with probabilities, from a code-written description of the action and its check results (never the LLM's prose). Code's floor: money never auto-runs, a failed check goes to a person | `COST.decision` each |
| Execute | `POST /execute/` rebuilds the payload from the checked numbers, recomputes the key (action id + payload hash), refuses money moves without an approval, claims the key with `setJSONIfAbsent`, then places the order | free (key required) |
| Resume | `POST /resume/` loads the run's checkpoint and continues at step 6; the LLM reads the uploaded 1099-INT, code checks it | `COST.llm` (free for "none") |

Routes: `run.api.js` (NDJSON stream of steps), `resume.api.js`, `execute.api.js` (`op: execute | verify`),
`ask.api.js`. Shared logic is pure JS in `agent.js` (page and API run the same checks, routes and broker);
`server.js` holds the model calls, each cached by its exact input.

## Modes

- **Preview (no key)** and the preset: the page replays a live run recorded on 2026-11-19 (`example.js`):
  the LLM's record and actions, the decision model's routes, the LLM's read of the sample 1099-INT and its
  answers to the three suggested questions. Everything else runs now in the browser on the same code as
  the API: every check, the final routes, approvals, edits, the broker and payroll (in-tab store), the
  verification and the handoff. Labelled "Recorded run" / "Recorded answer".
- **Live (`?k=` key)**: "Re-run the agent live" with edited figures streams from `/run/` (about 20 s:
  two LLM calls, one decision call per action, about 6 cents; the same figures twice are free). Approvals
  execute and verify on the server store. The handoff on a live run calls `/resume/`; custom questions call
  `/ask/`.

## What the recorded run shows (honestly)

- Extraction: 26 of 26 figures match the documents.
- The harvest is clean: 40 SOL, $4,200 loss, about $630 less tax (code and the LLM agree).
- The 401(k) proposal is sloppy and code says so: $2,450 a paycheck when $3,266 fits under the limit
  ("Uses the room under the limit": Review), and a tax saving of $2,156 where code gets $1,155 (the page
  shows code's number). Editing to $3,266 clears both. In other recordings the LLM went $1 over the limit
  ($3,267, a hard fail) or under-used the room; the checks caught each one.
- The decision model put 100% on the right route for every action, so in the recorded run code did not
  have to overrule it; "Test the guard" shows the overrule with a labelled simulated answer.

## What I assumed

- It is November, so the file is built from year-to-date drafts (a W-2 projected from the last pay stub,
  draft 1099s, the crypto gains export). That is what makes year-end strategies possible at all.
- Estimates use flat rates (22% ordinary, 15% long-term) and the usual netting order. They are labelled
  estimates; nothing on the page is tax advice.
- "Approved" counts an auto-run action, a household approval and a CPA sign-off; "done" needs verification.
- One household, one taxpayer with a W-2, no state return.

## What I cut

- Real documents (PDF or photo reading): the documents are text rendered from the figures, so code can
  check the extraction against ground truth.
- A free-roaming tool loop: the agent's six steps are fixed in code so a run always finishes the same
  way; the LLM does the reading and the proposing.
- The rental expense summary has no sample file; that request stays open.
- Notifications to real people, sign-in, multiple households, filing itself.

## With real data

- Read real forms with a vision model into the same schema, and keep the document cross-checks (totals,
  box arithmetic, prior-year comparisons) as the gate.
- Broker and payroll adapters behind the same `executeOnce` / `verifyFinished` interface, with the
  idempotency key passed through to the broker's own client order id.
- Wash-sale and lot-selection rules, state tax, a real tax engine for the estimates, CPA sign-off with
  their credentials, and the audit trail stored per household.

## Env vars

| Var | Needed for | Without it |
| --- | --- | --- |
| `FAL_API_KEY` | Live LLM calls (`DEMO_LLM`) | Live routes fail; the preset still works |
| `JEV_API_KEY` | Live decision-model calls | Live routes fail; the preset still works |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Durable run checkpoints, idempotency keys, caches, budgets | In-memory per instance; `/resume/` and `/ask/` fall back to the checkpoint the page sends (schema-checked) |

## Testing

- `next build` passes. On `next dev -p 3104` at 1360 px and 390 px, dark and light: the preset, the
  timeout and retry, replay, verify (both actions), edit, reject paths, the handoff, the CPA sign-off and
  the guard test, with no console errors.
- With the key: an edited run live (SOL value $7,000 → $2,800 loss), the server-side execute with a timeout
  (504, then 200 replayed, one order) and verify, the live resume, and a custom question.

## Take-down

Delete `src/pages/demo/cointracker/`, `src/pages/api/demo/cointracker/` and the slug's entry in
`src/demos/keys.json`.

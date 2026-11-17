# Affirm demo: servicing agent with a hand-off decision

Unlisted prototype at `/demo/affirm/`, sent to the Contact Channels team (Servicing AI Agents) as a
follow-up to an application. A customer asks about a sample buy-now-pay-later loan in chat. An agent
looks things up with tools, answers inside a policy that code enforces, and a decision model gives the
odds that a person should take over and which queue. A rules floor can only make that stricter. A
hand-off comes with a note for the human agent.

Unofficial prototype by Haider: a fictional lender (Fernway Pay) and a fictional customer (Maya Chen,
Toronto). No Affirm logo, no claim to be Affirm's product, policy or data.

## What is on the page

- **Hero:** the current turn at a glance: the question, each tool call as it lands, the status
  (resolved by the agent / handed to a queue), the outcome, the hand-off probability bar with a 50%
  mark, tool calls, policy checks and the route.
- **Chat:** three suggested questions plus free text (300 characters, live mode only). Each agent
  reply shows its route; an eligible due-date change comes with a **Confirm** button (code applies it,
  no model call) and later turns see the new date. **New chat** resets everything.
- **Maya's loans:** the sample data the tools read (masked card numbers, next payments, due days).
- **Agent run:** each model round with the tools it called, every tool call's arguments (from the LLM)
  and JSON result (from code), the policy guardrails with pass / fixed / n/a, and the decision.
- **Decision:** Jev's probabilities for `handoff` (agent vs a person) and `queue` (payments,
  disputes, hardship), the rules floor with its reasons, the final route, and the state Jev read.
- **Note for the human agent:** asked, checked, left for a person, suggested next step, tone, queue.

## How a turn works

`agent.js` is shared by the API route and the page. One turn (`runTurn`):

| Step | What | Cost |
| --- | --- | --- |
| Tool loop | DeepSeek V3.2 (via fal, OpenAI-style function calling) picks tools over the sample data, up to 4 rounds of up to 4 calls, then answers in 2-4 sentences | 2-5 × `COST.llm` |
| Tools | `get_loans`, `get_payment_schedule`, `check_policy`, `propose_due_date_change`, `open_payment_dispute`, `hardship_options`: plain functions, scoped to the signed-in customer, masked output | free |
| Guardrails | Code checks the reply: scope, date change only after the eligibility check (and never claimed as done before she confirms), no promises (refund, waiver, approval), no credit / APR / financial advice, no number longer than the last 4, a person offered for disputes and hardship. It fixes what it can (removes the sentence, adds the policy line) and shows what it removed | free |
| Decide | One `askJev` call with two typed choice questions, `handoff` and `queue` | `COST.decision` |
| Floor | Code: an opened dispute or a wrong-charge report → Disputes; hardship → Hardship; a refused date change → Payments; she asks for a person; a guardrail removed something off policy. Final route = the stricter of Jev's pick and the floor (rules only add a person; the floor's queue wins) | free |
| Hand-off note | On a hand-off only: DeepSeek writes `{asked, checked, left, next_step, tone}` as JSON from the trace; a template if that fails (labelled) | `COST.llm` |

Due-date eligibility (code, `dueDateChecks`): monthly plan (Pay in 4 is fixed), current with no missed
payment in 6 months, no other change in 12 months, new day 1-28, the next payment moves 21 days or
less (and stays more than 3 days out). Disputes: only posted charges on her own loan; a duplicate is a
second posted charge for the same payment, amount and day; review within 5 business days; no refund
promise.

Route: `POST /api/demo/affirm/turn/` streams NDJSON events (`meta`, `start`, `llm`, `call`, `reply`,
`decide`, `summary`, `done`). `demoApi` charges 5 units a turn (`COST.llm × 4 + COST.decision`; the
recorded turns used 2-5 LLM calls and 1 Jev call, hand-offs one more LLM call; DeepSeek tokens cost a
fraction of a cent, so 5 units is a ceiling, not the bill), clamps the message to 300
characters and the history to 6 turns of 500, accepts only known monthly loans and days 1-28 as
confirmed changes, caps tokens (900 per tool round, which leaves room to think before a call; 500 for
the note), stops the loop after 40 s, and caches every Jev answer and every full turn for 6 hours, so
an identical turn replays for free.

## Modes

- **Preview (no key):** the three suggested questions replay recorded live runs. Only the model
  outputs are canned (DeepSeek's tool calls and reply per round, Jev's answers, the hand-off note);
  every tool result, guardrail check, the floor and the route are computed in the browser by the same
  code the API runs. Labelled "Example run", replayed faster with the live timings shown.
- **Live (`?k=` key):** every turn calls the route; anything can be typed; turns carry the history and
  any change she confirmed. A repeat of an identical turn is labelled "Live · cached".
- On load the page plays the recorded date-change example in both modes, so the first seconds show a
  resolved turn with its tool calls and the hand-off bar.

## Env vars

- `FAL_API_KEY` (DeepSeek V3.2 via fal's OpenAI-compatible router, with tool calls), `JEV_API_KEY`
- Optional: `DEMO_LLM_MODEL`, `JEV_MODEL`, `FAL_LLM_URL`, `JEV_BASE_URL` (see `demos/models`)

## What I assumed

- A signed-in customer in the app's chat: the agent never has to identify her, and every tool is
  scoped to her customer id.
- A lender with monthly plans and Pay in 4. The policy (21-day limit, one change a year, day 1-28,
  suggest a day 1-2 days after payday, confirm before applying; disputes reviewed in 5 business days;
  hardship always to a specialist) is mine, written to look like a real servicing policy. It is not
  Affirm's.
- Three queues behind the agent: Payments, Disputes, Hardship.
- Money in CAD, today fixed at Tue, Nov 17, 2026 (Toronto) so eligibility windows are reproducible.

## What I cut

- No writes anywhere: a confirmed date change is page state, a dispute id is generated, nothing is
  sent, nothing reaches a ticketing system or a human queue.
- No authentication, no identity checks, no account-takeover or fraud flows.
- No streaming of the reply token by token: the tool loop needs the whole turn before the guardrails
  run, so the page types the checked reply out.
- No eval suite in the page; the tools, guardrails and floor were checked with scripted turns in Node
  and the live runs below.

## With real data

- Back the tools with the servicing APIs (loans, schedules, charges, the policy service), keeping the
  same tool schemas; read policy from the source of truth instead of a constant.
- Make the hand-off real: create the ticket in the queue with the note, the trace and the transcript,
  and let the human agent answer in the same thread.
- Evals before any prompt or model change: replay real contacts (anonymised), grade tool choice,
  policy violations (a hard gate), containment and wrong hand-offs, and the note against what the
  human agent actually did next.
- Tune the hand-off threshold per queue from outcomes (re-contacts, CSAT, handle time) instead of a
  fixed 50%, and log every guardrail fix as a signal.

## Testing

Tools, guardrails, floor and the loop were run in Node with scripted model outputs (all three
questions, a refused change, a masked number, a removed promise). Live runs on the Vercel preview:
see `example.js` for the recordings the page replays.

## Take-down

Delete `src/pages/demo/affirm/`, `src/pages/api/demo/affirm/` and the `affirm` entry in
`src/demos/keys.json` about 30 days after sending.

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
questions, a refused change, a masked number, a removed promise). The recorded examples were replayed
through the same code in Node and match the live event streams exactly (tool results, checks, route).

Live runs on the Vercel preview on 2026-11-17 (DeepSeek V3.2 via fal, Jev jev-1.13.0, prompt
`affirm-v3`); these are the recordings in `example.js`:

- "Can I move my payment date? I get paid on the 20th": `get_loans` → `check_policy(due_date_change,
  L-4471)` → `propose_due_date_change(L-4471, 21)` (5 of 5 rules pass) → reply. 5 of 5 guardrails pass.
  Jev: a person 7%, payments queue; no rule fires; stays with the agent. 20.5 s.
- "I think I was charged twice for my laptop payment": `get_loans` → `get_payment_schedule(L-5108)`
  (two posted $324.99 charges on Nov 10) → `open_payment_dispute(L-5108, [CH-88122])` → dispute
  D-37122, review by Nov 24, no refund promised. Jev: a person 100%, Disputes 100%; the floor agrees.
  Hand-off note written. 26.5 s.
- "I lost my job last week. What are my options?": `get_loans` and `hardship_options` in one round →
  reply offers a hardship specialist. Jev: a person 100%, Hardship 100%; the floor agrees. 11.6 s.

Also tested live on the keyed preview with Playwright at 1360 and 390 px: a cached preset ("Live ·
cached"), Confirm, then a typed follow-up that used the confirmed date ("Your next rowing machine
payment is $120.00 on Dec 21", 7 s), and "Can you just waive my next laptop payment? And will this
hurt my credit score?" (no waiver, no credit advice, all guardrails pass; Jev asked for a person at 96%
with no rule firing, so it went to Hardship with a note). No console errors, no horizontal scroll at
390 px. Earlier, a live turn that carried the replayed example as history answered without calling
tools; history now leaves replayed examples out and the prompt asks for fresh tool calls each turn.

Latency is the weak spot: DeepSeek V3.2 through fal mostly calls one tool per round, so a three-tool
turn takes 12-27 s live. The page streams each step as it lands.

## Take-down

Delete `src/pages/demo/affirm/`, `src/pages/api/demo/affirm/` and the `affirm` entry in
`src/demos/keys.json` about 30 days after sending.

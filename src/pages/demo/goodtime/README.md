# GoodTime demo: loop rescue

Unlisted prototype at `/demo/goodtime/`. Two days before a candidate's virtual onsite, an
interviewer drops out. An agent reads the message, checks every qualified replacement against the
sample calendars, lets Jev pick the repair with visible probabilities, holds the slot and drafts the
messages. Then the candidate asks for a change in chat and the agent replans on the same state.
Unofficial prototype by Haider: no GoodTime logo, no claim to be their product, sample data only.

## What is on the page

- **Hero:** the loop at a glance: status (on track, at risk, rescued), the four interviews as chips,
  repair time, tool calls and how many rule checks pass.
- **Calendar (sticky on desktop):** the candidate's week in EST with their availability shaded,
  held slots dashed, the dropped interview struck through, changes ringed and the old slot left as a
  hatched ghost. Below it, each interview with the interviewer's own local time, and the live
  invariant count (35 checks).
- **Message:** two sample messages (Priya out sick; Ravi pulled into board prep), editable.
- **Agent run:** the eight graph nodes with every tool call, its arguments and its JSON result.
- **Decision:** Jev's probabilities over the three repairs, the rules floor, the applied repair, each
  option with its checks, and **Override: apply this instead** on the other valid options.
- **Candidate chat:** multi-turn, on the current schedule. Each agent turn shows the one-line
  reply, the before and after of every moved interview, and its own graph trace.
- **Drafted messages:** per recipient and channel (Email + SMS, Slack, Teams). Never sent.
- **Audit trail:** every agent action, Jev's call, the candidate's requests and any override or
  undo, with **Undo last change**.

## How a run works

The agent is two explicit state machines (`agent.js`): nodes are small functions over one typed
state, edges are code (conditional where it matters), LangGraph-style without the dependency.

| Graph | Node | What | Cost |
| --- | --- | --- | --- |
| `loop_rescue` | `intake` | DeepSeek V3.2 (via fal) calls `report_dropout` (who, why, which days) | `COST.llm` |
| | `getLoop`, `findQualifiedInterviewers`, `checkAvailability`, `scoreOptions` | Deterministic tools over the sample data | free |
| | `decide` | One `askJev` call: `repair` choice over swap / reschedule_one / reschedule_loop; rules floor | `COST.decision` |
| | `holdSlot` | Re-runs every invariant on the new plan, then marks the slots held | free |
| | `draftMessages` | Recipients and channels (code), then a streamed LLM draft per recipient | `COST.llm` |
| `candidate_chat` | `understand` | DeepSeek picks one of three tools: `reschedule_interview`, `answer_candidate`, `hand_to_recruiter` | `COST.llm` |
| | `findSlots`, `validateLoop`, `holdSlot` | Replan, repair the loop order if needed, re-check, hold | free |
| | `draftMessages` | One-line reply for the chat + updated messages | `COST.llm` |

Checks on every slot (`scheduler.js`): qualified (not shadowing), not marked out, inside the
interviewer's working hours in their own time zone, no double-booking (busy blocks and the loop
itself), one interview per person per loop, weekly load cap, 24 h notice for anything new or moved,
inside the candidate's offered hours. Loop rules: system design first, hiring manager last,
15 minute buffers.

Guardrails: the rules set a floor, the least disruptive valid repair (a valid swap, else moving
one interview, else the whole loop). The final pick is the stricter of Jev's pick and the floor, so
rules can only make the choice stricter, never looser, and a confident model cannot hold a slot that
fails a check. `holdSlot` re-validates the whole loop and refuses on any violation.

Routes: `POST /api/demo/goodtime/rescue/` (3 units: two LLM calls and one Jev call) and
`POST /api/demo/goodtime/chat/` (2 units). Both stream NDJSON events, clamp inputs (1,200 and 400
characters), keep max tokens small (300 for tool calls, 600 for drafts) and cache every model call
and every full run for 6 hours, so a repeated request replays for free. The chat route sanitizes the
schedule the page sends (known ids, times inside the week) before using it.

## Modes

- **Preview (no key):** the page replays recorded live runs. Only the model outputs (the tool call
  the LLM made, Jev's answer, the drafted text) are canned; every tool call, check, option, hold and
  calendar change is computed in the browser by the same code the API runs. The three suggested chat
  messages also work: the recorded turn when the schedule matches it, otherwise the preset's tool
  call with template drafts (labelled "template").
- **Live (`?k=` key):** the rescue and every chat turn call the routes. Anything can be typed.

## Env vars

- `FAL_API_KEY` (DeepSeek V3.2 via fal's OpenAI-compatible router, with tool calls), `JEV_API_KEY`
- `DEMO_LLM_MODEL`, `JEV_MODEL`, `FAL_LLM_URL`, `JEV_BASE_URL` (optional overrides, see `demos/models`)

## What I assumed

- A virtual onsite of four interviews with an order rule (system design first, hiring manager last)
  and 15 minute buffers; real loops vary per job and live in the ATS.
- Interviewer qualification is per interview type with a shadowing stage, load caps are per week, and
  any new or moved slot needs 24 hours' notice.
- The candidate offered windows per day in their own time zone. Interviewers keep fixed working
  hours in theirs (Los Angeles, Denver, Chicago, New York, Toronto, London).
- The coordinator's preference order is: same time with another interviewer, then move one
  interview, then move the whole loop. Jev makes that call on the facts; rules keep it valid.
- A fictional company (Larkspur Labs), candidate, recruiter and interviewers. Today is fixed at
  Mon, Nov 16, 2026, 4:05 PM EST so notice periods are reproducible.

## What I cut

- No writes anywhere: holds are page state, nothing reaches a calendar and no message is sent.
- No interviewer acceptance loop (hold → accepted / declined → next candidate), no candidate
  self-scheduling links, no room or video-link booking.
- The LLM does not choose the rescue's tools: that graph is fixed so it is cheap, fast and testable.
  The chat graph is where the model routes between tools.
- Overrides re-draft from templates instead of a second LLM call; undo is one step at a time.
- No eval suite in the page: the scheduler was checked with scripted scenarios (both samples, all
  three chat presets) and the invariant count is visible on every state.

## With real data

- Back the tools with the calendar and ATS APIs (Google / Microsoft free-busy, the loop template,
  interviewer training records and load), keeping the same tool schemas so the graphs don't change.
- Run it as a LangGraph.js graph with a checkpointer per loop, so the rescue, chat turns, human
  overrides and interviewer replies are one durable thread, with interrupts for approval before
  anything is sent.
- LangSmith datasets from past reschedules: replay real dropouts and candidate requests, grade the
  repair, the hold validity (zero violations is a hard gate) and message quality, and gate prompt and
  model changes on them.
- Learn preferences per company: which interviewers can swap for whom, how much disruption a
  recruiter accepts before moving a loop, and how candidates respond to each message style.

## Testing

Scheduler and both graphs were run end to end in Node with scripted model outputs (both samples,
the rules escalation in sample 2, all three chat presets, infeasible requests). Live DeepSeek and Jev
calls were tested on the Vercel preview; the example runs are recordings of those live runs.

## Take-down

Delete `src/pages/demo/goodtime/`, `src/pages/api/demo/goodtime/` and the `goodtime` entry in
`src/demos/keys.json` about 30 days after sending.

# Reacher demo: creator matchmaker

Unlisted prototype at `/demo/reacher/`, an unofficial prototype by Haider (no Reacher or TikTok
logos, not presented as their product). A brand picks one TikTok Shop product; an agent shortlists
8 of 40 sample creators with a fit score and a chance of accepting for each, the LLM drafts a
personal affiliate invite, and when the creator replies, Jev picks the next move while code keeps
the commission inside the brand's max.

## What is on the page

1. **Match.** Three sample products, each with the brand's terms (opening commission, hard max,
   free samples). *Find creators* streams the agent run as a timeline:
   - **Filter** (code): category overlap, audience market, minimum average views. 40 → 12 / 11 / 9.
   - **Score fit** (Jev `score`, 5 levels from "poor" to "excellent"): one small call per creator
     left, 6 at a time. Shown as 0-100.
   - **Estimate acceptance** (Jev `noul`): probability the creator accepts the offer as made, for the
     10 best fits only.
   - **Pick top 8** (code): ranked by fit × P(accept); one LLM call (JSON mode) writes a one-line why
     per creator from their stats. If that call fails, a plain stat line is shown instead.
   The hero card shows the funnel (40 → 12 → 10 → 8), the top match and the number of Jev calls.
2. **Invite.** The creator's profile (stats, content notes, scores) and a streamed LLM invite that
   opens with a hook from their content notes, offers the brand's opening rate and a free sample.
   The final text passes an output check (any rate above the brand's max is rewritten) and stays
   editable. Checks under it: rate vs max, sample offered, length.
3. **Reply.** A DM thread: the invite, then the creator's reply (4 presets per product, or typed).
   - Code parses what the reply asks for (`20%`, `2 samples`, `$400`).
   - Jev `choice` over accept / counter-offer / send sample first / decline, shown as probabilities.
   - Guardrail (code): an "accept" that breaks the terms becomes a counter-offer (code can make an
     action stricter, never looser); commission is capped at the max, samples at the cap, flat fees
     refused. The table shows asked / limit / in reply.
   - The LLM drafts the reply from those numbers; the draft is checked again and any higher rate is
     rewritten before it is shown.

## Routes

All `POST`, wrapped in `demoApi()` (key, rate limit, daily budgets), NDJSON streams of the events
in `matchmaker.js`, and cached for 6 hours by their inputs so repeats cost nothing:

| Route | Body | Model calls | Cost units |
| --- | --- | --- | --- |
| `/api/demo/reacher/rank/` | `{ productId }` | ~22 Jev calls (input tokens only) + 1 LLM (500 max tokens) | `COST.decision * 2 + COST.llm` = 3 |
| `/api/demo/reacher/invite/` | `{ productId, creatorId }` | 1 LLM, streamed (260 max tokens) | `COST.llm` = 1 |
| `/api/demo/reacher/reply/` | `{ productId, creatorId, reply, invite }` | 1 Jev + 1 LLM, streamed (220 max tokens) | `COST.decision + COST.llm` = 2 |

Ids are validated against the sample data; `reply` is clamped to 400 characters and `invite` to
1,200 (`clampText`), body limits 2-8 KB. Jev calls retry once after 400 ms.

## Files

- `data.js`: 3 fictional products and 40 fictional creators (names, handles, brands and numbers are
  all made up).
- `matchmaker.js`: the pipeline shared by the routes and the page: filter, Jev questions and state,
  ranking, prompts, `parseAsk`, `guardTerms`, `capPercents`, the three runners and their reducers.
- `example.js`: recorded model outputs for the example runs (see Modes).
- `index.page.js`, `panels.js`, `Reacher.module.css`: the page, built from the shared kit in
  `src/demos/ui`. Two new kit components came out of it: `Funnel` and `Avatar`.
- `src/pages/api/demo/reacher/*.api.js` and `server.js`: the routes and their model calls.

## Modes

- **Preview (no key):** on load the page replays the example run for the serum, then fills steps 2
  and 3 with the recorded invite and reply for the top match. *Find creators* replays the recorded
  run for whichever product is picked. Only model outputs are stored (Jev's scores, probabilities
  and choice; the LLM's whys, invite and reply text; the live stage timings); the filter, ranking,
  ask parsing, guardrail and output checks re-run in the browser on the same code as the API.
  Anything not recorded (another creator's invite, a typed reply) shows a preview note.
- **Live (`?k=` key):** every button calls its route. Pills say "Live · model" and "cached" on a
  replayed repeat.

`example.js` was recorded on the deployed preview with a demo key: one rank, the top creator's
invite and the first sample reply, per product (the recorder script is not part of the site; it
POSTs to the three routes and keeps only the model outputs).

## Env vars

- `FAL_API_KEY` (DeepSeek V3.2 through fal's OpenAI-compatible router), `JEV_API_KEY`.
- Optional: `DEMO_LLM_MODEL`, `JEV_MODEL`, `FAL_LLM_URL`, `JEV_BASE_URL` (see `demos/models`).

## What I assumed

- A brand sets an opening commission and a hard max per product, plus a free-sample allowance, and
  never pays flat fees in this flow. Real programmes vary (tiered rates, paid posts, retainers).
- Creator stats are the ones a TikTok Shop affiliate tool can see or estimate: followers, average
  views, 30-day GMV, the categories they sell, audience market and a usual commission ask. Reply
  rate stands in for history with brands.
- "Best creator" means expected value of an invite, fit × chance of accepting, not raw reach. That
  is why the 870k-follower makeup creator ranks below smaller skincare specialists.
- Outreach is a DM in the creator's language; one invite and one reply are enough to show the loop.

## What I cut

- No sending, no inbox, no CRM writes: invites and replies are drafts.
- No GMV forecast per creator, no budget allocation across the shortlist, no lookalike search.
- No multi-turn negotiation memory: step 3 handles one reply against the brand's fixed terms.
- No auth beyond the demo key; no per-brand settings UI (terms live in `data.js`).

## With real data

- Pull creators and their sales from the TikTok Shop affiliate APIs (or Reacher's own index), keep
  the same `fitState` / `acceptState` shape, and add history: past invites, replies and conversions
  per creator and per category.
- Calibrate: log every invite with Jev's acceptance estimate and the outcome, then check the
  probabilities against real reply and acceptance rates and tune thresholds per category.
- Evals: a labelled set of creator replies (accept, counter, sample first, decline, edge cases like
  "20% but only if you pay shipping") graded on the action and on the numbers in the draft; gate
  prompt, model and threshold changes on it.
- Guardrails grow with the terms: per-creator ceilings, tiered rates by GMV, sample budgets per
  campaign, and approval for anything off-policy.
- Mobile: the same three steps fit a React Native screen per step (shortlist, profile + invite, DM
  thread); the routes are already plain JSON/NDJSON.

## Testing

Built with `next build`; checked at 1440 px and 390 px (no horizontal scroll) in preview mode and
with a key on the Vercel preview: live rank, invite and reply runs for all three products, which are
also the recorded examples.

## Take-down

Delete `src/pages/demo/reacher/`, `src/pages/api/demo/reacher/`, the `reacher` entries in
`src/demos/keys.json` and `public/demo-videos/reacher.mp4` about 30 days after sending.

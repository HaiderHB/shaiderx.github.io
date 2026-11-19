# Vena demo: a finance-data context engine

Unlisted prototype at `/demo/vena/?k=<key>`, built for the Staff Agentic Developer role on the Data and AI
Intelligence team. A messy trial-balance export from an ERP becomes a validated trial balance on a standard chart
of accounts, through a multi-stage pipeline with model routing, checks in code, provenance, a trust score per row
and an eval against ground truth.

## What is on the page

- **Hero card**: rows that match the hand-made ground truth, how many the fast model mapped, how many went to the
  LLM, and whether debits equal credits. It fills in within about four seconds of load.
- **Run timeline**: Profile → Map to the chart → Validate in code → Provenance and trust → Eval, each with its
  result in one line.
- **Every row, on the chart of accounts**: the export's code and messy name, the mapped account, the fast model's
  confidence, the route (fast model, LLM, or you) and the trust score. Click a row for its provenance: the file
  line with the exact cells highlighted, the fast model's top three with the routing threshold, the LLM's
  one-line reason when it took a second look, the checks on that row, the trust maths, and an override.
- **Checks and statements**: duplicates, debits = credits, every row mapped, sign conventions (contra accounts
  and an accumulated deficit understood), one period, one currency; a balance sheet and a P&L, and the clean
  trial balance. All of it reruns in code on every override.
- **Eval**: accuracy against ground truth for the run and per route, fast model alone vs with the second look,
  what the second look fixed or broke, your overrides, and time, tokens and cost for the run.
- **Paste a CSV**: any export with an account name and either debit / credit columns or one signed balance
  column (up to 60 rows, 12k characters). It is profiled in the browser as you type; mapping runs live with the key.

## How a run works

1. **Profile** (code, `engine.js`): finds the header row under any title lines, detects the code, name, debit,
   credit or signed balance, period and currency columns, and reads every row with its file line, so each value
   points back to a cell.
2. **Map** (`pipeline.js`, `/api/demo/vena/map/`): every row goes to a fast decision model as a typed choice over
   the 27 chart lines, with probabilities. Rows under 97% confidence go to the LLM in one batch, with the fast
   model's top three as candidates, and come back with an account and a one-line reason.
3. **Validate** (code): duplicates are dropped from the totals (marked "fixed"), debits = credits before and after,
   every row mapped, each balance on its account's normal side (contra accounts flip it; a debit in equity is
   read as an accumulated deficit), one period, one currency.
4. **Trust** (code): model confidence × what the checks found on the row (1 clean, 0.4 a failed check, 0 for a
   dropped duplicate). LLM-routed rows get 0.92 when the LLM agrees with the fast model's first choice, 0.85
   for its second or third, 0.75 outside them; an override is 1.
5. **Eval** (code): compares the pipeline's mapping (before overrides) with `GROUND_TRUTH` in `data.js`.

Cost: one decision call per row (input tokens only, about 1.2k each) and at most one short LLM call; the route
charges `ceil(rows / 15) + 1` budget units. Answers for an identical account (code, name, side) and an identical
second-look batch are cached for a week, so a repeat run or a duplicated row costs nothing.

## Modes

- **No key (preview)**: the page replays a recorded live run of the sample (`example.js`: the model answers only),
  then runs the checks, trust, statements and eval in the browser on the same code. The page labels it
  "Example run · model answers recorded live, replayed". Pasting works up to the profile; mapping needs the key.
- **With the key**: "Run live" sends the sample through the API; "Map this file" sends the pasted CSV.

Env vars: the decision-model and LLM keys the other demos use (see `src/demos/README.md`); nothing new.

## What I assumed

- A fictional mid-size SaaS company (Larkspur Cloud Inc., October 2026, USD, year-to-date P&L) and a chart of 27
  lines in six sections. The traps are planted: line 39 repeats line 38, two contra accounts sit on the "wrong"
  side for their section (allowance for doubtful accounts, accumulated depreciation), a contra-revenue line, a
  debit in retained earnings (an accumulated deficit), and "Consulting" / "SaaS subs exp" / "Deferred commissions",
  whose names alone could go two ways.
- The ground truth was written by hand before any model run and has not been edited to match one.
- The 97% threshold was set from the first runs: the fast model is very sure on most rows, and the rows it is
  less sure about (hosting vs G&A, software subscriptions) are the ones worth a second look.

## Results, honestly

- The recorded run (and the live runs while building) scored 38 / 38 against ground truth: 36 rows by the fast
  model, 2 sent to the LLM, both confirmed. The brief imagined "37 / 38"; the real number is shown instead.
- An early version of the second-look prompt did not show the LLM what each chart line covers, and it moved
  "SaaS subs exp" to Sales and marketing (wrong; 37 / 38). Giving it the same line descriptions the fast model
  reads fixed it. That is the kind of regression the eval panel exists to catch.
- The threshold decides the split: at a 90% bar only "SaaS subs exp" (84%) went to the LLM; at 97% "AWS hosting"
  (94%) goes too. The fast model's probabilities can move by a point or two between uncached runs, so a row
  near the bar can switch route.

## What I cut

- Multi-entity and multi-currency consolidation (the currency check only flags a mix).
- Learning from overrides: an override changes this session's mapping and eval, not future runs.
- Hierarchy inference from code ranges (1xxx = assets) as a separate signal; the fast model reads the code anyway.
- Upload of .xlsx files: paste CSV only.

## With real data

- Map against the customer's own chart (or Vena's model dimensions) instead of a fixed 27-line chart, and feed
  confirmed mappings back as few-shot examples per tenant.
- Grow the ground truth from reviewer overrides into a regression suite per ERP (NetSuite, Sage Intacct,
  Dynamics), and tune the threshold per tenant on cost vs accuracy.
- Store provenance as (file hash, sheet, cell) on every derived number so a planner can click from a forecast
  back to the source export.
- Add period-over-period checks (a balance that flips sign or jumps 10x month over month).

## Testing

- `pnpm build`, then `next start -p 3102`, open `/demo/vena/` (preview replay) and `/demo/vena/?k=<key>` (live).
- Checked at 1360 px and 390 px, dark and light: the replay, an opened row, an override, the sample live run and
  a pasted CSV live run.

## Take-down

Delete `src/pages/demo/vena/`, `src/pages/api/demo/vena/`, the `vena` entry in `src/demos/keys.json` and
`public/demo-videos/vena.mp4` about 30 days after sending.

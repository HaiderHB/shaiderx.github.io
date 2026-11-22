# Honeycomb demo: alert to answer

Unofficial prototype for a job application (Senior Software Engineer II, Agentic Intelligence). Not affiliated with
Honeycomb, no Honeycomb data, no logo. Live at `/demo/honeycomb/` (unlisted, noindex).

## What is on the page

1. **Auto-investigation.** An SLO burn alert fires on a checkout latency SLO. Three agents each claim one
   hypothesis (deploy regression, noisy tenant, pod or region), run queries over the sample spans, see each other's
   results on one shared canvas and publish a finding. Code then scores every culprit they proposed and a coordinator
   writes the root cause, with a proof computed from the spans and an exemplar trace.
2. **Skills.** Four short pieces of team knowledge every agent reads. Editable, switchable. The agents cite the
   skill that prompted a query (`S2`), and a side-by-side shows the same alert investigated with and without them.
3. **Evals.** The same investigator on five planted incidents, with skills and without, graded in code against the
   planted cause. The recorded eval repeats every run three times because the agents are not deterministic.

## How a run works

| Step | Who | What |
| --- | --- | --- |
| Alert, burn start, triage | code | SLI per minute from the spans; the burn start is the split of the two hours that best separates quiet from burning; triage is own-time p99 per service before and after |
| Prior | decision model | probabilities over the three hypotheses from the alert and triage |
| Three agents, in parallel | LLM + code | up to 3 queries each, 4 turns; the LLM picks the tool and arguments, code runs it over the spans; each turn the agent also gets the other agents' new results and findings |
| Re-rank | decision model | after every finding |
| Candidates | code | every attribute value that stands out in any tool result on the canvas, plus the culprits the agents named, combined up to three attributes and scored: coverage (share of bad checkouts explained) and precision (share of matching checkouts that are bad). Best balance wins; a near tie goes to a culprit whose build was deployed within 3 minutes of the burn start, then to the simpler one |
| Summary | LLM | writes statement, what was ruled out, next step for the chosen culprit |
| Checks | code | every figure in a finding traced to a tool result; the answer graded against the planted cause |

Tools (`tools.js`): `query` (group-by with count, p50, p99, error rate), `before_after` (around the burn start or a
deploy marker), `attribute_diff` (BubbleUp-style: which attribute values are over-represented in slow spans),
`get_trace` (an exemplar), `list_attributes`. No model ever produces a number: results are computed, and the page
shows the raw JSON behind every call.

## Modes

- **Preview (no key):** the page replays one recorded investigation of incident 1 and shows the recorded eval
  (5 incidents x 2 configs x 3 trials = 30 investigations: 14/15 correct with skills, 6/15 without). All of it is real output, written to `example.js` by a
  script, not edited by hand. Skills can be edited but runs need a key.
- **Live (private link):** `POST /api/demo/honeycomb/run/` streams one investigation (35-55 s, about 13 short LLM
  calls and 5 decision-model calls, roughly one cent). `POST /api/demo/honeycomb/eval/` runs one incident for the
  eval; the page calls it ten times, two at a time (about 4 minutes). Identical runs replay from cache.

Env vars: `FAL_API_KEY` (LLM), `JEV_API_KEY` (decision model). Optional `DEMO_HONEYCOMB_LLM_SLOTS` (default 3):
the gate that keeps concurrent LLM calls under the provider's account cap.

## What I assumed

- The interesting part of an auto-investigation is not that an LLM can read a chart; it is who is allowed to
  decide. Here models choose where to look and write the words; code computes every number and picks the culprit.
- Agents collaborating on one canvas should be able to build on each other's paid-for results, so the canvas
  carries query results, not only conclusions.
- A team's knowledge belongs in small, named, editable units, and an eval should say whether a change to one of
  them made the agent better or only different.
- An SLO on checkout latency (99% under 1,200 ms) and wide events with tenant, region, build, pod, tier and
  application attributes, some of them high-cardinality (about 320 tenants, 48 pods).

## What the eval changed while I built this

- The first version let the coordinator LLM pick the culprit from the agents' findings. The eval showed it
  choosing a caller service or a whole region over the narrow cause, and results flipping between identical runs.
  So the choice moved into code: candidates come from the tool results and are scored on coverage and precision.
- A first draft of skill S1 ("never name a load-test tenant as the root cause") fixed incident 2 and, in that
  earlier version, flipped incident 3 to failing: the tenant agent saw one real tenant in 99% of the slow spans
  and called it "just the main victim". Different, not better. Once the culprit came from the evidence rather
  than the agent's verdict, that failure went away; S1 still got the sentence that says a real tenant can be the
  cause.
- Without skills the agents keep failing the same three ways (recorded eval): they blame the load test on
  incident 2, never look at feature flags on incident 1, and stop at the build without asking "for whom" on
  incident 5.
- Wall-clock time is on the root-cause card but not in the eval table: evals run under a shared provider rate
  limit, so time per run mostly measures queueing. Queries and LLM calls are counted instead.

- After the recording, one live run named an extra segment ("free-tier") in the summary and "cleared" the region
  that was part of the culprit. The coordinator prompt now says to name only the chosen culprit's values and never to
  clear one of them (cache version v13). The recorded example predates that one-line change.

## What I cut

- Real OpenTelemetry ingestion and a query language: the tools take a small JSON filter.
- A real MCP server: the tools are plain functions with JSON schemas, shaped so they could sit behind one.
- More than three hypotheses, agents that spawn agents, and human steering mid-run.
- Statistical tests on the eval: three trials per cell show the spread but not a confidence interval.
- A stable confidence number from the decision model: its ranking follows the agents' verdict words, so the
  page shows an evidence score from code and flags when the ranking disagrees with it.
- Timeline heatmaps: one p99 line with the threshold and deploy markers.

## With real data

- Point the five tools at the real query API through the MCP server and keep the code-side scoring as is: it
  only needs "count the bad events this filter matches".
- Build the eval set from past incidents with known causes (retro docs give the label) instead of planted ones,
  and add trials until the pass-rate interval is tight enough to gate a prompt or skill change.
- Add cost and latency budgets per investigation, and stop early when one candidate already explains the burn.
- Let the on-call person correct a finding on the canvas and feed the correction back as a skill proposal.

## Files

- `data.js`: the seeded span generator and the five scenarios. `tools.js`: alert, triage, the query tools, the
  proof. `agent.js`: prompts, the agent loop, the canvas, candidate scoring, grounding check, grader, skills.
- `run.js`: event reducer shared by live runs and the replay. `panels.js`, `index.page.js`: the page.
- `example.js`: recorded output. `evalRow.js`: one eval row from a run's events.
- `src/pages/api/demo/honeycomb/`: `run.api.js`, `eval.api.js`, `live.js` (model calls, cache).

## Testing

`npm run build`, then `next start` and open `/demo/honeycomb/?k=<key>` at 1280 and 390 px: run the investigation,
run without skills, run the eval.

## Take-down

Delete this folder, `src/pages/api/demo/honeycomb/`, `public/demo-videos/honeycomb.mp4`, `video/films/honeycomb/`
and the `honeycomb` entries in `src/demos/keys.json` about 30 days after sending, or when asked.

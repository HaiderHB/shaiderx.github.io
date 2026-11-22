# Mastra demo: traces in, fixes out

Unofficial prototype for a job application (AI Engineer: trace intelligence, agent learning, autoevals and
suggestions, rollouts). Not affiliated with Mastra, no Mastra data, no logo. Live at `/demo/mastra/` (unlisted,
noindex).

## What is on the page

1. **Benchmark.** An order-support agent for an invented outdoor-gear store ("Fernway"), configured the Mastra way:
   instructions, four tools with input schemas (`lookupOrder`, `findOrders`, `returnPolicy`, `startReturn`), a memory
   window (`lastMessages`) and a step budget (`maxSteps`). It runs over 40 test cases, each a customer thread with an
   expected outcome. The grid fills as cases finish; each failed cell names its cause.
2. **Trace intelligence.** Failures grouped by cause: wrong tool chosen, bad tool arguments, hallucinated field,
   missing memory or context, stopped early. Each cluster opens to example traces as a span waterfall (agent run,
   memory recall, model steps with tokens and latency, tool calls with arguments and results), the answer, and the
   checks it was graded on.
3. **Suggestions.** For each cluster the LLM proposes one or two typed config changes, shown as a diff of the agent's
   config. You choose which to apply.
4. **Rollout.** The chosen changes make candidate v2, which re-runs the same cases. Code computes before and after
   per cluster, lists regressions (cases that passed before and fail now) and gates the rollout: promote only if the
   pass count rises and nothing that passed now fails.

## How a run works

| Step | Who | What |
| --- | --- | --- |
| Memory | code | the thread is cut to the last `lastMessages` messages (a span records what was dropped) |
| Agent loop | LLM + code | up to `maxSteps` model steps with function calling; code validates each call's arguments against the schema (a `pattern` is enforced) and runs the tool over the sample orders |
| Grade | code | right tools, expected arguments, finished with an answer, no invented facts (every date, tracking number, amount and day count in the answer must appear in a tool result or the thread), required facts present, and for follow-ups whether the earlier message's email or order number reached a tool |
| Cause | code | the first rule that applies: memory dropped the needed fact; a forbidden tool was called; an expected tool got the wrong arguments; the step budget ran out (or it answered before the last lookup); an expected tool was never called; an invented fact; a missing fact |
| Suggest | LLM | per cluster: the current config, up to three condensed failing traces, a few calls that worked (for contrast) and the change kinds that usually fix that cause. Returns `{ diagnosis, changes, risk }` |
| Validate | code | each change must name a known tool and parameter, a regex must compile, numbers must be in range; rejected changes are shown |
| Gate | code | per-cluster fixes, regressions, tokens, time and steps per case, verdict |

## Modes

- **Preview (no key):** the page replays a recorded run: the baseline over all 40 cases, one suggestion per cluster,
  all five applied, and the candidate over the 40 cases. It is labelled "Example run, recorded 2026-11-21". It was
  recorded by `record.mjs` through the same two routes the live mode uses; the run data was not edited. (One label
  was corrected: the recorder first wrote the UTC date, 2026-11-22.)
- **Live (private link):** "Live · 10 cases" runs a fixed subset that covers every kind of question, three at a time:
  `POST /api/demo/mastra/bench/` (about 30 s), then `POST /api/demo/mastra/suggest/`, then the re-run. One cost unit
  per uncached case and per uncached suggestion, so a full live pass is about 25 units. Identical cases with an
  identical config replay from cache for 24 hours.

Env vars: `FAL_API_KEY` (LLM). Optional `DEMO_MASTRA_LLM_SLOTS` (default 3): concurrent LLM calls per server
instance, under the provider's account-wide cap. Rate-limited replies (429) retry with backoff.

## What the recorded run shows

- Baseline v1: 13 of 40 pass. Clusters: stopped early 8, bad tool arguments 7, missing memory 6, wrong tool 5,
  hallucinated field 1.
- Candidate v2 (all five suggestions): 27 of 40 pass, but 2 regressions, so the gate says "review before promoting".
  Both regressions are tracking-number questions: v2's new instruction lines say when to use `lookupOrder` without
  mentioning tracking, and the tool's own description ("Look up an order.") never says it returns tracking. The model
  answered that it has no tracking tool. The fix belongs in the tool description, which no suggestion touched: the
  gate caught a change that was better on average and worse for some customers.
- Fixes move failures to other causes: five of the seven bad-argument cases now fail as "wrong tool", because the new
  schema says ids must start with `FW-` and the model asks the customer instead of adding the prefix itself.
- A live run of the 10-case subset while testing went 4 to 8 of 10 with no regressions (promote).
- The model is not deterministic, even at temperature 0: a case can pass on one run and fail on the next (c03 failed
  in an early test of the baseline and passed in the recording). One trial per case is a cut (see below).

## What I assumed

- Trace intelligence is most useful when the cause comes from the trace itself, so each cause is a rule over spans,
  not an LLM's opinion; the LLM's job is the part that needs language: proposing the fix.
- Suggestions should be typed changes to the config a team already has (Mastra's agent, tool and memory options), so
  they can be validated, diffed, reverted and rolled out like code.
- "Better, not just different" needs a regression check on the cases that already passed, not only a higher average.
- The baseline config carries five planted mistakes of the kind real configs pick up ("always give a delivery date",
  "start returns right away", an id parameter with no format, `lastMessages: 1` to save tokens, `maxSteps: 2`). The
  failures they cause are real model behaviour, recorded, not scripted.

## Mastra itself

The page uses a small runner written for it, with Mastra's shapes (agent instructions, `createTool` with an input
schema, `Memory({ options: { lastMessages } })`, `maxSteps`, spans per step and tool call), and shows the config as
Mastra-style TypeScript. I did not install `@mastra/core`: it is ESM-only and pulls a large dependency tree (a web
server, process and hashing libraries, telemetry), so it was unlikely to bundle in this site's Next 12 build and would have changed the
shared lockfile. With the real framework, the runner would be `agent.generate()` and the spans would come from its
tracing.

## What I cut

- Several trials per case and confidence intervals on pass rates (one trial each keeps live runs small).
- An LLM or decision-model judge for answer quality: grading is rule-based against expected facts, which is strict
  (a correct date the model computed itself counts as invented).
- Round two: re-suggesting from the candidate's remaining failures and regressions. The page stops at one round.
- Staged rollout (canary percentage, production traffic replay); the gate is offline over the dataset.
- Editing a suggestion before applying it.

## With real data

- Read production traces from Mastra's tracing instead of benchmark runs, sample failures by cause, and turn the
  worst ones into dataset cases with their expected outcome.
- Run each case several times and gate on the interval, not one run; keep a held-out set so fixes are not tuned to
  the cases they were suggested from.
- Feed regressions back into the next suggestion round (here: "both regressions are tracking questions; the tool
  description does not mention tracking").
- Track cost and latency per config version next to accuracy (v2 here: +21% tokens per case).

## Files

- `data.js`: store, orders, policy, baseline config, the 40 cases and the live subset.
- `agent.js`: tools, schema validation, agent loop, grader and causes, clustering, comparison, config validation and
  patching, the Mastra-style renderer and a line diff. Pure JS, shared by the page and the routes.
- `panels.js`, `index.page.js`, `Mastra.module.css`: the page. `example.js`: the recorded run. `record.mjs`: the
  recorder (`node src/pages/demo/mastra/record.mjs <key> http://localhost:3202` against a running server).
- `src/pages/api/demo/mastra/`: `bench.api.js`, `suggest.api.js`, `live.js` (model calls, gate, retry, cache).
- Kit addition: `TraceWaterfall` in `src/demos/ui/` (catalog and gallery updated).

## Testing

`npm run build`, then `next start -p 3202` and open `/demo/mastra/` at 1360 and 390 px, dark and light: the example
replays on load. With `?k=<key>`: switch to "Live · 10 cases", run, suggest fixes, re-run.

## Take-down

Delete this folder, `src/pages/api/demo/mastra/`, `public/demo-videos/mastra.mp4`, `video/films/mastra/` and the
`mastra` entries in `src/demos/keys.json` about 30 days after sending, or when asked.

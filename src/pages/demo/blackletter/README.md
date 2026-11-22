# Blackletter demo: review, then learn from the lawyer

Unlisted prototype at `/demo/blackletter/`. An agent reviews a short deal document (term sheet,
SAFE side letter, offer letter) against a firm playbook and pins every flag to the exact words.
A lawyer accepts, edits or rejects each flag; every decision is saved as an eval case. One click
turns the feedback into harness changes (rule clarifications and prompt examples), reviews all
five sample documents with the old and the new harness, and scores both against hand-written
labels. Labelled "unofficial prototype"; no Blackletter branding. Sample documents, fictional
parties, not legal advice.

## How a run works

| Step | What | Cost |
| --- | --- | --- |
| Review | One streamed LLM call per document (`DEMO_LLM`). For every clause a playbook rule is about, the model writes one JSON object per line: `{ clause, rule, finding, breach, quote, redline }`, finding before verdict. `breach: false` objects are kept as "checked and cleared" | `COST.llm` |
| Pin | `harness.js` looks each quote up in the document (exact, then with quote marks, dashes, case and spacing folded). Found: the flag gets its clause and range, and the page highlights the document's own text. Not found, elided or too short: dropped and listed | free (code) |
| Confidence | One `askJev` choice question per pinned flag (real issue / judgement call / not an issue) with visible probabilities; anything but "real issue" is tagged "Check first" | `COST.decision` |
| Lawyer | Accept, edit the redline, or reject with one line. Each decision becomes a golden case (`must flag` / `must not flag`) | a person |
| Learn | One short LLM call writes one clarification per rejected rule from the lawyer's reasons (falls back to the reason itself). Code adds "flag" / "do not flag" examples, with the lawyer's redline where it was edited | part of `COST.llm * 4` |
| Score | All five documents are reviewed with harness v1 (stored per day) and v2, at most three calls at a time. `scoreRun` counts true and false positives and misses against `LABELS`; `diffRuns` lists the flags that changed and whether each change was right | free (code) |

## Files

- `data.js`: five sample documents, the 11-rule playbook, the 11 ground-truth labels, sample reasons.
- `harness.js`: prompts, the object-stream parser, pinning, the confidence question, scoring,
  run diffs, feedback to golden cases to harness v2. Pure code, shared by routes and page.
- `example-data.js`: one complete run recorded live from the routes (2 reviews, 5 decisions,
  10 eval reviews). `example.js` wraps it for the page.
- `index.page.js`, `panels.js`, `Blackletter.module.css`: the page, on `src/demos/ui`.
- `src/pages/api/demo/blackletter/review.api.js`: `POST /api/demo/blackletter/review/ { doc, fresh? }`.
- `src/pages/api/demo/blackletter/learn.api.js`: `POST /api/demo/blackletter/learn/ { feedback }`.
- `src/pages/api/demo/blackletter/server.js`: the review call, concurrency limit and retry, baseline store.

## Modes

- **Preview (no key):** the page shows the recorded run, labelled "Example run". Accept / reject
  and the golden set work in the browser; reviews and the re-run need the key.
- **Live (`?k=` key):** the first live action clears the example. A document already reviewed
  today replays the stored run (free, labelled); "Review again, fresh" runs it anew.

## Env vars

`FAL_API_KEY` (LLM through fal's router) and `JEV_API_KEY`. Optional: `DEMO_LLM_MODEL`, `JEV_MODEL`.

## What I assumed

- The firm acts for the company and founders, so the playbook is company-side.
- A first-draft playbook is short and vague in places (for example "flag an option pool counted
  in the pre-money"). That vagueness, not model error, is where most false alarms come from, and
  it is what lawyer feedback fixes.
- Labels are (rule, clause) pairs. A flag on the right clause under the wrong rule is wrong.
- The labels were written before any model run. The playbook wording was adjusted once after
  seeing runs (the option pool rule was added so the default document has a realistic false alarm).

## What I cut

- No "add a missed issue" action, so feedback cannot raise recall directly.
- One run per version. The model is not fully deterministic (a quote can fail the pin check in
  one run and pass in the next); the page says so and marks such changes as noise.
- The confidence score is shown and used for "Check first" only; it does not gate flags.
- No upload of your own document, no multi-lawyer disagreement, no persistence of the golden set
  beyond the browser tab.

## With real data

- Golden set from real matters: lawyer edits and the final signed document as labels, split by
  document type, with held-out matters that never contribute examples.
- Run each version several times and report the spread; track precision at fixed recall.
- Compare the first redline with the final work product (edit distance, kept or replaced) as an
  outcome metric, not only flag correctness.
- Review clarifications before they ship: each is a playbook change a partner should approve.

## Testing

`npm run build`; then with `.env.local`, `npx next dev -p 3102`, open
`/demo/blackletter/?k=<key>`, review the seed term sheet, reject the option pool flag with the
sample reason, apply the feedback. Checked at 1280 px and 390 px.

## Take-down

Delete `src/pages/demo/blackletter/`, `src/pages/api/demo/blackletter/`, the `blackletter` entry
in `src/demos/keys.json`, `video/films/blackletter/` and `public/demo-videos/blackletter.mp4`.

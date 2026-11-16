# GC AI demo: playbook redlines, anchored to the exact words

Unlisted prototype at `/demo/gc-ai/`. A Word-style redlining assistant: a document pane with a
vendor's SaaS subscription agreement (13 clauses, written for this demo) and a task pane on the
right. Pick a negotiating playbook, click Review, and tracked changes stream into the document as
real redlines (struck deletions, underlined insertions), each with a one-line reason citing the
playbook rule, an anchoring status, and a Jev decision for its clause: accept as drafted,
negotiate, or escalate to counsel. Accept or reject per change or all at once; download the result
as a `.docx` with real tracked changes. Labelled "unofficial prototype by Haider"; no Microsoft or
GC AI branding.

## How a review works

| Step | What | Cost |
| --- | --- | --- |
| Stream | One streamed LLM call (`DEMO_LLM`, DeepSeek V3.2 via fal) returns edits as JSON objects, one per line: `{ c, quote, insert, rule, why }`. The route cuts each object out of the token stream as its closing brace arrives | `COST.llm` x2 (one long call) |
| Anchor | `anchor.js` turns each quote into an exact range: exact unique match in the cited clause, then a match with quote marks, dashes, spacing and case normalised ("re-anchored"), then a unique match in another clause (model cited the wrong §). Not found, found twice, elided with "…" or overlapping another change: refused and listed, never guessed | free (code) |
| Decide | When the model moves past a clause, one `askJev` call with one typed `choice` question for that clause (accept / negotiate / escalate), on the clause text, the cited rules and the anchored redline | `COST.decision` |
| Export | `docx.js` writes WordprocessingML by hand (STORE-only zip, no dependency): pending changes as `w:del` / `w:ins` revisions with the reason (and Jev's call) as a Word comment; accepted and rejected ones as plain text; `w:trackRevisions` on | free (browser) |

The route bills `COST.llm * 2 + COST.decision` (3 units). The same playbook and house rule on the
same day replay the cached event stream at triple speed for free (the key is still required).

The deletion drawn in the document is always the contract's own text at the anchored range, never
the model's quote, so a near-miss quote cannot change what a redline appears to strike.

## Files

- `contract.js`: the sample agreement (fictional parties) and the prompt rendering of it.
- `playbooks.js`: three playbooks (Customer-side SaaS, Enterprise strict, Light touch) with rule ids.
- `anchor.js`: folding, matching and refusal rules; the six anchoring checks shown on the page.
- `review.js`: prompt, streaming object parser, `runReview` (injected `generate` / `decide`), the
  Jev question, the event reducer and accept/reject helpers. Shared by the route and the page.
- `docx.js`: the `.docx` writer (tested by opening the output in LibreOffice and python-docx).
- `example.js`: recorded live runs (one per playbook) replayed in preview mode.
- `index.page.js`, `GcAi.module.css`: the page, built from `src/demos/ui`. The redline itself is
  the kit's new `TrackedText` component.
- `src/pages/api/demo/gc-ai/review.api.js`: `POST /api/demo/gc-ai/review/` streams NDJSON events.

## Modes

- **Preview (no key):** the page replays a recorded live run of the chosen playbook (the exact
  event stream the route sent), faster, and says so. Accept / reject, markup views and the `.docx`
  export work for real on it. The anchoring checks always run in the browser.
- **Live (`?k=` key):** Review streams from the route. An optional house rule (one line, 160
  characters) is added to the playbook as rule `H1`.

## Env vars

- `FAL_API_KEY` (DeepSeek via fal's OpenAI-compatible router) and `JEV_API_KEY`, both required
  for live reviews. Optional: `DEMO_LLM_MODEL`, `JEV_MODEL`, `FAL_LLM_URL`, `JEV_BASE_URL`.

## What I assumed

- We act for the customer (Northgate) reviewing the vendor's paper, the usual in-house position.
- Playbooks are short rule lists with ids; real ones carry fallback positions and approved
  language, which would go in the same prompt slot.
- A redline is a set of minimal replace operations inside one clause. Moving text between
  clauses, renumbering and cross-reference repair are out of scope.
- "Escalate to counsel" is a judgement on exposure, so Jev makes it per clause with a visible
  distribution instead of a keyword rule; the team would set its own threshold.

## What I cut

- No Office.js runtime: the page is a web mock of a task pane. In a real add-in the same anchors
  map onto `Word.Range`s: turn on `document.changeTrackingMode = trackAll`, find the clause
  paragraph, then `paragraph.search(quote, { matchCase: true })` and `insertText(insert,
  'Replace')`. Word's search caps the string at 255 characters, so long quotes need the
  paragraph text plus offsets (split into ranges with `getTextRanges` or search on a unique
  prefix and suffix), which is exactly what the anchoring step already computes.
- One fixed sample contract; no upload, no `.docx` import.
- No second pass that asks the model to repair a refused edit. Refused edits are listed so a
  lawyer sees what the model wanted; a retry with the clause text and the refusal reason is the
  obvious next step.
- No evals beyond the six deterministic anchoring checks.

## With real data

- Run on the customer's own playbooks and clause library (approved fallback language), and on
  the open document through Office.js, with the anchoring step unchanged.
- Evals from history: past negotiated contracts give (vendor draft, final signed text) pairs;
  measure redline precision/recall per rule and the refusal rate, and gate prompt and model
  changes on them.
- Learn the escalate threshold per team from what counsel actually escalated.
- Comments and replies in the `.docx` round-trip: read the counterparty's comments and tracked
  changes back in, so the next turn negotiates against their redline, not the original.

## Testing

- `anchor.js`, `review.js` and `docx.js` were exercised in Node with a fake streamed model
  (chunked at 6-7 characters, wrapped in a code fence) before wiring the route; the `.docx` opens
  in LibreOffice with the revisions shown as tracked changes and parses with python-docx.
- The preview deployment was tested with a key at desktop and 390 px widths, with live runs
  recorded for all three playbooks (`example.js`).

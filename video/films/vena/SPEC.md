# SPEC: Vena launch film (kit 2.1, launch format)

GOAL:    A stranger at Vena watches 69 s, sound on or off, on a laptop or a phone. After 15 s they can say what this
         is (an engine that turns messy ERP exports into a validated, mapped trial balance) and what problem it solves
         (every ERP names accounts its own way). They see ONE task done (the export becoming a validated mapping),
         then provenance on one row, then the eval against ground truth, and know where to try it.
OUTPUT:  HyperFrames 1920x1080, 30 fps, H.264 + AAC. Music: bright-pluck-112-long at -20 LUFS, fades 0.3 / 1.5 s.
         Web encode: H.264 CRF 26, faststart -> public/demo-videos/vena.mp4.
RUN:     example (data-kit-run="example"). One take, `flow`, recorded 2026-11-18 from a production build of the demo
         (next build && next start -p 3102) with NO key: the page replays its example run. The model answers in it (the
         fast decision model's probabilities for 38 rows, the LLM's second look on 2 rows) were recorded from a live run
         of the sample through /api/demo/vena/map/ (run_dHL65fQPnWw); profile, checks, trust, statements and eval run in
         the browser on the same code as the API. No live model calls while recording. The replay paces rows 48 ms apart
         and holds the LLM's pending state 1.3 s (live: 1.25 s for all fast calls, 2.1 s for the LLM). Labelled on screen:
         "Example run", "Recorded run, replayed", "Recorded answers, replayed".

## Beat table

Captions: <= 8 words, reading time max(2.5, 0.5 + 0.6 x words). Text screens 3 s. Result rule: a result stays
max(2.5, 0.5 + 0.3 x words read) s. Times are film seconds; media times are in `flow` (data/clips/flow.json marks).

| # | Beat | Seconds | Picture (real page footage) | Text on screen | Words / needs | Result lands at / held for | Focus box | Honesty |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | HOOK | 0.0-4.5 | Rows 3-8 snapping onto the chart with confidence bars, right after Replay (media 20.97) | "Messy rows snap onto clean accounts" | 6 / 4.1 s | rows land 0-0.4 s / 4.1 s | `rL3`-`rL8` | chip "Example run" |
| 2 | WHAT IT IS | 4.5-7.5 | mapped rows, blurred and dimmed (media 26.13) | "An engine that turns messy ERP exports into trusted books." + "A prototype built for Vena by Haider Bokhari" | 10 / 3 s | | (statement) | |
| 3 | PROBLEM | 7.5-10.5 | the raw export card, blurred (media 10.02) | "Every ERP names its accounts its own messy way." | 9 / 3 s | | (statement) | |
| 4 | HERO 1 | 10.5-16.0 | the raw export card, as the ERP wrote it | "The raw ERP export: cryptic account names" | 7 / 4.7 s | 0 / 5.5 s | `fileCard` | |
| 4 | HERO 2 | 16.0-22.5 | rows 8-12: Replay pressed (out of frame) at 1.3 s, rows go from "queued" to mapped | "A fast model maps every row, with confidence" | 8 / 5.3 s | 2.4 s / 4.1 s | `rL8`-`rL12` | chip "Recorded run, replayed" |
| 4 | HERO 3 | 22.5-29.0 | rows 27-35: AWS hosting (94%) and SaaS subs exp (84%) wait on the LLM, then land | "Unsure rows get an LLM second look" | 7 / 4.7 s | 1.9 s / 4.6 s | `rL27`-`rL35` | chip "Recorded answers, replayed" |
| 4 | HERO 4 | 29.0-35.5 | the checks card lands when the replay ends: duplicate line 39 fixed, debits = credits, signs, period, currency | "Code catches the duplicate; the books balance" | 7 / 4.7 s | 1.2 s / 5.3 s | `checks` | |
| 5 | FEATURE 2a | 35.5-41.0 | row 29 clicked at 1.37 s: its source line with cells A29, B29, D29 marked | "Every row links back to its source cells" | 8 / 5.3 s | 1.7 s / 3.8 s | `rL29` + `traceSource` | |
| 5 | FEATURE 2b | 41.0-46.5 | the same row: fast model's top three, the LLM's reason, checks, trust 0.92 x 1.0 = 92 | "Trust: model confidence times what checks found" | 7 / 4.7 s | 0 / 5.5 s | `traceWhy` + `traceTrust` | |
| 6 | FEATURE 3a | 46.5-52.5 | eval score card: 38 / 38, fast 36 / 36, LLM 2 / 2 (after the top bar's Eval link scrolled there) | "Graded against a hand-made answer key: 38/38" | 7 / 4.7 s | 0 / 6.0 s | `evalScore` | chip "Example run" |
| 6 | FEATURE 3b | 52.5-57.5 | time and cost card: whole mapping stage 3.35 s | "The whole mapping run took 3.4 seconds" | 7 / 4.7 s | 0 / 5.0 s | `evalCost` | |
| 7 | PROOF | 57.5-64.0 | the top of the page, wide: title + the 38 / 38 card | 38/38 match ground truth · 2 rows needed the LLM · "A fast decision model routes · an LLM takes a second look · typed checks in code" | 9 / 5.9 s | | `heroText` | numbers from the recorded run |
| 8 | END | 64.0-69.0 | end card | "Built for Vena by Haider Bokhari" / "Try it live: the link is in my message" / "haiderb.com" | | | | |

Chapters: The problem 0 · One export 10.5 · Provenance 35.5 · Eval 46.5

## Footage

Take `flow` (88.98 s, 2x, 1360x765). Marks (media s): top 0.0 · export 8.95 · map-replay 20.39 · map-pending 23.16 ·
map-done 24.50 · llm-replay 32.25 (by script) · llm-pending 34.96 · llm-llm 36.30 · checks-replay 44.57 (by script) ·
checks-done 48.70 · trace-open 59.65 · eval-nav 75.05 · eval-landed 75.97 · end 88.98. Media starts in the compositions
are computed from these marks.

## Choices

- The brief imagined "37 / 38". The recorded run scored 38 / 38, so the film says 38/38.
- The override (one row moved, a sign check fails, trust drops to 40) is on the page but not in the film: the brief
  allows two features after the hero, and provenance and the eval are the ones it named.
- "LLM" stays in two captions (QA warns): the copy rule allows "the LLM" in plain sentences, and "second look by a
  bigger model" reads worse.

## Cold-viewer test

At 15 s the viewer has seen rows snapping onto "clean accounts", the sentence "An engine that turns messy ERP exports
into trusted books", the problem "Every ERP names its accounts its own messy way", and the raw export itself. Yes: they
can say what it is and what it fixes.

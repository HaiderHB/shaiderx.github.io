# SPEC: Honeycomb launch film (kit 2, launch format)

GOAL:    A stranger at Honeycomb watches 60-75 s, sound on or off, on a laptop or a phone. After 15 s they can
         say what this is and what problem it solves; by the end they have seen ONE real task done and know
         where to try it. Text carries everything (no voice); one instrumental bed sits under it.
OUTPUT:  HyperFrames 1920x1080, 30 fps, H.264 + AAC, < 20 MB. Music: one kit bed (bright-pluck-112-long for
         60-90 s) at -20 LUFS integrated, fades 0.3 / 1.5 s. Web encode: H.264 CRF ~26, faststart.
RUN:     example (data-kit-run="example"). Recorded 2026-11-21 from a production build of the demo (next start -p 3101)
         opened with the review key. The page replays its own recorded run (one live investigation of incident 1 with
         team skills, plus the recorded eval: 5 incidents x 2 configs x 3 trials = 30 live investigations, all
         recorded 2026-11-21) through its "Replay the recorded run" button, pressed by script. No model calls during
         capture. Labelled on screen: "Recorded run, replayed", "Recorded runs", "Recorded eval", "Sample data".

## Beat table

| # | Beat | Seconds | Picture (real page footage, clip `flow`, media s) | Text on screen | Words / needs | Result lands at / held for | Focus box | Honesty |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | HOOK | 0.0-4.5 | root-cause card just landed (68.6-73.1), 2.5x | "Root cause found before anyone looks" | 6 / 4.1 s | 0 / 4.5 | `rootLeft` | chip "Recorded run, replayed" |
| 2 | WHAT | 4.5-7.5 | agent lanes mid-run, blurred (27-30) | "Agents that investigate an SLO burn alert on their own." + "A prototype built for Honeycomb by Haider Bokhari" | 9 / 3 s | | statement | |
| 3 | PROBLEM | 7.5-10.5 | the alert card, blurred (9-12) | "Alerts fire, and on-call starts digging from zero." | 8 / 3 s | | statement | |
| 4 | HERO 1 | 10.5-16.0 | alert card: 6.5x burn, p99 chart with deploy marker (6.3-11.8) | "Checkout SLO starts burning: 6.5x budget" | 6 / 4.1 s | 0 / 5.5 | `alertHead`+`chart` | chip "Sample data" |
| 4 | HERO 2 | 16.0-22.5 | three lanes; replay running, first queries land (17.5-24) | "Three agents each claim one hypothesis" | 6 / 4.1 s | 2.2 / 4.3 | `headD`..`callI1` | chip "Recorded run, replayed" |
| 4 | HERO 3 | 22.5-29.0 | deploy agent's finding lands with its evidence (42.5-49) | "Every finding cites a real query result" | 7 / 4.7 s | 2.05 / 4.45 | `findD` | |
| 4 | HERO 4 | 29.0-36.0 | root cause card lands: 84% / 100%, p99 split, exemplar trace (66.4-73.4) | "84% of bad checkouts explained, computed in code" | 8 / 5.3 s | 1.97 / 5.03 | `rootProof` | |
| 5 | FEATURE 2a | 36.0-41.5 | skill S2 "How we ship" in the editor (78.6-84.1) | "Skills write down what the team knows" | 7 / 4.7 s | 0 / 5.5 | `skillS2` | |
| 5 | FEATURE 2b | 41.5-47.5 | same alert with and without skills, first queries side by side (84.1-90.1) | "Skills change which queries agents run" | 6 / 4.1 s | 0 / 6 | `cmpWith1`+`cmpWithout1` | chip "Recorded runs" |
| 6 | FEATURE 3a | 47.5-53.5 | eval tiles: 14/15 with skills, 10/15 without (95.9-101.9), after the Evals nav click | "Better, or just different? The eval says" | 7 / 4.7 s | 0.3 / 5.7 | `tile1`+`tile2` | chip "Recorded eval" |
| 6 | FEATURE 3b | 53.5-59.5 | per-incident table, 3 trials each (106.6-112.6) | "Five planted incidents, graded in code" | 6 / 4.1 s | 0 / 6 | `evalRow1`..`evalRow5` | |
| 7 | PROOF | 59.5-66.0 | eval section, wide (98.5-105) | 14/15 correct with skills · 10/15 without · 399/401 figures traced + "LLM agents pick the queries · code computes every number · a decision model ranks hypotheses" | | | `evalsHead`+`tile3` | numbers from the recorded eval |
| 8 | END | 66.0-71.0 | end card | "Built for Honeycomb by Haider Bokhari" / "Try it live: the link is in my message" / "haiderb.com" | | | | |

Chapters: The problem 0 · One alert 10.5 · Skills 36 · Evals 47.5. Total 71 s.

## Footage

One take, `flow` (115 s, capture/record.cjs). Marks (media s): alert 6.0 · lanes replay 16.6, first calls 19.7 ·
finding replay 36.0, deploy finding 44.6 · root replay 55.4, root card 68.4 · skills 78.3 · Evals click 95.2,
landed 96.2 · eval table 106.2.

## Cold-viewer test

After 15 s: the hook shows a root-cause statement ("Root cause found before anyone looks"), the what-screen says
agents investigate an SLO burn alert on their own, the problem screen names on-call digging from zero, and the
first hero shot is the burning SLO alert. A stranger can say what it is and what it solves.

## Rules that are easy to break

- No title card, no logo of Honeycomb, no kicker ("STEP 3 · ..."), no stepper, no "If I join" content.
- No internal names or jargon in captions ("a decision model", not the model's name; "pinned to the exact
  words", not "anchored"). Implementation terms go in the proof beat's under-the-hood line only.
- One focal point per shot: zoom the active area so the page shows at >= 1.5x (camera zoom x stage scale) and
  spotlight it (.kit-spot). A wide view of the whole page appears only in the hook or the proof beat.
- Anything the viewer must read is large enough at phone width (check frames at 390 px) or restated in the caption.
- Real page footage only, nothing redrawn. Cut waits. Label speed changes with the rate, example runs and held frames.
- Record at 2x (capture/record.cjs: viewport 1360x765, deviceScaleFactor 2) so zooms stay sharp.

## Footage (fill in after capture)

Takes, what each shows, the media time of every click and of every result (from data/clips/<take>.json marks).

## Cold-viewer test (answer before the final render)

After 15 seconds, could a stranger say what this is and what problem it solves? What on screen tells them?

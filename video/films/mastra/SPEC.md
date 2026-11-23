# SPEC: Mastra launch film (kit 2.1, launch format)

GOAL:    A stranger at Mastra watches about 70 s, sound on or off, on a laptop or a phone. After 15 s they can say
         what this is (agent failures grouped by cause from traces, fixed, re-tested) and what problem it solves
         (nobody has time to read agent traces by hand); by the end they have seen ONE benchmark run end to end, the
         suggested fixes and the rollout gate, and know where to try it. Text carries everything; one instrumental bed.
OUTPUT:  HyperFrames 1920x1080, 30 fps, H.264 + AAC, < 20 MB. Music: bright-pluck-112-long at -20 LUFS, fades 0.3 / 1.5 s.
         Web encode: H.264 CRF 26, faststart -> public/demo-videos/mastra.mp4.
RUN:     example (data-kit-run="example"). Captured 2026-11-21 from a production build of the demo (next start -p 3202)
         opened with the review key. The page replays its own example run (baseline and candidate over 40 cases and
         one suggestion per cluster, recorded through the live routes on 2026-11-21) via its "Replay the benchmark"
         and "Re-run with 5 changes" buttons, clicked by script. No model calls during capture. The replay reveals a
         case every 55 ms (re-run 45 ms); labelled "Example run" on screen.

## Beat table

Clip `flow` (64.7 s, 1x, every hold is real footage). Times in film seconds; media = seconds in flow.mp4.

| # | Beat | Seconds | Picture (media s) | Text on screen | Words / needs | Result lands at / held for | Focus box | Honesty |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | HOOK | 0.0-4.5 | rollout gate card, landed: "Review before promoting", 13 → 27 (60.0-64.5) | "13 → 27 passing, two regressions caught" | 6 / 4.1 s | 0 / 4.5 | `gate` | chip "Example run" |
| 2 | WHAT | 4.5-7.5 | failure clusters + trace, blurred (12.0-15.0) | "Agent failures grouped by cause, then fixed and re-tested." + "A prototype built for Mastra by Haider Bokhari" | 9 / 3 s | | statement | |
| 3 | PROBLEM | 7.5-10.5 | the 40-case grid, mostly red, blurred (5.5-8.5) | "Agents fail quietly, and nobody has time to read traces." | 10 / 3 s | | statement | |
| 4 | HERO 1 | 10.5-16.7 | run card; Replay clicked at 1.18 s, the 40-case grid fills (1.6-7.8) | "Run the support agent on 40 cases" | 7 / 4.7 s | 3.67 / 2.53 | `runCard` | chip "Example run" |
| 4 | HERO 2 | 16.7-22.2 | failure clusters: 8 / 7 / 6 / 5 / 1 (11.0-16.5) | "Failures grouped by cause, read from traces" | 7 / 4.7 s | 0 / 5.5 | `clusterList` | |
| 4 | HERO 3 | 22.2-28.5 | "Bad tool arguments" clicked at 1.22 s: the trace, lookupOrder("10431") failed, its JSON open (17.4-23.7) | "Each trace pinpoints the exact failing call" | 7 / 4.7 s | 1.5 / 4.8 | `traceBox` | |
| 4 | HERO 4 | 28.5-35.0 | checks the trace was graded on (25.6-32.1) | "Graded in code against the expected outcome" | 7 / 4.7 s | 0 / 6.5 | `verdict` | |
| 5 | FEATURE 2a | 35.0-40.5 | bad-arguments suggestion: schema diff (33.3-38.8) | "The LLM proposes one config fix per cause" | 8 / 5.3 s | 0 / 5.5 | `sugBad` | |
| 5 | FEATURE 2b | 40.5-46.0 | memory suggestion: lastMessages 1 → 3 (40.7-46.2) | "Memory window too short? A one-line diff" | 7 / 4.7 s | 0 / 5.5 | `sugMemory` | |
| 6 | FEATURE 3a | 46.0-52.0 | "Re-run with 5 changes" clicked at 1.08 s: candidate grid fills, two cells marked Regressed (49.6-55.6) | "Re-run the same 40 cases with fixes" | 7 / 4.7 s | 3.12 / 2.88 | `candGrid` | chip "Example run" |
| 6 | FEATURE 3b | 52.0-58.5 | rollout gate: "Review before promoting", 13 → 27, 2 regressions (55.5-62.0) | "Better, not just different: 2 regressions caught" | 7 / 4.7 s | 0 / 6.5 | `gate` | |
| 7 | PROOF | 58.5-65.0 | rollout section, wide (58.0-64.5) | 13 → 27 of 40 pass · 5 failure causes · 2 regressions caught + "LLM runs the agent and drafts fixes · code grades, clusters and gates" | | | `rolloutGrid` (wide) | numbers from the recorded run |
| 8 | END | 65.0-70.0 | end card | "Built for Mastra by Haider Bokhari" / "Try it live: the link is in my message" / "haiderb.com" | | | | |

Chapters: The problem 0 · One benchmark 10.5 · Suggestions 35 · Rollout 46. Total 70 s.

## Footage

One take, `flow` (64.7 s, capture/record.cjs). Marks (media s): bench-still 0 · replay click 2.78 · grid full 5.27 ·
traces 10.69 · "Bad tool arguments" click 18.62 · verdict 25.56 · fix-bad 32.99 · fix-memory 40.41 · rollout 47.84 ·
re-run click 50.68 · gate 52.72 · end 64.73.

## Cold-viewer test

After 15 s: the hook shows a rollout gate with "13 → 27" and "Review before promoting" under "13 → 27 passing, two
regressions caught"; the what-screen says agent failures are grouped by cause, then fixed and re-tested; the problem
screen says agents fail quietly and nobody reads traces; the first hero shot runs the agent on 40 cases. A stranger
can say what it is and what it solves.

## Rules that are easy to break

- No title card, no Mastra logo, no kicker, no stepper, no "If I join" content, no model or vendor names.
- One focal point per shot at >= 1.5x; the whole page only in the hook or proof.
- Real page footage only; the example run is labelled; no speed changes (footage plays at 1x).

# SPEC: Ashby launch film (kit 2.1, launch format)

GOAL:    A stranger at Ashby watches 60-75 s, sound on or off, on a laptop or a phone. After 15 s they can
         say what this is and what problem it solves; by the end they have seen ONE real task done and know
         where to try it. Text carries everything (no voice); one instrumental bed sits under it.
OUTPUT:  HyperFrames 1920x1080, 30 fps, H.264 + AAC, < 20 MB. Music: one kit bed (bright-pluck-112-long for
         60-90 s) at -20 LUFS integrated, fades 0.3 / 1.5 s. Web encode: H.264 CRF ~26, faststart.
RUN:     example (data-kit-run="example"). Footage from a production build of the demo (next start -p 3201) opened
         with the review key. The page replays its own recorded runs (three live rediscovery runs and nine drafts,
         recorded through the real routes on 2026-11-21); its "Replay" link is pressed by script. The page replays a
         run that took about 70 s live in about 7 s, so every replayed shot carries "Recorded run, replayed faster".
         The override and the eval are computed in the browser from the recorded runs. No model calls during capture.

## Beat table

Reading time = max(2.5, 0.5 + 0.6 x words). Result hold = max(2.5, 0.5 + 0.3 x words to read), 6 s at most.

| # | Beat | Seconds | Picture (real page footage, clip `flow`) | Text on screen | Words / needs | Result lands at / held for | Focus box | Honesty |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | HOOK | 0.0-4.5 | the "Worth a second look" card just landed: Maya, passed on for level Mar 2023, 3.2 → 6.8 yrs, a highlighted resume line marked new since, Reach out 99% | "Passed on in 2023. Ready now." | 6 / 4.1 s | 0 / 4.5 | `hero` | chip "Example run, recorded" |
| 2 | WHAT | 4.5-7.5 | the shortlist, blurred | "An agent that re-reads every candidate you already met." + "A prototype built for Ashby by Haider Bokhari" | 9 / 3 s | | statement | |
| 3 | PROBLEM | 7.5-10.5 | the job description card, blurred | "Great past candidates get lost in the ATS." | 8 / 3 s | | statement | |
| 4 | HERO 1 | 10.5-16.5 | the role card: replay starts, must-haves and nice-to-haves land, a proxy requirement struck out | "It reads what the new role needs" | 7 / 4.7 s | ~1.1 / ~4.9 | `reqCard` | chip "Recorded run, replayed faster" |
| 4 | HERO 2 | 16.5-23.0 | the shortlist fills: rows land with their verdicts | "Then ranks everyone you have already interviewed" | 7 / 4.7 s | ~2.0 / ~4.5 | `row1`..`row5` | chip "Recorded run, replayed faster" |
| 4 | HERO 3 | 23.0-29.5 | Maya's row is clicked: fit verdict 99% and "Last time": level, 3.2 → 6.8 yrs, old reason 17% | "Too junior in 2023? Not anymore." | 6 / 4.1 s | ~1.5 / ~5 | `fit` + `past` | |
| 4 | HERO 4 | 29.5-36.0 | Maya's evidence: quotes highlighted inside the resume and interview-note lines | "Every match quotes the exact resume line" | 7 / 4.7 s | 0 / 6.5 | `evM1`..`evM3` | |
| 5 | FEATURE 2a | 36.0-41.5 | guardrail checks: no name, school, employer, place or date reaches a model; same shortlist with fields shuffled and gaps closed; the school-prestige line caught | "Blind to names, schools and career gaps" | 7 / 4.7 s | 0 / 5.5 | `guardrails` | |
| 5 | FEATURE 2b | 41.5-47.5 | "HR tech or scheduling" switched to Must: the top five re-rank with arrows | "Make scheduling a must; the list re-ranks" | 7 / 4.7 s | ~1.5 / ~4.5 | `ovN2` + `miniList` | |
| 6 | FEATURE 3a | 47.5-53.5 | right after Eval in the top bar is clicked: tiles, agent precision@10 0.63 vs keyword search 0.27 | "Measured against keyword search, on hand labels" | 7 / 4.7 s | 0 / 6 | `tileAgent`..`tileKeyword` | chip "Recorded runs" |
| 6 | FEATURE 3b | 53.5-59.5 | per-role table: every labelled person found by the agent (A), few by keyword (K) | "All 19 picks found; keyword search found 8" | 8 / 5.3 s | 0 / 6 | `evalTable` | |
| 7 | PROOF | 59.5-66.0 | the eval section, wide | 0.63 vs 0.27 precision@10 · 19/19 picks found · 222 quotes checked + "An LLM reads and cites · code checks quotes and ranks · a decision model gives verdicts" | | | `evalHead` + `evalTable` | numbers from the recorded runs |
| 8 | END | 66.0-71.0 | end card | "Built for Ashby by Haider Bokhari" / "Try it live: the link is in my message" / "haiderb.com" | | | | |

Chapters: The problem 0 · One new role 10.5 · Fairness 36 · The eval 47.5. Total 71 s.

Numbers, from `example.js` (recorded 2026-11-21): precision@10 agent 0.8 / 0.6 / 0.5 (mean 0.63), keyword 0.5 / 0.2 /
0.1 (mean 0.27); labelled people 8 + 6 + 5 = 19, agent top 10s contain 19, keyword top 10s contain 5 + 2 + 1 = 8;
quotes kept 73 + 76 + 73 = 222, dropped 0.

## Rules that are easy to break

- No title card, no logo of Ashby, no kicker, no stepper, no "If I join" content.
- No internal names or jargon in captions; implementation terms only in the proof beat's under-the-hood line.
- One focal point per shot, page at >= 1.5x, spotlight on it; the whole page only in the hook or the proof.
- Real page footage only. Label replays, speed and example runs.

## Footage (filled in after capture)

One take, `flow` (125.2 s, capture/record.cjs, 2026-11-21). Marks (media s): top-replay 1.53 · hero-landed 8.41 ·
reqs-replay 41.31, chips on screen by 42.9 · list-replay 53.08, first row 56.48, run done 59.32 · Maya clicked 66.08 ·
evidence 73.02 · guard 80.98 · override clicked 91.39 · Eval clicked 100.27, landed 101.30 · eval-table 109.26 ·
eval-wide 117.70.

Shots (media start): hook 8.6 · what 60.5 · problem 38.0 · H1 41.6 · H2 57.3 · H3 64.6 · H4 73.3 · F2a 82.0 · F2b 89.9 ·
F3a 101.4 · F3b 110.3 · proof 118.6.

QA: PASS, 0 fail, 1 warn (F2a shown at 1.44x, marked wide on purpose: the five guardrail checks read as one list).
F3a starts after the Eval click: starting before it spotlit the wrong area for 2 s while the page scrolled.

## Cold-viewer test

After 15 s: the hook shows a candidate passed on in 2023 who is now worth a call ("Passed on in 2023. Ready
now."), the what-screen says an agent re-reads every candidate you already met, the problem screen says great
past candidates get lost in the ATS, and the first hero shot shows a role's requirements being read.

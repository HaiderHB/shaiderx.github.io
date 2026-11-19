# SPEC: Stacksync launch film (kit 2.1, launch format)

GOAL:    A stranger at Stacksync (Ruben, the founder; Alexis, the CTO) watches about 70 s, sound on or off, on a
         laptop or a phone. After 10.5 s they can say what this is (an AI agent that syncs CRM deals into the ERP
         safely) and what problem it solves (a wrong field or a retried write corrupts the ERP). By the end they
         have seen ONE deal go from CRM JSON to a checked, routed ERP write, seen the retry that cannot write twice,
         seen a broken deal blocked with reasons and a risky one approved by a person, and know where to try it.
         Text carries everything; no voice.
OUTPUT:  HyperFrames 1920x1080, 30 fps, H.264 + AAC, < 20 MB. Web encode (CRF 26, faststart) committed as
         public/demo-videos/stacksync.mp4. Music: kit bed bright-pluck-112-long, -20 LUFS, fades 0.3 / 1.5 s.
LOOK:    kit 2.1 launch format, accent cobalt (the demo page's accent). Captions 66 px, one line, no kicker; four
         chapter labels over a thin progress bar.
RUN:     example (data-kit-run="example"). Preview mode, no key, no live calls during capture. The page replays its
         recorded runs: the LLM's write plan and the decision model's route for each sample deal were recorded
         live on 2026-11-18; the checks, the field map, the final route and the write run in the browser on the
         same code as the API, the write against an in-tab sample ERP. The plan replays in 0.65 s (7.7 s live).
         Labels on screen: "Recorded run" (hook), "Recorded run, replayed faster" (first hero shot), "Sample ERP,
         simulated" (the write).

## Beat table (as built)

Caption reading time = max(2.5, 0.5 + 0.6 x words). Page shown at = camera zoom x 1.41 (the 1360 px capture on
the 1920 stage). Clip `flow` is one continuous take; media seconds are in brackets. "Lands at" is seconds from the
shot's start (`data-kit-lands`); "held" is how long the finished result then stays; "needs" is
max(2.5, 0.5 + 0.3 x words to read in the result) (`data-kit-read`).

| # | Beat | Film s | Picture (clip flow, media s) | Text on screen | Words / needs / gets | Result lands at / held for (needs) | Focus box, page shown at | Honesty |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | HOOK | 0.0-4.5 | The route card at the top of the page as the clean deal runs again: "Safe to apply", 97%, the bars (2.6-7.1) | "Every field checked. Safe to write." | 6 / 4.1 / 4.5 s | 0.65 s / 3.85 s (not gated in the hook) | `verdictTop` + `bars`, 2.4x | chip "Recorded run" |
| 2 | WHAT | 4.5-7.5 | The top of the page with the verdict, blurred and dimmed (8.0-11.0) | "An AI agent that syncs CRM deals into ERPs, safely." + "A prototype built for Stacksync by Haider Bokhari" | 10 words / 3.0 s | text screen | statement | |
| 3 | PROBLEM | 7.5-10.5 | The broken deal's field map with red rows (no ERP item, EUR vs GBP), blurred (75.2-78.2) | "A wrong field or a retried write corrupts the ERP." | 10 words / 3.0 s | text screen | statement | |
| 4 | HERO 1 | 10.5-17.5 | The field map pinned; Run again pressed off screen; empty, then the plan's CRM -> ERP rows (13.25-20.25) | "An AI model drafts the ERP sales order" | 8 / 5.3 / 7.0 s | 1.0 s / 6.0 s (14 words: 4.7 s) | `mapHead` .. `mapRow5`, 1.55x+ | chip "Recorded run, replayed faster" |
| 4 | HERO 2 | 17.5-24.5 | The checks pinned; eleven checks tick, "11/11 pass" (24.75-31.75) | "Code checks every field before any write" | 7 / 4.7 / 7.0 s | 1.0 s / 6.0 s (18 words: 5.9 s) | `checksHead` .. `checkRow7` | |
| 4 | HERO 3 | 24.5-31.5 | The route card pinned; "Safe to apply", 97% / 3% / 0%, "11 of 11 checks pass · code: all checks passed and the model agrees" (35.45-42.45) | "A decision model scores it: safe to apply" | 8 / 5.3 / 7.0 s | 1.0 s / 6.0 s (9 words: 3.2 s) | `verdict` | |
| 4 | HERO 4 | 31.5-38.5 | The write card pinned: idempotency key `deal-18842107-…`; Apply to ERP clicked at 1.85 s; "201 created SO-10412 · $9,600" (45.05-52.05) | "Written once, under an idempotency key" | 6 / 4.1 / 7.0 s | 2.3 s / 4.7 s (8 words: 2.9 s) | `apply` | chip "Sample ERP, simulated" |
| 4 | HERO 5 | 38.5-45.5 | Replay the retry clicked at 1.85 s: "200 replayed · Already applied with this key: SO-10412, no duplicate sales order" (53.75-60.75) | "A retry? Same key, no duplicate order" | 7 / 4.7 / 7.0 s | 2.3 s / 4.7 s (12 words: 4.1 s) | `apply` | |
| 5 | FEATURE 2 | 45.5-52.5 | The pre-order pilot picked off screen, route card pinned: "Blocked 100%", "TS-300-PRE has no ERP item mapping", "Customer 4877 bills in GBP; plan writes EUR" (65.8-72.8) | "Bad mapping or currency? Blocked, with reasons" | 7 / 4.7 / 7.0 s | 0.95 s / 6.05 s (20 words: 6.0 s) | `verdictTop` .. `reasons`, 2.27x | |
| 6 | FEATURE 3 | 52.5-59.5 | The risky deal's approval card: 45% off MON-ANN, $107,000 vs $50,000 first-order limit; Approve and write clicked at 2.2 s; "Approved · written once as SO-10413" (82.15-89.15) | "New customer, 45% off? A person approves" | 7 / 4.7 / 7.0 s | 2.65 s / 4.35 s (6 words: 2.5 s) | `approval`, 2.4x | |
| 7 | PROOF | 59.5-65.5 | The write card and the ERP, wide: 201 created + 200 replayed, "1 sales order from 2 write requests" (57.2-63.2) | "11/11 checks · 97% safe · 1 order from 2 writes" + "An LLM drafts · code checks · a decision model routes · one key per write" | 6.0 s | | `apply` + `erp`, 1.47x (wide) | numbers are the run's own |
| 8 | END | 65.5-70.5 | End card | "Built for Stacksync by Haider Bokhari" / "Try it live: the link is in my message" / "haiderb.com" | 5.0 s | | | |

Chapters on the progress bar: The problem (0) · One deal (10.5) · Blocked (45.5) · Approval (52.5).

## Footage

One take, `flow` (92.9 s), recorded 2026-11-19 with kit/scripts/capture.cjs at 1360x765 CSS px, 2x device pixels,
cursor 0.75 with idle hide, 450 ms rest before clicks, from `next start -p 3101` on this branch with no demo key.
No live calls. Marks (DOM time, media s; the screencast shows a change ~0.15 s later):

| What | Mark |
| --- | --- |
| Clean deal re-run at the top of the page / verdict landed | 1.22 / 3.09 |
| Field map pinned: run pressed / plan rows landed | 13.42 / 14.10 |
| Checks pinned: run pressed / "11/11 pass" | 24.09 / 25.61 |
| Route pinned: run pressed / verdict landed | 34.46 / 36.32 |
| Apply clicked / 201 created | 46.92 / 47.18 |
| Replay the retry clicked / 200 replayed | 55.59 / 55.89 |
| Broken deal picked / Blocked | 64.73 / 66.59 |
| Broken deal's field map pinned (problem backdrop) | 74.60 |
| Approve and write clicked / approved, written once | 84.34 / 84.62 |

The capture pins the card a shot is about (keeps its top at 84 px while the layout above changes) and presses
"Run again" / picks a deal with a script click (off screen); the two clicks the viewer sees (Apply, Replay the
retry, Approve) are real cursor clicks. Nothing on the page is altered or redrawn; every hold is real footage.

## Cold-viewer test

After 10.5 s a stranger has read "Every field checked. Safe to write." over a card that says "Safe to apply 97%"
with route bars, then "An AI agent that syncs CRM deals into ERPs, safely. A prototype built for Stacksync by
Haider Bokhari", then "A wrong field or a retried write corrupts the ERP." over a field map with red rows. They
can say what it is and what it is for before the first click.

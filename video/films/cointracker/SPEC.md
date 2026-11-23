# SPEC: CoinTracker launch film (kit 2.1, launch format)

GOAL:    A stranger at CoinTracker (Kenan Mesic, Head of Engineering & Product at Nino; Jon Lerner, CEO) watches
         about 69 s, sound on or off, on a laptop or a phone. After 10.5 s they can say what this is (an AI agent that
         prepares a household's tax file) and what problem it solves (you cannot let an agent you cannot check touch
         money). By the end they have seen ONE task: the agent prepares the file, the money moves wait for the
         household, the tax-loss harvest is approved, the broker times out and the retry makes no second order, and
         the action counts as done only when the broker matches. Then two features: the missing 1099-INT handoff that
         resumes mid-run, and the CPA queue. Text carries everything; no voice.
OUTPUT:  HyperFrames 1920x1080, 30 fps, H.264 + AAC. Web encode (CRF 26, faststart) committed as
         public/demo-videos/cointracker.mp4. Music: kit bed bright-pluck-112-long, -20 LUFS, fades 0.3 / 1.5 s.
LOOK:    kit 2.1 launch format, accent iris (the demo page's accent). Captions 66 px, one line, no kicker; four
         chapter labels over a thin progress bar.
RUN:     example (data-kit-run="example"). Preview mode, no key, no live calls during capture. The page replays its
         recorded run: the LLM's typed record and four proposed actions, the decision model's routes and the LLM's
         read of the sample 1099-INT were recorded live on 2026-11-19 through the demo's own API. The checks, the
         code floor ("money never auto-runs"), approvals, the simulated broker (an in-tab store), the retry, the
         verification, the handoff and the CPA sign-off run in the browser on the same code as the API. The agent's
         replay takes 2.2 s (18 s live). Labels on screen: "Recorded run" (hook), "Recorded run, replayed faster"
         (first hero shot), "Simulated broker and timeout" (the approve shot), "Sample file" (the handoff).

## Beat table (as built)

Caption reading time = max(2.5, 0.5 + 0.6 x words). Page shown at = camera zoom x 1.41 (the 1360 px capture on the
1920 stage). Clip `flow` is one continuous take; media seconds are in brackets. "Lands at" is seconds from the shot's
start (`data-kit-lands`, from the capture marks + 0.15 s screencast lag); "held" is how long the finished result then
stays; "needs" is max(2.5, 0.5 + 0.3 x words to read in the result) (`data-kit-read`).

| # | Beat | Film s | Picture (clip flow, media s) | Text on screen | Words / needs / gets | Result lands at / held for (needs) | Focus box, page shown at | Honesty |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | HOOK | 0.0-4.5 | The sell order in the "Your approval" lane, landed: auto-run struck through with a lock, Household 100%, "Money moves, so it never auto-runs." (17.2-21.7) | "Money never moves without your approval." | 6 / 4.1 / 4.5 s | there from frame 0 | `actionSell`, 2.54x | chip "Recorded run" |
| 2 | WHAT | 4.5-7.5 | The top of the page (filing progress, agent, actions), blurred and dimmed (78.6-81.6) | "An AI agent that prepares a household's tax file." + "A prototype built for CoinTracker by Haider Bokhari" | 9 words / 3.0 s | text screen | statement | |
| 3 | PROBLEM | 7.5-10.5 | The sell order waiting for approval and the empty broker panel, blurred (25.2-28.2) | "No one lets an agent they can't check touch money." | 10 words / 3.0 s | text screen | statement | |
| 4 | HERO 1 | 10.5-17.5 | The agent card: "Prepare my 2026 tax file" clicked at 1.0 s; six steps tick; step 6 pauses "Waiting on the household for the 1099-INT" (1.85-8.85) | "It reads the documents and proposes moves" | 7 / 4.7 / 7.0 s | 3.4 s / 3.6 s (10 words: 3.5 s) | `runButton` .. `pausedNote`, 1.6x+ | chip "Recorded run, replayed faster" |
| 4 | HERO 2 | 17.5-24.5 | The sell order card; the agent re-run (pressed off screen); the card lands with Household 100% and the lock line (13.45-20.45) | "Money moves always wait for the household" | 7 / 4.7 / 7.0 s | 3.4 s / 3.6 s (10 words: 3.5 s) | `actionSell` | |
| 4 | HERO 3 | 24.5-31.5 | The approve row and the broker panel, simulated timeout on; "Approve the sell order" clicked at 1.02 s; "504 timed out", then "200 replayed · Same key: ORD-48210 from attempt 1. No second order." (26.7-33.7) | "The broker times out. The retry is safe." | 8 / 5.3 / 7.0 s | 3.47 s / 3.53 s (10 words: 3.5 s) | `approveRow` + `toggle` + `requests` | chip "Simulated broker and timeout" |
| 4 | HERO 4 | 31.5-37.5 | "Replay the retry" clicked at 1.34 s: a third row, 200 replayed, attempt 3 (37.5-43.5) | "Same key again: still one order" | 6 / 4.1 / 6.0 s | 1.74 s / 4.26 s (10 words: 3.5 s) | `requests` + `execButtons` | |
| 4 | HERO 5 | 37.5-44.5 | "Verify it finished" clicked at 1.36 s: one order for this key, lot SOL-3 down by 40, cash in, loss on the books; "Done: the broker matches what was approved." (47.4-54.4) | "Done only when the broker matches" | 6 / 4.1 / 7.0 s | 1.8 s / 5.2 s (15 words: 5.0 s) | `execButtons` + `verify` | |
| 5 | FEATURE 2 | 44.5-51.5 | The request card (sent automatically); "Upload the sample 1099-INT" clicked at 1.03 s; "Resumed at step 6", three checks, interest $1,912 (58.4-65.4) | "Missing form? It asks, then resumes mid-run" | 7 / 4.7 / 7.0 s | 2.13 s / 4.87 s (14 words: 4.7 s) | `askInt` + `resumeResult`, 1.71x | chip "Sample file" |
| 6 | FEATURE 3 | 51.5-58.1 | The CPA queue (switched off screen): the roof card, two treatments; "Sign off" clicked at 1.41 s; "Signed off: Repair (deductible this year)" (69.6-76.2) | "Judgement calls go to the CPA's queue" | 7 / 4.7 / 6.6 s | 1.58 s / 5.02 s (8 words: 2.9 s) | `cpaOptions` + `cpaRow`, 1.91x | |
| 7 | PROOF | 58.1-64.1 | The top of the page after the run, wide: documents 6/7, actions approved 3/4, CPA review 1/1 (78.6-84.6) | "26/26 figures checked · 1 order from 3 sends" + "An LLM reads and proposes · code checks · a decision model routes" | 6.0 s | | `hero`, 1.47x (wide) | numbers are the run's own |
| 8 | END | 64.1-69.1 | End card | "Built for CoinTracker by Haider Bokhari" / "Try it live: the link is in my message" / "haiderb.com" | 5.0 s | | | |

Chapters on the progress bar: The problem (0) · One harvest (10.5) · Handoff (44.5) · CPA (51.5).

## Footage

One take, `flow` (85.6 s), recorded 2026-11-19 with kit/scripts/capture.cjs at 1360x765 CSS px, 2x device pixels,
cursor 0.75 with idle hide, 450 ms rest before clicks, from `next start` of an isolated copy of this branch with no
demo key (Windows, branded Chrome). No live calls. Marks (DOM time, media s; the screencast shows a change ~0.15 s
later):

| What | Mark |
| --- | --- |
| Prepare clicked / step 6 paused | 2.85 / 5.10 |
| Re-run pressed off screen / lanes landed | 13.94 / 16.17 |
| Approve clicked / 504 timed out / 200 replayed | 27.72 / 29.09 / 30.02 |
| Replay the retry clicked / 200 replayed | 38.84 / 39.09 |
| Verify clicked / done | 48.76 / 49.05 |
| Upload clicked / resumed at step 6 | 59.43 / 60.38 |
| Sign off clicked / signed off | 71.01 / 71.03 |
| Top of the page | 78.04 |

The capture pins the card a shot is about and does three set-up presses off screen (re-run the agent for shot 2,
switch on "Simulate a broker timeout", switch to the CPA queue). The clicks the viewer sees (Prepare, Approve, Replay
the retry, Verify, Upload, Sign off) are real cursor clicks. Nothing on the page is altered or redrawn.

## Cold-viewer test

After 10.5 s a stranger has read "Money never moves without your approval." over a sell order whose auto-run option
is struck through and locked, then "An AI agent that prepares a household's tax file. A prototype built for
CoinTracker by Haider Bokhari", then "No one lets an agent they can't check touch money." They can say what it is
and what it is for before the first click.

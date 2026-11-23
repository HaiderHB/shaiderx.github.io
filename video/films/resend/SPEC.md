# SPEC: Resend launch film (kit 2.1, launch format)

GOAL:    A stranger at Resend (the Developer Tools lead, or the founder) watches 60-75 s, sound on or off, on a
         laptop or a phone. After 15 s they can say what this is (an agent that ships an email through MCP-style
         tools, safely) and what problem it solves (agents guess arguments, skip checks and retry sends); by the
         end they have seen ONE real task done and know where to try it. Text carries everything (no voice).
OUTPUT:  HyperFrames 1920x1080, 30 fps, H.264 + AAC, < 20 MB. One kit bed (bright-pluck-112-long) at -20 LUFS.
         Web encode: H.264 CRF 26, faststart -> public/demo-videos/resend.mp4.
RUN:     example (data-kit-run="example"). Recorded 2026-11-21 from a production build (next start -p 3203) opened
         with the review key. The page replays its own recorded run (the launch task, one live run through the real
         route on 2026-11-21) via its Replay link: once clicked on camera, three more times by script with a
         different part of the page in view. No model calls during capture; the replay recomputes every tool result
         in code from the recorded calls. The safety section calls the demo's real broadcast endpoint (free, no
         model). The report shows the two recorded runs (improved and vague tool descriptions, both 2026-11-21).
         Labelled on screen: "Example run", "Example run, recorded 2026-11-21", "Live calls, sandbox", "Recorded runs".

## Beat table (final, QA PASS 0 fail 0 warn)

Times are film seconds; media = seconds in clip `flow`. "Lands" = seconds from the shot start until its result is
fully on screen; it then holds at least max(2.5, 0.5 + 0.3 x words to read).

| # | Beat | Seconds | Picture (clip `flow`, media s) | Caption | Words / needs | Lands / held | Focus | Honesty |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | HOOK | 0-4.5 | the queued broadcast waiting for approval (10.1-14.6), 2.5x | "Launch email, checked, awaiting your approval" | 6 / 4.1 s | 0 / 4.5 | `approval` | chip "Example run" |
| 2 | WHAT | 4.5-7.5 | top of the page, blurred (0.5-3.5) | "An agent that ships your launch email, safely." + "A prototype built for Resend by Haider Bokhari" | 8 / 3 s | | statement | |
| 3 | PROBLEM | 7.5-10.5 | the tool-call log, blurred (5.1-8.1) | "Agents guess arguments, skip checks and retry sends." | 8 / 3 s | | statement | |
| 4 | HERO 1 | 10.5-17 | the task box with the one sentence; Replay clicked at 4.9 s (16.0-22.5) | "One sentence: launch email, tomorrow 9am" | 6 / 4.1 s | 0 / 6.5 | `taskFocus` | chip "Example run, recorded 2026-11-21" |
| 4 | HERO 2 | 17-23 | the email renders from the component tree (39.1-45.1) | "It drafts the email and renders it" | 7 / 4.7 s | 1.75 / 4.25 | `emailTop` | |
| 4 | HERO 3 | 23-30 | lint: unsubscribe link fails (v2), then Fixed in v3, old message struck (60.8-67.8) | "Lint flags a gap; the agent fixes it" | 8 / 5.3 s | 2.98 / 4.02 | `lintHead` + `lintRow3` | |
| 4 | HERO 4 | 30-36.5 | the approval card lands: 1,247 beta users, Sun 22 Nov 2026 09:00 EST, key (82.6-89.1) | "Queued for a person. It never sends alone." | 8 / 5.3 s | 1.83 / 4.67 | `approval` | |
| 5 | FEATURE 2a | 36.5-43.5 | "Queue it, lose the response, retry" clicked at 1.5 s: 201 created, 200 replayed, same bc_ id (93.2-100.2) | "A retry returns the same broadcast" | 6 / 4.1 s | 2.5 / 4.5 | `log` | chip "Live calls, sandbox" |
| 5 | FEATURE 2b | 43.5-49 | "Same key, different time" clicked at 1.1 s: 409 refused (100.4-105.9) | "Same key, different send time: refused" | 6 / 4.1 s | 1.4 / 4.1 | `log` | |
| 6 | FEATURE 3a | 49-55.5 | where the vague run stumbled: the errors as the agent read them and its guesses (115.4-121.9) | "Vague tool descriptions: the agent guesses" | 6 / 4.1 s | 0 / 6.5 | `stumble1`..`stumble3` | chip "Recorded runs" |
| 6 | FEATURE 3b | 55.5-62 | vague against improved: calls 14/10, errors 9/0, retries 9/0, tokens, checks 1/7 vs 7/7 (107.4-113.9) | "Clear ones: zero errors, every check passes" | 7 / 4.7 s | 0 / 6.5 | `compare` | |
| 7 | PROOF | 62-69 | the report heading and stat tiles, wide (107.2-114.2) | 7/7 checks pass · 9 → 0 errors · 1 broadcast, 2 tries + "An LLM picks the tools · code renders, lints and gates every send" | | | `reportHead` + `reportStats` | numbers from the recorded runs and the live endpoint |
| 8 | END | 69-74 | end card | "Built for Resend by Haider Bokhari" / "Try it live: the link is in my message" / "haiderb.com" | | | | |

Chapters: The problem 0 · One email 10.5 · Retries 36.5 · Agent UX 49. Total 74 s.

## Footage

One take, `flow` (124 s, capture/record.cjs). Marks (media s): top 0 · calls 4.5 · hook 9.1 · r1 click 20.9 ·
r2 replay 38.1, preview 40.9 · r3 replay 55.0, lint fail 61.3, lint fixed 63.8 · r4 replay 72.1, approval 84.4 ·
safety 91.4, retry click 94.7, both rows 95.6, conflict click 101.5 · report top 107.2 · report grid 115.2.

Capture notes: a replay empties the workspace; the page now holds the workspace height and turns off scroll
anchoring while a run restarts (both found while capturing: the browser jumped the view to the next section).
The screencast ran at about 5 changed frames a second on the shared machine; every shot is a still hold or a
single result landing, so it reads fine.

## Cold-viewer test

After 15 s: the hook shows a launch email to 1,247 beta users awaiting approval, the what-screen says an agent
ships your launch email safely, the problem screen names agents guessing arguments, skipping checks and retrying
sends, and the first hero shot is the one-sentence task. A stranger can say what it is and what it solves.

## Rules that are easy to break

- No title card, no Resend logo, no kicker, no stepper, no "If I join" content, no model or vendor names.
- One focal point per shot at >= 1.5x; the whole page only in the hook or proof. Real footage only.
- Label example runs, the live endpoint and any held frame or speed change.

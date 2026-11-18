# SPEC: Superhuman launch film (kit 2.1, launch format; re-cut 2026-11-18)

GOAL:    The Superhuman Mail AI engineering manager watches 69 s, sound on or off, on a laptop or a phone. After
         10 s they can say what this is (an AI email agent that only does what you allow) and what problem it
         solves (an agent that can send email can send mistakes). By the end they have seen ONE task done start
         to finish (triage, the reply held at the approval gate, approved), the server refusing what the grant
         does not allow, and the eval suite catching a real failure, and know where to try it. Text carries
         everything; no voice.
OUTPUT:  HyperFrames 1920x1080, 30 fps, H.264 + AAC, < 20 MB. Web encode (CRF 26, faststart) committed as
         public/demo-videos/superhuman.mp4. Music: kit bed bright-pluck-112-long, its own ending on the last
         frame, -20 LUFS integrated, fades 0.3 / 1.5 s.
TIME:    68.8 s, 8 scenes, the hero task + 2 features (permissions, evals).
LOOK:    kit 2.1 launch format, accent iris #8e78ff (the demo page's accent). Captions 68 px, one line, no kicker;
         four chapter labels over a thin progress bar. No Superhuman logo anywhere (the page shows none).
RUN:     example (data-kit-run="example"). Preview mode, no key, no live calls during capture: the page replays its
         recorded live runs. The model turns and the judge's answers were recorded from live runs on the Vercel
         preview on 2026-11-17 with the demo key (DeepSeek V3.2 via fal, Jev); the page re-runs every tool call,
         gate decision, inbox change and eval check in the browser. The triage run took 96 s live and replays in
         about 11 s ("Example run, replayed faster" on screen); the eval section is the recorded eval run of all
         eight tasks ("Recorded eval run").

## Why it was re-cut (Haider, 2026-11-18; now kit 2.1 rules)

1. "It stays on the title screens way too long": the two text screens ran 6.5 s and 5.9 s. They now run 3 s each
   (4.2-7.2, 7.2-10.2).
2. "As soon as the agent replies the next frame we are onto the next part ... no time to read the response": the
   first cut spent its seconds on the stream (the calls arriving) and cut within a second or two of the result.
   Every hero / feature shot now follows the result rule: the wait before the result is cut to under 1.7 s, and
   once the result is fully on screen it stays max(2.5, 0.5 + 0.3 x the words to read in it) s, 6 s at most. The
   take was re-recorded with a real hold after every result (5.6-7.8 s of still page), so no frame is frozen.

## Beat table (as built)

Caption reading time = max(2.5, 0.5 + 0.6 x words), never over 7 s. Result hold = max(2.5, 0.5 + 0.3 x words to
read in the result), 6 s at most. Page shown at = camera zoom x 1.41 (the 1360 px capture on the 1920 stage).
Clip `main` is one continuous take; media seconds in brackets.

| # | Beat | Film s | Picture (clip main, media s) | Text on screen | Words / needs / gets | Result lands at / held for (words read, needs) | Focus box, page shown at | Honesty |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | HOOK | 0.0-4.2 | The approval gate: "Send waiting for your approval" on the agent's reply to the outage; the judge's scores and Approve / Reject land at 0.6-0.7 s, then hold (29.2-33.4) | "Inbox triaged. Nothing sends without you." | 6 / 4.1 / 4.2 s | 0.7 s / 3.5 s (hook: not gated) | `approval`, 1.7x | chip "Example run, replayed faster" |
| 2 | WHAT IT IS | 4.2-7.2 | The workspace while the agent works, blurred and dimmed (23.4-26.4) | "An AI email agent that only does what you allow." + "A prototype built for Superhuman by Haider Bokhari" | 10 / 3 s | | statement | |
| 3 | PROBLEM | 7.2-10.2 | The untouched inbox, an empty tool-call log and an empty gate as the replay starts, blurred (18.5-21.5) | "An agent that can send email can send mistakes." | 9 / 3 s | | statement | |
| 4 | HERO 1 | 10.2-15.5 | The task card (triage task, full access): the cursor comes to rest, Run the agent is pressed at 1.15 s; the button reads "Running" (2.0-7.3) | "Triage the inbox and answer what's urgent" | 7 / 4.7 / 5.3 s | 1.5 s / 3.8 s (1 word, needs 2.5). The 16-word task sentence is on screen from the first frame, all 5.3 s (it would need 5.3) | `taskText` as it is before the click, 2.6x | chip "Example run, replayed faster". The page's 19-word replay notice lands under the lit box, dimmed: it is not counted as reading; the chip says the same thing |
| 4 | HERO 2 | 15.5-22.2 | The MCP tool-call log as the run ends: the last pending row goes at 0.7 s, then the finished log is still: apply_label (act, allowed) x2, draft_reply (draft, allowed), send (act, awaiting approval) (28.6-35.3) | "It labels, drafts, then asks to send" | 7 / 4.7 / 6.7 s | 0.7 s / 6.0 s (42 words, needs 6.0) | `callLog`, 1.6x | the same recorded run, replayed with the workspace in view |
| 4 | HERO 3 | 22.2-28.2 | The approval gate: the held reply to Priya, "Grounded 93% · Answers the ask 95%", Approve and send / Reject; still (29.95-35.95) | "Its reply stops here, with a fact-check score" | 8 / 5.3 / 6.0 s | 0 s / 6.0 s (65 words, needs 6.0) | `approval`, 1.7x | the same seconds of still page as hero 2, framed on the gate |
| 4 | HERO 4 | 28.2-32.9 | Approve and send is pressed at 1.17 s; the card turns "Approved · sent (sample inbox only)" (38.7-43.4) | "Nothing is sent until you approve it" | 7 / 4.7 / 4.7 s | 1.35 s / 3.35 s (5 words, needs 2.5) | `approval`, 1.7x | the page says sends stay in the sample inbox |
| 5 | FEATURE 2a | 32.9-39.0 | The permission card: Read + draft is pressed at 1.23 s; the act tools lock and are struck through (51.9-58.0) | "Narrow its access to read and draft" | 7 / 4.7 / 6.1 s | 1.65 s / 4.45 s (13 words, needs 4.4) | `taskGrant`, 2.8x | |
| 5 | FEATURE 2b | 39.0-45.8 | The "Archive newsletters" run as it ends: the last blocked call lands at 0.25 s, the pending row goes at 0.8 s, then the finished log is still: apply_label (act, blocked) x3, each with the server's reason (66.9-73.7) | "The server blocks every change it tries" | 7 / 4.7 / 6.8 s | 0.8 s / 6.0 s (57 words, needs 6.0) | `callLog`, 1.6x | chip "Example run, replayed faster"; the page's recorded run of that task (69 s live) |
| 6 | FEATURE 3a | 45.8-51.8 | The eval summary tiles, still: 4 / 8 tasks passed, 0 out-of-scope calls ran (11 refused), 0 sent without approval (3 held), 73% grounded (76.6-82.6) | "Eight test tasks grade every change" | 6 / 4.1 / 6.0 s | 0 s / 6.0 s (41 words, needs 6.0) | `evalStats`, 2.8x | chip "Recorded eval run" |
| 6 | FEATURE 3b | 51.8-57.8 | Task 6 (bank-details scam), open, still: "Drafts or sends on the scam: none expected, 2 actual" fails (88.3-94.3) | "They caught a reply drafted to a scam" | 8 / 5.3 / 6.0 s | 0 s / 6.0 s (91 words, needs 6.0) | `eval6`, 1.6x | the recorded eval run's own result; the task was opened 0.6 s before the shot starts (the click is cut: with it the shot would run past the 7 s a caption may stay) |
| 7 | PROOF | 57.8-63.8 | The eval section, wide, still (96.6-102.6) | "8 test tasks · 0 out-of-scope calls · 0 unapproved sends" + "An LLM calls MCP-style tools · the server enforces scopes · a decision model grades replies" | 9 / 5.9 / 6.0 s | | `evalStats`, 1.41x (wide) | the numbers are the recorded eval run's tiles |
| 8 | END | 63.8-68.8 | End card | "Built for Superhuman by Haider Bokhari" / "Try it live: the link is in my message" / "haiderb.com" | 5.0 s | | | |

Chapters on the progress bar: The problem (0) · The task (10.2) · Permissions (32.9) · Evals (45.8).

## How the words were counted

Every word the lit box asks the viewer to read once the result is there (numbers, tool names and addresses count
as words; row numbers and the "RESULT" disclosure labels do not).

- Hero 1: "Running" (1). The task sentence (16 words) is not a result; it is there from the first frame.
- Hero 2: the four full rows of the log: tool, scope, status and arguments: 8 + 7 + 21 + 6 = 42.
- Hero 3: the whole card: status line 5, subject 7, To 4, Draft 4, the reply 34, the scores 7, the buttons 4 = 65.
- Hero 4: "Approved · sent (sample inbox only)" (5); the rest of the card was read in hero 3.
- Feature 2a: the selected grant (2) and the three scope rows (4 + 2 + 5) = 13.
- Feature 2b: three full blocked rows, each tool, scope, status (3), arguments (4) and the server's reason (12) = 57.
- Feature 3a: the four tiles: 8 + 11 + 9 + 13 = 41.
- Feature 3b: the open task: its header 18, the expected line 13, the table 39, the judge and trace lines 21 = 91.

Five of the eight results are over the 6 s cap, so they hold the full 6 s.

## What changed from the first cut, and why

- Hero 2 used to show the calls streaming (reads, then labels) and cut 1.3 s before the send landed. It now shows
  the end of the run and the finished log, held 6 s, and its caption says what those rows say ("It labels, drafts,
  then asks to send" instead of "It reads first, then labels and flags").
- Hero 3 used to open on an empty gate and wait 0.9 s for the card, 3.0 s for the scores. It now opens on the
  finished card.
- Feature 3b no longer shows the click that opens task 6: still + click + a 6 s hold is 7.2 s, more than a caption
  may stay. The task is open when the shot starts.
- The film is 0.5 s shorter (68.8 s, was 69.3): 6.4 s came off the two text screens and went into the holds.

## Footage

One take, `main` (104.0 s), recorded 2026-11-18 with kit/scripts/capture.cjs at 1360x765 CSS px, 2x device pixels
(frames 2720x1530), cursor 0.75 with idle hide, 450 ms rest before clicks, from an isolated `next start -p 3162`
copy of the branch with no demo key (preview mode). No live calls. The capture script holds the page still after
every result (see capture/record.cjs).

- Media seconds (DOM marks; the footage shows each change 0.05-0.2 s later, and the shots are set on the footage):
  Run the agent pressed 3.15, "Running" on screen 3.5, still to 8.8; Replay pressed 18.23; the send row 27.31 (on
  screen 27.85); the log's pending row gone 29.27; the gate's scores 29.8 and buttons 29.87; still to 38.3;
  Approve and send 39.87, "Approved" on screen 40.05, still to 43.9; Read + draft pressed 53.13, the act row
  locked 53.3, the selection settled 53.55, still to 59.0; first blocked call 64.03, the tenth 66.85 (on screen
  67.15), the pending row gone 67.7, still to 75.3; the eval tiles in view and still 76.4-84.0; task 6 opened
  87.67, open and still 88.1-95.4; the eval section from its heading, still, 96.3-104.0.
- Hero 2 and hero 3 use overlapping seconds of the same still page (29.95-35.3), framed on different cards.
- Feature 3a and the proof are the same still view of the eval section, recorded before and after task 6.
- Every hold is real footage: no speed changes, no freeze frames.

## Cold-viewer test

After 10.2 s a stranger has read: "Inbox triaged. Nothing sends without you." over a reply waiting for approval,
"An AI email agent that only does what you allow. A prototype built for Superhuman by Haider Bokhari", and "An
agent that can send email can send mistakes." They can say what it is and what it is for before the first click.

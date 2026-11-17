# SPEC: Superhuman launch film (kit 2, launch format)

GOAL:    The Superhuman Mail AI engineering manager watches 70 s, sound on or off, on a laptop or a phone. After
         17 s they can say what this is (an AI email agent that only does what you allow) and what problem it
         solves (an agent that can send email can send mistakes). By the end they have seen ONE task done start
         to finish (triage, the reply held at the approval gate, approved), the server refusing what the grant
         does not allow, and the eval suite catching a real failure, and know where to try it. Text carries
         everything; no voice.
OUTPUT:  HyperFrames 1920x1080, 30 fps, H.264 + AAC, < 20 MB. Web encode (CRF 26, faststart) committed as
         public/demo-videos/superhuman.mp4. Music: kit bed bright-pluck-112-long, its own ending on the last
         frame, -20 LUFS integrated, fades 0.3 / 1.5 s.
TIME:    69.3 s, 8 scenes, the hero task + 2 features (permissions, evals).
LOOK:    kit 2 launch format, accent iris #8e78ff (the demo page's accent). Captions 68 px, one line, no kicker;
         four chapter labels over a thin progress bar. No Superhuman logo anywhere (the page shows none).
RUN:     example (data-kit-run="example"). Preview mode, no key, no live calls during capture: the page replays its
         recorded live runs. The model turns and the judge's answers were recorded from live runs on the Vercel
         preview on 2026-11-17 with the demo key (DeepSeek V3.2 via fal, Jev); the page re-runs every tool call,
         gate decision, inbox change and eval check in the browser. The triage run took 96 s live and replays in
         about 11 s ("Example run, replayed faster" on screen); the eval section is the recorded eval run of all
         eight tasks ("Recorded eval run").

## Beat table (as built)

Reading time = max(2.5, 0.5 + 0.6 x words). Page shown at = camera zoom x 1.41 (the 1360 px capture on the 1920
stage). Clip `main` is one continuous take; media seconds in brackets.

| # | Beat | Film s | Picture (clip main, media s) | Text on screen | Words / needs / gets | Focus box, page shown at | Honesty |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | HOOK | 0.0-4.2 | The approval gate: "Send waiting for your approval" on the agent's reply to the outage; the judge's scores and Approve / Reject land at 1.7 s (28.1-32.3) | "Inbox triaged. Nothing sends without you." | 6 / 4.1 / 4.2 s | `approval`, 1.7x | chip "Example run, replayed faster" |
| 2 | WHAT IT IS | 4.2-10.7 | The workspace while the agent works, blurred and dimmed (21.0-27.5) | "An AI email agent that only does what you allow." + "A prototype built for Superhuman by Haider Bokhari" | 10 / 6.5 / 6.5 s | statement | |
| 3 | PROBLEM | 10.7-16.6 | The untouched inbox, an empty tool-call log and an empty gate as the replay starts, blurred (18.7-24.6) | "An agent that can send email can send mistakes." | 9 / 5.9 / 5.9 s | statement | |
| 4 | HERO 1 | 16.6-21.9 | The task card (triage task, full access); Run the agent is pressed at 2.7 s; "Running" and the page's replay notice (0.6-5.9) | "Triage the inbox and answer what's urgent" | 7 / 4.7 / 5.3 s | `taskText`, 2.6x | the page's notice says it replays the recorded live run |
| 4 | HERO 2 | 21.9-27.2 | The MCP tool-call log: list_threads, four read_thread calls, then apply_label calls, each "allowed" (20.6-25.9) | "It reads first, then labels and flags" | 7 / 4.7 / 5.3 s | `callLog`, 1.6x | chip "Example run, replayed faster"; the same recorded run replayed with the workspace in view |
| 4 | HERO 3 | 27.2-32.5 | The approval gate fills: the held reply, then "Grounded 93% · Answers the ask 95%" and the buttons (27.2-32.5) | "Its reply stops here, with a fact-check score" | 8 / 5.3 / 5.3 s | `approval`, 1.7x | |
| 4 | HERO 4 | 32.5-37.8 | Approve and send is pressed at 2.7 s; the card turns "Approved · sent (sample inbox only)" (33.1-38.4) | "Nothing is sent until you approve it" | 7 / 4.7 / 5.3 s | `approval`, 1.7x | the page says sends stay in the sample inbox |
| 5 | FEATURE 2a | 37.8-42.8 | The permission card: Read + draft is pressed at 2.4 s; the act tools lock and are struck through (46.3-51.3) | "Narrow its access to read and draft" | 7 / 4.7 / 5.0 s | `taskGrant`, 2.8x | |
| 5 | FEATURE 2b | 42.8-47.8 | The "Archive newsletters" run: archive and apply_label calls land "blocked", each with the server's reason (55.7-60.7) | "The server blocks every change it tries" | 7 / 4.7 / 5.0 s | `callLog`, 1.6x | the page's recorded run of that task (69 s live) |
| 6 | FEATURE 3a | 47.8-52.5 | The eval summary tiles: 4 / 8 tasks passed, 0 out-of-scope calls ran (11 refused), 0 sent without approval (3 held), 73% grounded (78.3-83.0) | "Eight test tasks grade every change" | 6 / 4.1 / 4.7 s | `evalStats`, 2.8x | chip "Recorded eval run" |
| 6 | FEATURE 3b | 52.5-57.8 | Task 6 (bank-details scam) is opened at 2.4 s: "Drafts or sends on the scam: none expected, 2 actual" fails (69.9-75.2) | "They caught a reply drafted to a scam" | 8 / 5.3 / 5.3 s | `eval6`, 1.6x | the recorded eval run's own result |
| 7 | PROOF | 57.8-64.3 | The eval section, wide (78.3-84.8) | "8 test tasks · 0 out-of-scope calls · 0 unapproved sends" + "An LLM calls MCP-style tools · the server enforces scopes · a decision model grades replies" | 9 / 5.9 / 6.5 s | `evalStats`, 1.41x (wide) | the numbers are the recorded eval run's tiles |
| 8 | END | 64.3-69.3 | End card | "Built for Superhuman by Haider Bokhari" / "Try it live: the link is in my message" / "haiderb.com" | 5.0 s | | |

Chapters on the progress bar: The problem (0) · The task (16.6) · Permissions (37.8) · Evals (47.8).

## What changed from the suggested story, and why

- The hero task is "Triage my inbox: label what's urgent, then reply to the most urgent email and send it."
  The first draft, "Triage my inbox and reply to anything urgent", made DeepSeek draft one reply per turn and
  run out of turns before any send, so there was no held send to show.
- Feature 3 shows a failing eval on purpose: it is the recorded run's own result (task 6: the agent flagged
  the scam and still drafted and queued a reply to it; the gate held the send). "Eight test tasks grade every
  change" over 4 / 8 is honest: the suite's job is to catch this.
- No internal names in captions ("a fact-check score", "the server"); "LLM", "MCP-style" and "a decision model"
  appear only in the proof beat's under-the-hood line.

## Footage

One take, `main` (85.0 s), recorded 2026-11-17 with kit/scripts/capture.cjs at 1360x765 CSS px, 2x device pixels
(frames 2720x1530), cursor 0.75 with idle hide, 450 ms rest before clicks, from an isolated `next start -p 3162`
copy of the branch with no demo key (preview mode). No live calls.

- Media seconds: Run the agent pressed 3.34; the workspace in view, Replay pressed 18.54 (held send 27.62, run
  done and judged 29.74); Approve and send 35.79; the archive task picked 42.34, grant set back to full 44.31
  (both cut), Read + draft pressed 48.66; Run 52.87 (cut), first blocked call 56.63, run done 60.35; the eval
  section 65.5, task 6 opened 72.27; the eval section from its heading 77.4-85.0.
- The triage example is replayed twice in the take (Run in the task card, then Replay with the workspace in
  view): hero 1 is the first, hero 2-4 the second. Hero 2 and 3 use overlapping media seconds of that one replay,
  framed on different cards; the order on screen is the order the page shows them.
- Feature 3a uses footage from the end of the take (the tiles are only fully in view from the section heading);
  the proof uses the same seconds, wide.
- Every hold is real footage: no speed changes, no freeze frames.

## Cold-viewer test

After 16.6 s a stranger has read: "Inbox triaged. Nothing sends without you." over a reply waiting for approval,
"An AI email agent that only does what you allow. A prototype built for Superhuman by Haider Bokhari", and "An
agent that can send email can send mistakes." They can say what it is and what it is for before the first click.

# SPEC: GoodTime launch film v2 (kit 2, launch format)

GOAL:    A stranger at GoodTime watches 70 s, sound on or off, on a laptop or a phone. After 17 s they can say
         what this is (an AI agent that repairs interview schedules when plans change) and what problem it
         solves (one sick interviewer can break a whole interview day). By the end they have seen ONE repair
         done start to finish, know a person can override or undo it and that every action is logged, have
         seen the candidate ask for a change in chat and the agent replan, and know where to try it. Text
         carries everything; no voice.
OUTPUT:  HyperFrames 1920x1080, 30 fps, H.264 + AAC, < 20 MB. Web encode (CRF 26, faststart) committed as
         public/demo-videos/goodtime.mp4. Music: kit bed bright-pluck-112-long, its own ending on the last
         frame, -20 LUFS integrated, fades 0.3 / 1.5 s.
TIME:    69.7 s, 8 scenes, 3 features (the repair, the person in charge, the candidate chat).
LOOK:    kit 2 launch format, accent cobalt #6896ff (the demo page's accent). Captions 66 px, one line, no
         kicker; four chapter labels over a thin progress bar.
RUN:     example (data-kit-run="example"). Preview mode, no keys, no live calls: the page replays its recorded
         example run of the "Out sick" message. The model outputs in it (the LLM's tool calls, the decision
         model's answer, the drafted text) were recorded from live runs on the Vercel preview on 2026-11-16
         (12.4 s live); the page replays them faster (about 5 s) and computes every tool call, rule check,
         hold and calendar change in the browser with the same code the API runs. The page labels it
         "Example run"; the film labels it "Example run, replayed faster".

## Beat table (as built)

Reading time = max(2.5, 0.5 + 0.6 x words). Page shown at = camera zoom x 1.41 (the 1360 px capture on the 1920 stage).
Clip `rescue` is one continuous take; media seconds are in brackets.

| # | Beat | Film s | Picture (clip rescue, media s) | Text on screen | Words / needs / gets | Focus box, page shown at | Honesty |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | HOOK | 0.0-4.2 | The page's loop card: "Loop at risk" (the dropped interviewer's chip red) flips to "Loop rescued" at 0.8 s; "Repair time 12.43 s" lands at 1.6 s; hold (4.75-8.95) | "Interview loop rescued in 12 seconds" | 6 / 4.1 / 4.2 s | `glance`, 1.8x | chip "Example run, replayed faster"; 12 seconds = the live run's 12.4 s, which the card shows as "Repair time" |
| 2 | WHAT IT IS | 4.2-10.7 | The top of the page while the example replays, blurred 10 px and dimmed (0.4-6.9) | "An AI agent that repairs interview schedules when plans change." + "A prototype built for GoodTime by Haider Bokhari" | 10 / 6.5 / 6.5 s | statement | |
| 3 | PROBLEM | 10.7-16.7 | The candidate's calendar with the dropped interview in red, blurred 5 px and dimmed (11.29-17.29) | "One sick interviewer can break a whole interview day." | 9 / 5.9 / 6.0 s | statement | the "before" picture is the page with the repair undone (Undo last change), which shows the loop at risk |
| 4 | HERO 1 | 16.7-22.0 | The interviewer's message; Run the agent is pressed at 19.11; the page's preview notice is on screen from 19.45 (18.55-23.85) | "An interviewer calls in sick. Run the agent." | 8 / 5.3 / 5.3 s | `messageCard`, 1.6x | the notice on the page says it replays the recorded example |
| 4 | HERO 2 | 22.0-27.3 | Two steps of the agent run land at 23.4 and 23.7: "4 qualified, 2 filtered out", then "1 of 4 pass: Wei Zhang"; hold (34.35-39.65) | "It checks every backup: calendars, time zones, load" | 8 / 5.3 / 5.3 s | `stepFind` + `stepCheck`, 2.7x | chip "Example run, replayed faster"; the same example, replayed again with these steps in view |
| 4 | HERO 3 | 27.3-32.6 | The calendar: system design is red ("out sick"), then Wei takes the same slot at 28.9; hold (24.08-29.38) | "It picks the smallest fix: swap the interviewer" | 8 / 5.3 / 5.3 s | `strip`, 2.0x | the replay started by the click in hero 1 |
| 4 | HERO 4 | 32.6-37.3 | "Drafting…", then the messages at 33.4: the candidate's (Email + SMS) and the new interviewer's (Slack); hold (47.32-52.02) | "It drafts a message for everyone affected" | 7 / 4.7 / 4.7 s | `draft1` + `draft2`, 2.75x | the same example, replayed again with the drafts in view; the page marks them "not sent" |
| 5 | FEATURE 2a | 37.3-42.3 | The applied repair and the three repairs the agent weighed; "Override: apply this instead" is pressed at 39.84; the applied repair changes and is tagged "your override" (52.79-57.79) | "Disagree? Override the agent in one click" | 7 / 4.7 / 5.0 s | `final` + `options`, 2.0x | |
| 5 | FEATURE 2b | 42.3-47.3 | The audit trail, six entries; Undo last change is pressed at 44.78; a seventh entry says so (60.17-65.17) | "Undo any change. Every action is logged." | 7 / 4.7 / 5.0 s | `auditHead` + `auditList`, 1.8x | |
| 6 | FEATURE 3a | 47.3-52.9 | The candidate's message in the chat; the two moves land at 49.7 and the agent's one-line reply by 50.3 (68.48-74.08) | "A candidate asks for Thursday. The agent replans." | 8 / 5.3 / 5.6 s | `thread`, 2.7x | the page's recorded chat turn (it plays when the chat comes into view) |
| 6 | FEATURE 3b | 52.9-58.2 | The calendar: coding and the hiring manager round move to Thursday at 54.3 (69.34-74.64) | "The manager round moves too, to stay last" | 8 / 5.3 / 5.3 s | `strip`, 2.0x | same footage as 3a, the calendar beside the chat |
| 7 | PROOF | 58.2-64.7 | The top of the page, wide: the headline and the loop card with the run's numbers (77.64-84.14) | "12 s repair time · 7 tool calls · 35/35 rule checks" + "An LLM reads and writes · code checks every rule · a decision model picks the repair" | 9 / 5.9 / 6.5 s | `hero`, 1.5x (wide) | the three numbers are the loop card's own: Repair time 12.54 s in this replay, Tool calls 7, Rule checks 35/35 |
| 8 | END | 64.7-69.7 | End card | "Built for GoodTime by Haider Bokhari" / "Try it live: the link is in my message" / "haiderb.com" | 5.0 s | | |

Chapters on the progress bar: The problem (0) · The rescue (16.7) · You decide (37.3) · Candidate chat (47.3).

## What changed from the suggested story, and why

- Feature order: "override or undo, every action logged" comes before the candidate chat. On the page, overrides
  lock once the candidate has changed the loop, so the film order is the order the page allows: repair, override,
  undo, then the chat. The whole film is one page session in that order.
- "It checks every backup: calendars, time zones, load" instead of "every replacement ... workload": the longer
  line does not fit on one line at caption size. "Backup" is the page's own word ("Only one backup, at her cap").
- The pick and the calendar are one shot ("It picks the smallest fix: swap the interviewer" over the calendar):
  the probabilities of the three repairs are on screen in the override shot instead.
- "Nothing changes for the candidate" is not a caption: the drafted message to the candidate says it on screen
  ("still on Wed, Nov 18, 12:00-1:00 PM EST. All other times are unchanged").
- No internal names in captions: "the agent", "a decision model". The page's own labels ("Jev 65%", tool names)
  are visible inside the zoomed cards; they are the real UI.

## Footage

One take, `rescue` (84.9 s), recorded 2026-11-17 with kit/scripts/capture.cjs at 1360x765 CSS px, 2x device pixels
(frames 2720x1530), cursor 0.75 with idle hide, 450 ms rest before clicks, from an isolated `next start -p 3171`
copy of the branch with no demo key (preview mode). No live calls. The page is one session from start to end, in
the order the page allows; the film uses it in the same order.

- The page is long and its cards change height while a run plays, so the capture script pins the card a shot is
  about: it keeps that card's top at a fixed height in the window by scrolling the page when the layout above it
  changes. Nothing on the page is altered.
- Media seconds: hook replay 0.91 (at risk 2.48, rescued 5.38, drafts done 6.12); the repair undone, held
  10.5-18.1; Run the agent pressed 20.96 (at risk 22.58, rescued 25.48, done 26.24); replay with the two steps
  pinned 32.75 (the steps land 35.57 and 35.82, done 38.11); replay with the drafts pinned 42.42 (drafts 47.75);
  override pressed 55.33; undo pressed 62.65; chat in view 67.97 (the candidate's message 68.08, the moves 70.45,
  the reply 71.2); the top of the page 76.7-84.9.
- The example is replayed four times in the take (hook, run, checks, drafts): the page finishes a replay in about
  5 s, so one replay cannot hold on the steps, the calendar and the drafts in turn. Every replay is the same
  recorded run; only the tool times measured in the browser differ (Repair time read 12.39-12.54 s across them;
  the recorded model time is 12.26 s of it).
- Every hold in the film is real footage: no speed changes, no freeze frames. The footage shows each change about
  0.15-0.3 s after its DOM time, so shots and spotlight boundaries are placed on what the footage shows (checked on
  frames).

## Cold-viewer test

After 16.7 s a stranger has read: "Interview loop rescued in 12 seconds", "An AI agent that repairs interview
schedules when plans change. A prototype built for GoodTime by Haider Bokhari", and "One sick interviewer can
break a whole interview day", over a card that goes from "Loop at risk" to "Loop rescued", the product, and a
calendar with a red interview. They can say what it is and what it is for before the first click.

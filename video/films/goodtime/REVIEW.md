# Review: GoodTime launch film v2 (launch format)

Rebuilt on kit 2 after Haider's notes on v1: too fast, hard to know where to look, straight into the UI
without saying what the product is or what problem it solves. v1 was 44.7 s, six steps on a stepper, the whole
page on screen and captions about mechanics ("Jev picks the repair with probabilities"). v2 is 69.7 s in the
launch format; the beat table is in SPEC.md.

## What it shows (69.7 s, kit 2.0.0, accent cobalt)

| Film s | Beat | Text on screen |
| --- | --- | --- |
| 0.0-4.2 | Hook: the page's loop card flips from "Loop at risk" to "Loop rescued", shown at 1.8x | Interview loop rescued in 12 seconds |
| 4.2-10.7 | What it is, over the top of the page, blurred | An AI agent that repairs interview schedules when plans change. / A prototype built for GoodTime by Haider Bokhari |
| 10.7-16.7 | Problem, over the calendar with the dropped interview in red | One sick interviewer can break a whole interview day. |
| 16.7-22.0 | Hero 1: the interviewer's message; Run the agent is pressed | An interviewer calls in sick. Run the agent. |
| 22.0-27.3 | Hero 2: two steps land: 4 qualified, then 1 of 4 passes every check | It checks every backup: calendars, time zones, load |
| 27.3-32.6 | Hero 3: the calendar: the red interview becomes "Design · Wei, was Priya" | It picks the smallest fix: swap the interviewer |
| 32.6-37.3 | Hero 4: the drafted messages arrive | It drafts a message for everyone affected |
| 37.3-42.3 | Feature 2a: another valid repair is applied with "Override: apply this instead" | Disagree? Override the agent in one click |
| 42.3-47.3 | Feature 2b: Undo last change in the audit trail | Undo any change. Every action is logged. |
| 47.3-52.9 | Feature 3a: the candidate's message, the agent's reply and the two moves | A candidate asks for Thursday. The agent replans. |
| 52.9-58.2 | Feature 3b: the calendar: coding and the manager round move to Thursday | The manager round moves too, to stay last |
| 58.2-64.7 | Proof: the top of the page, wide | 12 s repair time · 7 tool calls · 35/35 rule checks / An LLM reads and writes · code checks every rule · a decision model picks the repair |
| 64.7-69.7 | End card | Built for GoodTime by Haider Bokhari / Try it live: the link is in my message / haiderb.com |

Chapters on the progress bar: The problem · The rescue · You decide · Candidate chat.

## QA (kit/scripts/qa.mjs, launch rules)

- Static: PASS, 0 fail, 0 warn. 69.70 s; beats hook, what, problem, hero, feature, feature, proof, end, in order;
  10 launch cues, each one line at 66 px (hook 72 px), on screen >= its reading time and <= 7 s; 4 chapters;
  hero and feature shots show the page at 1.6-2.7x, the hook at 1.8x, the proof at 1.5x; 10 camera shots and
  13 spotlights inside the safe area; no camera move under a caption; run "example", labelled on screen.
- Render (qa.mjs --video): H.264 1920x1080 30 fps + AAC, 69.70 s, 7.5 MB; -20.0 LUFS integrated, true peak
  -6.2 dBTP; fade-in and a fade-out landing on the last frame. Web encode (CRF 26, faststart):
  public/demo-videos/goodtime.mp4, 3.2 MB.
- HyperFrames check: 0 errors; kept warnings as in the pilot film: timeline_track_too_dense (captions host,
  hero scene), nested_media_start_basis_ambiguous (starts are composition-local).

## Review loop

- Stills: four passes over the composition (35, 35, 33 and 23 frames: every 3.4 s, every seam, then the moments
  around cuts, clicks and spotlight changes), 33 frames of the first render around every cut and click, 36 frames
  stepped 1/15 s across the moments where a lit box changes size, then the final render's contact sheet.
- Fixed from the stills: the checks caption was wider than one line (reworded, captions at 66 px like the
  pilot); pressing Run the agent showed nothing in the message card (a page bug, fixed, see below); the page's
  headline was sliced beside the hook's card (dimmed almost out); the problem's backdrop was the whole section
  (now the calendar, close); lit boxes covered rows that had not landed yet in the checks, drafts and chat shots
  and the next card's header before the notice appeared (each is now two spotlights, switched on the frame
  where the footage shows the change); the drafts shot opened on 1.5 s of an empty card (now 0.7 s).
- Phone check: twelve frames shrunk to 390 px wide. Every caption, the hook's "Loop at risk / Loop rescued",
  both statements, the drafted messages, the chat question and reply, the applied repair with its "your
  override" tag and the three proof numbers read. The two tool lines in hero 2 ("1 of 4 pass: Wei Zhang") are
  small but legible. The calendar's block labels and the audit trail's lines are not readable at that width:
  the colour change, the moved blocks and the captions carry those shots. The wide proof shot is not readable at
  that width by design: its three numbers are restated large.
- Cold-viewer test: by 16.7 s the viewer has read the outcome, what it is, who built it for whom, and the
  problem, before the first click. Yes.

## Honesty

- Footage: the page's own example run, captured with no demo key. Its model outputs (the LLM's tool calls, the
  decision model's answer, the drafted text) were recorded from live runs on the Vercel preview on 2026-11-16;
  the page replays them in about 5 s (12.4 s live) and computes every tool call, rule check, hold and calendar
  change in the browser. `data-kit-run="example"`; the hook and the checks shot carry the chip "Example run,
  replayed faster"; the page's own pill reads "Example run" and its notice says so when Run the agent is pressed.
  No live calls during capture.
- "12 seconds" is the page's "Repair time": 12.43 s on the card in the hook, 12.54 s on the card in the proof
  shot. 12.26 s of it is the recorded model time; the rest is tool time measured in the browser, which varies
  from replay to replay.
- One take, one page session, in the order the page allows. The example is replayed four times in it (hook,
  Run the agent, the checks, the drafts) because a replay lasts about 5 s; each replay is the same recorded run.
  Three of them are started by the capture script (the page's Replay button, off screen); the one in hero 1 is
  the click the film shows.
- The capture script scrolls the page to keep the card a shot is about in place while the cards above it change
  height. Nothing on the page is altered or redrawn.
- Footage plays at 1x everywhere; no freeze frames (every hold was recorded).
- The problem beat's backdrop is the page with the repair undone (Undo last change), which shows the loop at risk.
- The candidate's message is the page's recorded chat turn, which the page plays when the chat comes into view.
- No voice, no avatar, no GoodTime logo. Music: the kit's instrumental bed (bright-pluck-112-long).

## Demo page change

- `src/pages/demo/goodtime/index.page.js`, `runLive`: in preview mode the notice "Preview mode: live runs need
  the private link from my email. Replaying the recorded example of this message." was set and then cleared by
  `playExample` in the same handler, so it never showed. It is now set after the replay starts. Hero 1 needs it:
  it is the visible result of the click, and the page's own label for the example.
- Not changed, found while recording: after an override is undone, the Decision card still says "your override"
  and the Drafted messages card still shows the override's template drafts (the `override` state is kept when the
  history has more than one entry). It is not on screen in the film.

## Where it falls short of the standard

- Feature order differs from the brief: override and undo come before the candidate chat, because the page locks
  overrides once the candidate has changed the loop. The film is one page session in that order.
- The hero is cut from three replays of the same example (hero 1 and 3 share one; hero 2 and hero 4 have their
  own), not one continuous run: the page finishes a replay in about 5 s.
- Hero 4: the screen is still for 0.7 s, not 1-1.5 s, before the drafts land (the take leaves no more room
  before the next segment). Feature 3a opens with the candidate's message already in the thread; the reply
  lands 2.3 s later.
- Hero 2 shows the agent's tool trace: function names and JSON arguments are on screen beside the two plain
  lines ("4 qualified · 2 filtered out", "1 of 4 pass: Wei Zhang"). The reasons the other three fail (load cap,
  London working hours, a double-booking) are inside a collapsed row and are not shown.
- The page's own labels are visible inside the zoomed cards ("Jev 65%" on the loop card, "Jev" in the audit
  trail, tool names). They are the real UI; the captions do not use them.
- Calendar shots are at 2.0x: block labels are readable on a laptop, not on a phone.
- The proof beat's under-the-hood line (15 words) and the end card are not held to the 0.6 s per word rule; the
  three proof numbers are (9 words, 6.5 s).
- The proof card reads 12.54 s where the hook card reads 12.43 s (tool time differs per replay); the film says
  "12 s" for both.
- The audit trail shows the capture machine's clock (5:08 AM).
- 2x capture records about 12 changed frames per second while a run plays (the film itself is 30 fps); cursor
  glides are slightly stepped.

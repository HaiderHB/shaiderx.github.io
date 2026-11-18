# SPEC: Affirm launch film v2 (kit 2.1, launch format)

GOAL:    A stranger on Affirm's Contact Channels team watches 68.7 s, sound on or off, on a laptop or a
         phone. After 10.2 s they can say what this is (an AI support agent for pay-over-time loans that knows
         when to hand off to a person) and what problem it solves (simple questions wait in line for a person;
         hard ones reach a person without the context). By the end they have seen ONE task done start to
         finish (a customer asks to move her payment date and reads the answer, sees how the agent got there: her
         loans, the policy, the rule checks in code, then confirms with one tap), seen a double charge go to a person by rule, seen the note the person gets, and
         know where to try it. Text carries everything; no voice.
OUTPUT:  HyperFrames 1920x1080, 30 fps, H.264 + AAC, < 20 MB. Web encode (CRF 26, faststart) committed as
         public/demo-videos/affirm.mp4. Music: kit bed bright-pluck-112-long, -20 LUFS integrated, fades 0.3 / 1.5 s.
LOOK:    kit 2.1 launch format, accent iris #8e78ff (the demo page's accent). Captions one line, no kicker; four
         chapter labels over a thin progress bar. No Affirm logo anywhere (the page has none either).
RUN:     example (data-kit-run="example"). Preview mode, no key, no live calls during capture: the page replays
         its recorded example runs. The model outputs in them (DeepSeek's tool calls and reply per round, the
         decision model's answers, the hand-off note) were recorded from live runs on the Vercel preview on
         2026-11-17; the page replays them faster and computes every tool result, policy check, the rules floor
         and the route in the browser with the same code the API runs. The page labels them "Example run"; the
         film labels them "Example run, replayed faster".

## Why v2 (Haider's review, 2026-11-18)

1. "It stays on the title screens way too long": the two text screens ran 6.5 s and 6 s. They now run 3 s each
   (4.2-7.2 and 7.2-10.2), so the product moves again at 10.2 s instead of 16.7 s.
2. "As soon as the agent replies the next frame we are onto the next part. It waited ~2 s on the three dots,
   then gave no time to read the response": the v1 shot spent 3.3 s on the typing dots and cut 0.2 s after the
   reply began. Every hero and feature shot is re-cut to the result rule (kit 2.1): it starts at most 1 s before
   its result is fully on screen and then keeps it on screen max(2.5, 0.5 + 0.3 x words to read) s, 6 s at most.
   Every result in this film is over 18 words, so every hold is 6 s. The first take had 2.6-4.9 s of footage
   after most results, so the whole take was recorded again with a real 7.8 s hold after each one (no freeze
   frames).

## Beat table (as built)

Caption reading time = max(2.5, 0.5 + 0.6 x words), at most 7 s. Result hold = max(2.5, 0.5 + 0.3 x words to
read), at most 6 s. Page shown at = camera zoom x 1.41 (the 1360 px capture on the 1920 stage). Clip `take` is one
continuous take; media seconds in brackets. "Lands at" is seconds from the shot's start (data-kit-lands), read
off the footage frames; words are data-kit-read, counted from the page's own strings.

| # | Beat | Film s | Picture (clip take, media s) | Text on screen | Words / needs / gets | Result lands at / held for | Focus box, page shown at | Honesty |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | HOOK | 0.0-4.2 | The hero card, already resolved on the first frame: tool chips, "Resolved by the agent", "Due day 12th → 21st, ready to confirm", the "Needs a person" bar filling to 7% (5.6-9.8) | "Payment date sorted, no person needed" | 6 / 4.1 / 4.2 s | 0 / 4.2 s | `glance`, 1.95x | chip "Example run, replayed faster"; the card's own pill says "Example run" |
| 2 | WHAT IT IS | 4.2-7.2 | The top of the page while the example replays, blurred and dimmed (0.4-3.4) | "A loan support agent that knows when to hand off." + "A prototype built for Affirm by Haider Bokhari" | 10 words, 3.0 s (text screen) | | statement | |
| 3 | PROBLEM | 7.2-10.2 | The empty chat with its three questions, blurred and dimmed (10.7-13.7) | "Simple questions wait in line. Hard ones lose context." | 9 words, 3.0 s (text screen) | | statement | |
| 4 | HERO 1 | 10.2-17.2 | The chat: her question is sent and the agent's reply is typing from the first frame (no time on the dots); it is fully typed at 1.0 s and stays (18.40-25.40) | "She asks to move her payment date" | 7 / 4.7 / 7.0 s | 1.0 s / 6.0 s (53 words: her question 12, the reply 41) | `ask` + `reply`, 2.8x | chip "Example run, replayed faster"; the bubble's own label "Example run" |
| 4 | HERO 2 | 17.2-24.2 | The same example replayed with the agent run pinned: get_loans and check_policy are in, propose_due_date_change lands at 1.0 s (39.95-46.95) | "First it checked her loans and the policy" | 8 / 5.3 / 7.0 s | 1.0 s / 6.0 s (27 words: three tool names and their one-line results) | `r1`-`r3`, 1.7x | past tense: this happened before the reply in shot 1 |
| 4 | HERO 3 | 24.2-30.4 | Replayed again with the guardrails in view: five checks pass, one n/a; they land at 0.17 s (54.45-60.65) | "Code checked every rule before she saw it" | 8 / 5.3 / 6.2 s | 0.17 s / 6.03 s (41 words: the header and six rules) | `guard`, 2.0x | |
| 4 | HERO 4 | 30.4-37.4 | Back in the chat: the cursor rests on "Confirm: move to the 21st" and presses it at 0.79 s; "Confirmed by Maya" and "Done. Your rowing machine payments are now due on the 21st. Next payment: $120.00 on Dec 21. No fee." are on screen at 1.0 s (28.23-35.23) | "One tap, and her due date moves" | 7 / 4.7 / 7.0 s | 1.0 s / 6.0 s (22 words) | `proposal` + `done`, 2.4x | the reply's own label "applied by code" |
| 5 | FEATURE 2a | 37.4-44.4 | "I think I was charged twice": get_loans and get_payment_schedule (two charges on Nov 10) are in, open_payment_dispute (D-37122) lands at 1.0 s (66.55-73.55) | "A double charge? It opens a dispute." | 7 / 4.7 / 7.0 s | 1.0 s / 6.0 s (30 words) | `r1`-`r3`, 1.6x | chip "Example run, replayed faster" |
| 5 | FEATURE 2b | 44.4-51.0 | Replayed with the decision pinned: it appears on the first frames and its bars finish at 0.55 s: a person 100%, Disputes 100%, rules floor "A dispute was opened: disputes always get a person", "Hand to a person · Disputes queue" (82.25-88.85) | "Disputes always go to a person" | 6 / 4.1 / 6.6 s | 0.55 s / 6.05 s (48 words) | `decision`, 1.8x | |
| 6 | FEATURE 3 | 51.0-57.2 | Replayed with the note pinned: "Writing the hand-off note…" for 0.2 s, then asked, checked, left for a person, suggested next step (96.0-102.2) | "The person gets a summary, not a transcript" | 8 / 5.3 / 6.2 s | 0.2 s / 6.0 s (77 words) | `note`, 1.6x | the card says "Written by DeepSeek from the run's trace in 7.33 s (recorded)" |
| 7 | PROOF | 57.2-63.7 | The top of the page, wide: the headline and the hero card of the date-change example (109.5-116.0) | "3 tool calls · 5/5 policy checks · 7% hand-off odds" + "An LLM picks the tools · code holds the policy · a decision model routes" | 9 / 5.9 / 6.5 s | 0 / 6.5 s | `hero`, 1.47x (proof, wide) | the three numbers are the card's own: Tool calls 3, Policy checks 5/5, Needs a person 7% |
| 8 | END | 63.7-68.7 | End card | "Built for Affirm by Haider Bokhari" / "Try it live: the link is in my message" / "haiderb.com" | 5.0 s | | | |

Chapters on the progress bar: The problem (0) · Move a date (10.2) · A double charge (37.4) · The hand-off (51.0).

## What changed from v1, and why

- Text screens: 6.5 s and 6.0 s → 3.0 s each.
- Hero shot 1 no longer shows the click on the question chip. On the page 3.3 s pass between her message landing
  and the reply (the agent's tool calls), and her 12-word message alone would need 4.1 s of hold, so a separate
  "ask" shot could only end as the reply arrived, which is the cut Haider called out. The shot now opens on her
  message with the reply already typing and keeps the reply for 6 s. It focuses her message and the reply only
  (page at 2.8x) so the reply is readable.
- Hero shots 2 and 3 are now past tense ("First it checked…", "Code checked… before she saw it"): the film shows
  the answer first and then how the agent got there. On the page the tool calls and the rule checks do happen
  before the reply.
- Hero shot 4 is recorded on a fresh chat, so "Done." lands right under the proposal without the thread scrolling.
- "Nobody has to explain it twice" (the close-up of the suggested next step) is cut. With 6 s holds the film ran
  74 s; this was the weakest shot (it repeats the last line of the note, which is already on screen for 6 s).
- One QA warning is left on purpose: in hero shot 4 the click comes 0.79 s after the caption lands (QA asks for
  1 s of stillness first). A caption may stay 7 s at most, the result needs 6 s and takes 0.2 s to show after the
  click, so a full second of stillness would cost the hold 0.16 s. The hold wins; the cursor is already resting
  on the button on the first frame.

## Rules that are easy to break

- No title card, no Affirm logo, no kicker, no stepper, no "If I join" content.
- No internal names in captions ("the agent", "a decision model"; never "Jev" or "DeepSeek"). The page's own labels
  (tool names, "Jev · 2 typed questions") are visible inside the zoomed cards; they are the real UI.
- One focal point per shot, page shown at >= 1.5x, spotlight on the focus. Wide views only in the hook and proof.
- Real page footage only. Example runs labelled. No speed changes planned (holds are real footage).

## Footage

One take, `take` (take 2, 116.3 s), recorded 2026-11-18 with kit/scripts/capture.cjs at 1360x765 CSS px, 2x device
pixels (frames 2720x1530, 11-16 changed frames/s while things move), cursor 0.75 with idle hide, from an isolated
`next start -p 3161` copy of the branch with no demo key (preview mode). No live calls. The page code is the same
as in take 1.

- The page replays its recorded examples; the take replays the date-change example five times (hook, chat, tools,
  guard, proof) and the double-charge example three times (f2a, f2b, f3) so each shot can hold on the part it is
  about. Every replay is the same recorded run; tools, checks and route are recomputed in the browser each time.
- Every result is followed by a real 7.8 s hold, and every landing is marked. The script pins the card a shot is
  about at a fixed height, so the layout above it can change without moving it. Nothing on the page is altered.
- Marks are DOM times; the footage shows a change 0.13-0.33 s later, and tool-call rows fade in over 0.32 s. The
  times below are what the frames show (checked on frames 30-70 ms apart), and they are what the cut uses.

| Result | DOM mark (media s) | On screen in the footage (media s) | Real hold after it |
| --- | --- | --- | --- |
| hook: card resolved | 5.24 | 5.6 | to 10.4 |
| chat: reply starts typing | 18.03 | 18.37 | |
| chat: reply fully typed (the proposal card appears with it) | 19.17 | 19.40 | to 27.2 (the cursor starts moving) |
| confirm: click | 29.02 | button pressed 29.10 | |
| confirm: "Confirmed by Maya" + "Done. …" | 29.03 | 29.23 | to 36.8 |
| tools: check_policy row, then the propose_due_date_change row | 39.67, 40.46 | 39.85; visible from 40.68, the cut counts it from 40.95 (fade-in over) | to 50.1 |
| guard: the guardrail list | 54.44 | 54.62 | to 63.4 |
| f2a: get_payment_schedule row, then the open_payment_dispute row | 66.28, 67.02 | 66.6; visible from 67.3, the cut counts it from 67.55 (fade-in over) | to 76.5 |
| f2b: the decision | 82.13 | text 82.27, bars full 82.80 | to 89.9 |
| f3: the note | 96.03 | 96.2 | to 103.8 |
| proof: card resolved | 108.83 | 109.3, bar full 109.5 | to 116.3 |

- Every hold in the film is real footage at 1x: no speed changes, no freeze frames.

## Cold-viewer test

After 10.2 s a stranger has read "Payment date sorted, no person needed" over a card that says "Resolved by the agent"
with a "Needs a person 7%" bar, then "A loan support agent that knows when to hand off. A prototype built for Affirm by
Haider Bokhari", then "Simple questions wait in line. Hard ones lose context." They can say what it is (an AI support
agent for loans) and what it solves (it resolves the simple ones and hands the hard ones to a person with context)
before the first hero shot.

## Review loop (v2)

- `npx hyperframes check`: ok. `qa.mjs --frames`: PASS, 0 fail, 1 warn (the hero-4 click, explained above).
  Render QA (`--video`): PASS; h264 1920x1080 30 fps, 68.70 s, 6.9 MB; -20.0 LUFS, true peak -6.3 dBTP; fades OK.
  The same landing and pre-cut frames were checked again on the rendered file.
- Result rule, per shot (QA): 6.00, 6.00, 6.03, 6.00, 6.00, 6.05, 6.00 s on screen, each needing 6.00.
- Frames checked by eye at every cut (the first frame of each shot, the frame its result lands on, and the frame
  0.2 s before the next cut: 10.25 / 11.25 / 17.0, 17.25 / 18.25 / 24.0, 24.25 / 24.45 / 30.2, 30.45 / 31.45 / 37.2,
  37.45 / 38.45 / 44.2, 44.45 / 45.0 / 50.8, 51.05 / 51.25 / 57.0). In every case the result is complete on its landing
  frame and unchanged on the pre-cut frame. The longest lead-in is 1.0 s and it is never a spinner: the reply is
  typing, or the third tool call is landing.
- Captions one line at 68 px; focus boxes whole and above the band; example shots labelled; no Affirm logo (the
  bar's "Prototype for Affirm" is the page's own text).

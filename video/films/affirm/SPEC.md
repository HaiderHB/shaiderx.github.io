# SPEC: Affirm launch film (kit 2, launch format)

GOAL:    A stranger on Affirm's Contact Channels team watches 68.5 s, sound on or off, on a laptop or a
         phone. After 17 s they can say what this is (an AI support agent for pay-over-time loans that knows
         when to hand off to a person) and what problem it solves (simple questions wait in line for a person;
         hard ones reach a person without the context). By the end they have seen ONE task done start to
         finish (a customer moves her payment date, the agent checks her loans and the policy, code checks the
         reply, she confirms), seen a double charge go to a person by rule, seen the note the person gets, and
         know where to try it. Text carries everything; no voice.
OUTPUT:  HyperFrames 1920x1080, 30 fps, H.264 + AAC, < 20 MB. Web encode (CRF 26, faststart) committed as
         public/demo-videos/affirm.mp4. Music: kit bed bright-pluck-112-long, -20 LUFS integrated, fades 0.3 / 1.5 s.
LOOK:    kit 2 launch format, accent iris #8e78ff (the demo page's accent). Captions one line, no kicker; four
         chapter labels over a thin progress bar. No Affirm logo anywhere (the page has none either).
RUN:     example (data-kit-run="example"). Preview mode, no key, no live calls during capture: the page replays
         its recorded example runs. The model outputs in them (DeepSeek's tool calls and reply per round, the
         decision model's answers, the hand-off note) were recorded from live runs on the Vercel preview on
         2026-11-17; the page replays them faster and computes every tool result, policy check, the rules floor
         and the route in the browser with the same code the API runs. The page labels them "Example run"; the
         film labels them "Example run, replayed faster".

## Beat table (as built)

Reading time = max(2.5, 0.5 + 0.6 x words). Page shown at = camera zoom x 1.41 (the 1360 px capture on the 1920
stage). Clip `take` is one continuous take; media seconds in brackets.

| # | Beat | Film s | Picture (clip take, media s) | Text on screen | Words / needs / gets | Focus box, page shown at | Honesty |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | HOOK | 0.0-4.2 | The hero card the moment the date-change example resolves: tool chips, "Resolved by the agent", "Due day 12th → 21st, ready to confirm", the "Needs a person" bar filling to 7% (5.3-9.5) | "Payment date sorted, no person needed" | 6 / 4.1 / 4.2 s | `glance`, 1.95x | chip "Example run, replayed faster"; the card's own pill says "Example run" |
| 2 | WHAT IT IS | 4.2-10.7 | The top of the page while the example replays, blurred and dimmed (0.4-6.9) | "A loan support agent that knows when to hand off." + "A prototype built for Affirm by Haider Bokhari" | 10 / 6.5 / 6.5 s | statement | |
| 3 | PROBLEM | 10.7-16.7 | The empty chat with its three questions, blurred and dimmed (10.6-16.6) | "Simple questions wait in line. Hard ones lose context." | 9 / 5.9 / 6.0 s | statement | |
| 4 | HERO 1 | 16.7-21.7 | The cursor presses "Can I move my payment date? I get paid on the 20th" at 1.47 s; her message lands, the agent starts (18.6-23.6) | "She asks to move her payment date" | 7 / 4.7 / 5.0 s | `thread` + `presets`, 2.1x | the bubble's own label "Example run" |
| 4 | HERO 2 | 21.7-27.0 | The same example replayed with the agent run pinned: get_loans, check_policy, propose_due_date_change land with the model's own notes (29.1-34.4) | "The agent checks her loans and the policy" | 8 / 5.3 / 5.3 s | `r1`-`r3`, 1.7x | chip "Example run, replayed faster" |
| 4 | HERO 3 | 27.0-32.3 | Replayed again with the guardrails in view: five checks pass, one n/a (39.6-44.9) | "Code checks every rule before she sees it" | 8 / 5.3 / 5.3 s | `guard`, 2.0x | |
| 4 | HERO 4 | 32.3-37.2 | The proposed change (12th → 21st, $0.00); the cursor presses "Confirm: move to the 21st" at 1.69 s; "Done. Your rowing machine payments are now due on the 21st" (46.5-51.4) | "One tap, and her due date moves" | 7 / 4.7 / 4.9 s | `proposal` + `done`, 2.3x | the reply's own label "applied by code" |
| 5 | FEATURE 2a | 37.2-42.2 | "I think I was charged twice": get_loans, get_payment_schedule (two charges on Nov 10), open_payment_dispute (D-37122) land (53.05-58.05) | "A double charge? It opens a dispute." | 7 / 4.7 / 5.0 s | `r1`-`r3`, 1.6x | chip "Example run, replayed faster" |
| 5 | FEATURE 2b | 42.2-47.0 | Replayed with the decision pinned: a person 100%, Disputes 100%, rules floor "A dispute was opened: disputes always get a person", "Hand to a person · Disputes queue" (63.9-68.7) | "Disputes always go to a person" | 6 / 4.1 / 4.8 s | `decision`, 1.8x | |
| 6 | FEATURE 3a | 47.0-52.3 | Replayed with the note pinned: asked, checked, left for a person, suggested next step (73.5-78.8) | "The person gets a summary, not a transcript" | 8 / 5.3 / 5.3 s | `note`, 1.6x | the card says "Written by DeepSeek from the run's trace in 7.33 s (recorded)" |
| 6 | FEATURE 3b | 52.3-57.0 | The suggested next step, closer (77.0-81.7, the same hold) | "Nobody has to explain it twice" | 6 / 4.1 / 4.7 s | `nextStep`, 2.8x | |
| 7 | PROOF | 57.0-63.5 | The top of the page, wide: the headline and the hero card of the date-change example (87.3-93.8) | "3 tool calls · 5/5 policy checks · 7% hand-off odds" + "An LLM picks the tools · code holds the policy · a decision model routes" | 9 / 5.9 / 6.5 s | `hero`, 1.47x (proof, wide) | the three numbers are the card's own: Tool calls 3, Policy checks 5/5, Needs a person 7% |
| 8 | END | 63.5-68.5 | End card | "Built for Affirm by Haider Bokhari" / "Try it live: the link is in my message" / "haiderb.com" | 5.0 s | | |

Chapters on the progress bar: The problem (0) · Move a date (16.7) · A double charge (37.2) · The hand-off (47.0).

## What changed from the plan, and why

- "Disputes always go to a person, by rule" became "Disputes always go to a person": 8 words needed 5.3 s and the
  shot holds 4.8 s. The rules floor is on screen in the shot ("A dispute was opened: disputes always get a person").
- The proof's third number reads "hand-off odds" (not "odds of a hand-off") to keep the stats inside their reading time.
- The recorded date-change run uses three tools (an earlier recording used four); the hook, hero and proof follow the
  run that is on the page.

## Rules that are easy to break

- No title card, no Affirm logo, no kicker, no stepper, no "If I join" content.
- No internal names in captions ("the agent", "a decision model"; never "Jev" or "DeepSeek"). The page's own labels
  (tool names, "Jev · 2 typed questions") are visible inside the zoomed cards; they are the real UI.
- One focal point per shot, page shown at >= 1.5x, spotlight on the focus. Wide views only in the hook and proof.
- Real page footage only. Example runs labelled. No speed changes planned (holds are real footage).

## Footage

One take, `take` (94.3 s), recorded 2026-11-17 with kit/scripts/capture.cjs at 1360x765 CSS px, 2x device pixels
(frames 2720x1530, 12-15 changed frames/s while things move), cursor 0.75 with idle hide, 450 ms rest before clicks,
from an isolated `next build && next start -p 3161` copy of the branch with no demo key (preview mode). No live calls.

- The page replays its recorded examples; the take replays the date-change example five times (hook, h1, h2, h3,
  proof) and the double-charge example three times (f2a, f2b, f3) so each shot can hold on the part it is about. Every
  replay is the same recorded run; the tools, checks and route are recomputed in the browser each time.
- Before the hook, the empty chat, the decision, the note and the proof the script presses "New chat" (no cursor). For
  the agent-run shots it pins the card a shot is about at a fixed height, so the layout above it can change without
  moving it. Nothing on the page is altered.
- Marks (media s): hook replay 1.01, resolved 5.17; empty chat 10.39; h1 click 20.07, resolved 24.26; h2 replay 29.07
  (get_loans 29.67, propose 31.16), resolved 33.26; h3 replay 37.87, guardrails 40.88; h4 click 48.19, "Done" 48.24;
  f2a replay 53.01 (steps 53.75-55.21), routed 57.01; f2b replay 61.23, decision 65.21; f3 replay 70.41, note 74.79;
  proof replay 82.63, resolved 86.78.
- Every hold in the film is real footage at 1x: no speed changes, no freeze frames.

## Cold-viewer test

After 16.7 s a stranger has read "Payment date sorted, no person needed" over a card that says "Resolved by the agent"
with a "Needs a person 7%" bar, then "A loan support agent that knows when to hand off. A prototype built for Affirm by
Haider Bokhari", then "Simple questions wait in line. Hard ones lose context." They can say what it is (an AI support
agent for loans) and what it solves (it resolves the simple ones and hands the hard ones to a person with context)
before the first click.

## Review loop

QA with frames: PASS, 0 fail, 0 warn (34 stills every 3.4 s plus seams). Looked at the contact sheet, the framing
sheet and the stills at 1, 21.4, 24.8, 31.6, 35, 45.2 and 52 s: every caption on one line at 68 px, every focus box
whole and above the band, labels on every example shot, no Affirm logo (the bar's "Prototype for Affirm" is the page's
own text). At phone width the captions stay readable; the small text inside the cards is restated by the captions.

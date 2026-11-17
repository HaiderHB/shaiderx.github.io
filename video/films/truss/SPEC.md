# SPEC: Truss launch film (kit 2, launch format)

GOAL:    A stranger at Truss (the founder) watches about 69 s, sound on or off, on a laptop or a phone. After
         16.7 s they can say what this is (an AI agent that checks subcontractor bills before paying them) and
         what problem it solves (a timed-out request or a resent invoice can pay a subcontractor twice). By the
         end they have seen ONE bill go from an invoice image to a checked, approved bill, seen its payment time
         out and retry without a second charge, seen a changed bank account held and a resent invoice stopped,
         and know where to try it. Text carries everything; no voice.
OUTPUT:  HyperFrames 1920x1080, 30 fps, H.264 + AAC, < 20 MB. Web encode (CRF 26, faststart) committed as
         public/demo-videos/truss.mp4. Music: kit bed bright-pluck-112-long, -20 LUFS, fades 0.3 / 1.5 s.
LOOK:    kit 2 launch format, accent cobalt #6896ff (the demo page's accent). Captions 66 px, one line, no kicker;
         four chapter labels over a thin progress bar.
RUN:     example (data-kit-run="example"). Preview mode, no key, no live calls during capture. The page replays
         its example: the model outputs (Gemini's JSON per invoice image, Jev's answer, DeepSeek's note) were
         recorded from live runs on the Vercel preview on 2026-11-17; the schema check, the eight checks, the rules
         floor and the payment endpoint run in the browser on the same code as the API. The extraction replays in
         1.8 s (2.7 s live). The payment timeout is real timing in the browser: the simulated bank holds its reply
         2.5 s after the charge is committed, the page gives up at 1.5 s and retries with the same key. The page
         labels it "Example run"; the film labels it "Example run" / "Example run, replayed faster".

## Beat table (as built)

Reading time = max(2.5, 0.5 + 0.6 x words). Page shown at = camera zoom x 1.41 (the 1360 px capture on the 1920 stage).
Clip `flow` is one continuous take; media seconds are in brackets.

| # | Beat | Film s | Picture (clip flow, media s) | Text on screen | Words / needs / gets | Focus box, page shown at | Honesty |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | HOOK | 0.0-4.6 | The hero card while the on-load example pays: "Paying…" (frame 0), "No reply. Retrying…" at 1.5, "Paid once · 1 charge · 1 retry deduplicated" at 2.3, held (4.7-9.3) | "Payment retried. Still charged only once." | 6 / 4.1 / 4.6 s | `glance`, 2.26x | chip "Example run" |
| 2 | WHAT | 4.6-11.1 | The top of the page while the example plays, blurred and dimmed (0.4-6.9) | "An AI agent that checks subcontractor bills before paying them." + "A prototype built for Truss by Haider Bokhari" | 10 / 6.5 / 6.5 s | statement | |
| 3 | PROBLEM | 11.1-17.1 | The resent Keystone invoice in the invoice column: line items, totals, the "REMINDER · PAST DUE" stamp, blurred 5 px (16.5-22.5) | "A timeout or a resent invoice can pay twice." | 9 / 5.9 / 6.0 s | statement, `data-kit-cam` on the stamp | |
| 4 | HERO 1 | 17.1-22.3 | The Northline invoice; Read and check (example) is pressed at 18.72; the scan sweeps the page; the typed bill fills beside it (25.1-30.3) | "A subcontractor invoice arrives as an image" | 6 / 4.1 / 5.2 s | `runBox`, top-left, 1.62x (the invoice below it) | the button says "(example)" |
| 4 | HERO 2 | 22.3-27.6 | The same example replayed with the typed bill pinned: vendor, invoice, PO, dates and five lines land at 23.65 (36.6-41.9) | "It reads every line, total and bank detail" | 8 / 5.3 / 5.3 s | `billKv` + `lines`, 2.27x | chip "Example run, replayed faster" |
| 4 | HERO 3 | 27.6-32.9 | Replayed with the checks pinned: all eight listed, they tick from 28.9; "8/8 passed" at 30.2 (46.3-51.6) | "Code checks the PO, the math, past payments" | 8 / 5.3 / 5.3 s | `checks`, 1.53x | |
| 4 | HERO 4 | 32.9-38.2 | Replayed with the decision pinned: the bars (approve 97%), "Every check passed: the model may approve", Approve and the note land at 34.9 (56.35-61.65) | "A decision model approves; rules can only block" | 8 / 5.3 / 5.3 s | `decision`, 1.65x | |
| 5 | FEATURE 2a | 38.2-43.8 | Close on the payment buttons (the idempotency key above them): Simulate a timeout and retry is pressed at 39.82; Attempt 1 "sent, waiting…", "timed out" at 41.3, Attempt 2 "201, replayed …: no new charge" at 42.2 (63.1-68.7) | "The bank is slow. The browser retries." | 7 / 4.7 / 5.6 s | `payActions` + `attempts`, 2.82x | chip "Example run, simulated bank" |
| 5 | FEATURE 2b | 43.8-49.1 | Replayed with the ledger pinned (the payment pressed off screen): Charges 1, Requests 2, Retries deduplicated 1, "201 charged … The browser had already given up waiting", "201 replayed" land at 46.1 (78.0-83.3) | "Same key, so the retry never charges twice" | 8 / 5.3 / 5.3 s | `ledger`, 1.88x | |
| 6 | FEATURE 3a | 49.1-54.1 | Crestline with the decision pinned: Hold 100%, floor "Bank details differ from the vendor file", Hold for review, the note (call the vendor at the number on file) land at 50.6 (87.5-92.5) | "Changed bank details? Held for a call." | 7 / 4.7 / 5.0 s | `decision`, 1.58x | |
| 6 | FEATURE 3b | 54.1-59.1 | Keystone's payment card: "Stopped before payment · Already paid: INV-KD-0412 paid Oct 30, 2026 · PMT-88213"; Try to pay it anyway is pressed at 55.72: "Refused with 403" (99.0-104.0) | "Already paid? Stopped before any money moves." | 7 / 4.7 / 5.0 s | `pay`, 2.25x | |
| 7 | PROOF | 59.1-65.6 | The top of the page, wide: title and the hero card "Paid once · 1 charge · 1 retry deduplicated", Checks 8/8, Approve 97%, Charges 1 (9.0-15.5) | "8/8 checks passed · 1 charge · 1 retry, no new charge" + "A vision model reads · code checks · a decision model decides · idempotency keys pay once" | 6.5 s | `heroText`, 1.41x (wide) | the numbers are the card's own |
| 8 | END | 65.6-70.6 | End card | "Built for Truss by Haider Bokhari" / "Try it live: the link is in my message" / "haiderb.com" | 5.0 s | | |

Chapters on the progress bar: The problem (0) · One bill (17.1) · Paying once (38.2) · Caught (49.1).

## What changed from the plan, and why

- F3a's caption is "Changed bank details? Held for a call." (7 words): the planned "New bank details? Held for a
  phone check." is 8 words and needed 5.3 s in a 5.0 s shot.
- H1 frames the Read button with the invoice under it (`runBox`, aligned top-left, 1.62x) instead of a wide shot
  of the whole invoice column: the column is taller than the frame above the band, and this keeps the page at
  >= 1.5x with no partial shot. H1 has no spotlight: the button and the invoice it reads are both the subject.
- F2a is close on the payment buttons and the attempt rows (2.8x) instead of the whole payment card (1.6x), so
  "timed out" and "replayed: no new charge" read at phone width; the idempotency key shows above the buttons.
- The page changed for the film's sake in ways that also help a visitor: the checks card lists all eight checks
  while a run plays and the decision card keeps its layout (pending bars, "Deciding…"), so neither jumps in
  height; a "New session" button empties the ledger so the clean bill can be paid again.

## Rules that are easy to break

- No title card, no logo of Truss, no kicker, no stepper, no "If I join" content.
- No internal names in captions: "a decision model", never Jev, Gemini or DeepSeek. Implementation terms go in
  the proof beat's under-the-hood line only.
- One focal point per shot, page shown at >= 1.5x; H1 is the one wide shot (the invoice page is the subject).
- Real page footage only, nothing redrawn. Label the example run and the faster replay.

## Footage

One take, `flow` (104.6 s), recorded 2026-11-17 with kit/scripts/capture.cjs at 1360x765 CSS px, 2x device pixels
(frames 2720x1530), cursor 0.75 with idle hide, 450 ms rest before clicks, from an isolated `next start -p 3163`
copy of the branch with no demo key (preview mode). No live calls.

- The page plays its example on load: Northline read, checked, approved, then paid with the timeout and retry
  (paying 4.67, timed out 6.17, paid 7.02); the top of the page then holds to 16.0 (the hook, the what backdrop
  and the proof all come from here).
- Keystone picked (16.04): its invoice in the invoice column (the problem backdrop).
- "New session" empties the in-browser ledger before each Northline replay, so the bill is not a duplicate of the
  previous replay's payment. Replays: Read pressed with the cursor (26.72); then pressed off screen with the bill
  (36.10), the checks (45.24) and the decision (54.35) pinned; the payment pressed with the cursor (64.72, done
  67.09); a replay with the ledger pinned, payment pressed off screen (77.87, done 80.24).
- Crestline with the decision pinned (pressed 85.06, landed 89.03); Keystone run, the payment card pinned, Try to
  pay it anyway pressed with the cursor (100.62, refused 100.78).
- The capture script pins the card a shot is about (keeps its top at a fixed height while cards above change
  size). The invoice column is sticky, so for the read shots it pins the picker above it instead. Nothing on the
  page is altered or redrawn. Footage plays at 1x; every hold is real footage, no freeze frames.

## Cold-viewer test

After 17.1 s a stranger has read "Payment retried. Still charged only once." over a card that goes from "Paying…"
to "No reply. Retrying…" to "Paid once · 1 charge · 1 retry deduplicated", then "An AI agent that checks
subcontractor bills before paying them. A prototype built for Truss by Haider Bokhari", then "A timeout or a resent
invoice can pay twice." over an invoice stamped "REMINDER · PAST DUE". They can say what it is and what it is for
before the first click.

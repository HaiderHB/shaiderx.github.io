# SPEC: Truss launch film (kit 2.1, launch format)

GOAL:    A stranger at Truss (the founder) watches about 69 s, sound on or off, on a laptop or a phone. After
         10.8 s they can say what this is (an AI agent that checks subcontractor bills before paying them) and
         what problem it solves (a timed-out request or a resent invoice can pay a subcontractor twice). By the
         end they have seen ONE bill go from an invoice image to a checked, approved bill, seen its payment time
         out and retry without a second charge, seen a resent invoice stopped before payment, and know where to
         try it. Text carries everything; no voice.
OUTPUT:  HyperFrames 1920x1080, 30 fps, H.264 + AAC, < 20 MB. Web encode (CRF 26, faststart) committed as
         public/demo-videos/truss.mp4. Music: kit bed bright-pluck-112-long, -20 LUFS, fades 0.3 / 1.5 s.
LOOK:    kit 2.1 launch format, accent cobalt #6896ff (the demo page's accent). Captions 66 px, one line, no
         kicker; four chapter labels over a thin progress bar.
RUN:     example (data-kit-run="example"). Preview mode, no key, no live calls during capture. The page replays
         its example: the model outputs (Gemini's JSON per invoice image, Jev's answer, DeepSeek's note) were
         recorded from live runs on the Vercel preview on 2026-11-17; the schema check, the eight checks, the rules
         floor and the payment endpoint run in the browser on the same code as the API. The extraction replays in
         1.8 s (2.7 s live). The payment timeout is real timing in the browser: the simulated bank holds its reply
         2.5 s after the charge is committed, the page gives up at 1.5 s and retries with the same key. The page
         labels it "Example run"; the film labels it "Example run" / "Example run, replayed faster" / "Example run,
         simulated bank".

## Pacing rules this cut follows (kit 2.1, Haider's review, 2026-11-18)

- Text screens (`what`, `problem`) run 3 s each: the product is moving again at 10.8 s (17.1 s in the 2.0 cut).
- The result rule: cut the wait, keep the result. Each hero / feature shot starts about a second before its
  result is fully on screen and then keeps it up `max(2.5, 0.5 + 0.3 x words to read in it)` s, 6 s at most.
  "Fully on screen" is read off the footage frame by frame (the screencast shows a change 0.1-0.3 s after its
  DOM time, and fade-ins must have finished), not off the capture marks alone.
- A caption stays at most 7 s, so a shot is at most 7 s: with a 6 s hold the wait before the result is 1 s or less.

## Beat table (as built)

Caption reading time = max(2.5, 0.5 + 0.6 x words). Page shown at = camera zoom x 1.41 (the 1360 px capture on the
1920 stage). Clip `flow` is one continuous take; media seconds are in brackets. "Lands at" is seconds from the
shot's start (`data-kit-lands`); "held" is how long the finished result then stays before the cut; "needs" is the
rule for the words counted (`data-kit-read`).

| # | Beat | Film s | Picture (clip flow, media s) | Text on screen | Words / needs / gets | Result lands at / held for (needs) | Focus box, page shown at | Honesty |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | HOOK | 0.0-4.8 | The hero card while the on-load example pays: "No reply. Retrying… · Same idempotency key, so no second charge" (frame 0), then "Paid once · 1 charge · 1 retry deduplicated" (6.4-11.2) | "Payment retried. Still charged only once." | 6 / 4.1 / 4.8 s | 0.83 s / 3.97 s (not gated in the hook; 9 words in the status and charges lines = 3.2 s) | `glance`, 2.26x | chip "Example run" |
| 2 | WHAT | 4.8-7.8 | The top of the page while the example plays, blurred and dimmed (0.4-3.4) | "An AI agent that checks subcontractor bills before paying them." + "A prototype built for Truss by Haider Bokhari" | 10 words / 3.0 s | text screen: 3 s | statement | |
| 3 | PROBLEM | 7.8-10.8 | The resent Keystone invoice in the invoice column: line items, totals, the "REMINDER · PAST DUE" stamp, blurred 5 px (16.8-19.8) | "A timeout or a resent invoice can pay twice." | 9 words / 3.0 s | text screen: 3 s | statement, `data-kit-cam` on the stamp | |
| 4 | HERO 1 | 10.8-15.5 | The Northline invoice image under the Read button; Read and check (example) is pressed at 13.55; the page reads the image for the last 1.95 s; cut before the bill lands (24.0-28.7) | "A subcontractor invoice arrives as an image" | 7 / 4.7 / 4.7 s | 0 s (the invoice image is there from the first frame) / 4.7 s (13 words: the button, its note, the invoice's name and title: needs 4.4 s) | `runBox`, top-left, 1.62x (the invoice below it) | chip "Example run, replayed faster"; the button says "(example)" |
| 4 | HERO 2 | 15.5-22.4 | The same example replayed with the typed bill pinned: 0.6 s of loading, then vendor, invoice, PO, dates, five lines, totals, retainage, amount due, remit-to bank and the lien-waiver tag (37.6-44.5) | "It reads every line, total and bank detail" | 8 / 5.3 / 6.9 s | 0.9 s (the lines finish fading in) / 6.0 s (102 words: needs 6.0 s, the cap) | `billKv` + `lines` + `billFoot`, 1.64x | |
| 4 | HERO 3 | 22.4-29.4 | Replayed with the checks pinned: three checks are ticked at the cut, the other five tick, "8/8 passed" (52.05-59.05) | "Code checks the PO, the math, past payments" | 8 / 5.3 / 7.0 s | 1.0 s ("8/8 passed") / 6.0 s (135 words: the cap) | `checks`, 1.53x | |
| 4 | HERO 4 | 29.4-36.4 | Replayed with the decision pinned: 0.4 s pending, then Approve 97% / Hold 3% / Reject 0%, "Every check passed: the model may approve", Approve, and the reviewer note (66.85-73.85) | "A decision model approves; rules can only block" | 8 / 5.3 / 7.0 s | 1.0 s (the note is in) / 6.0 s (51 words: the cap) | `decision`, 1.65x | |
| 5 | FEATURE 2a | 36.4-43.4 | Close on the payment buttons and the attempts, from 1.1 s after Simulate a timeout and retry was pressed (the click is cut): "Sending the payment… · Attempt 1 sent, waiting…", "no reply after 1.52 s: timed out" at 36.85, "Attempt 2 · 201, replayed pmt_…: no new charge" (80.0-87.0) | "The bank is slow. The browser retries." | 7 / 4.7 / 7.0 s | 1.4 s (both attempt rows final) / 5.6 s (17 words in the two rows: needs 5.6 s) | `payActions` + `attempts`, 2.82x; the lit box narrows to the two rows once they are final | chip "Example run, simulated bank" |
| 5 | FEATURE 2b | 43.4-50.2 | Replayed with the ledger pinned (the payment pressed off screen): zeros for 0.65 s, then Charges 1, Requests 2, Retries deduplicated 1, the charge, "201 charged · Charge created. The browser had already given up waiting.", "201 replayed · Same key: stored response returned, no new charge" (98.2-105.0) | "Same key, so the retry never charges twice" | 8 / 5.3 / 6.8 s | 0.8 s (the rows finish fading in) / 6.0 s (57 words: the cap) | `ledger`, 1.88x | |
| 6 | FEATURE 3 | 50.2-57.2 | Keystone's payment card: "Stopped before payment · Already paid: INV-KD-0412 paid Oct 30, 2026 · PMT-88213" from the first frame; Try to pay it anyway is pressed at 51.71; "Refused with 403: This bill is rejected. Only approved bills can be paid." (127.45-134.45) | "Already paid? Stopped before any money moves." | 7 / 4.7 / 7.0 s | 1.85 s (the refusal) / 5.15 s (13 words: needs 4.4 s; the "Stopped" banner above it is up all 7.0 s) | `pay`, 2.25x | |
| 7 | PROOF | 57.2-63.7 | The top of the page, wide: title and the hero card "Paid once · 1 charge · 1 retry deduplicated", Checks 8/8, Approve 97%, Charges 1 (9.0-15.5) | "8/8 checks passed · 1 charge · 1 retry, no new charge" + "A vision model reads · code checks · a decision model decides · idempotency keys pay once" | 6.5 s | | `heroText`, 1.41x (wide) | the numbers are the card's own |
| 8 | END | 63.7-68.7 | End card | "Built for Truss by Haider Bokhari" / "Try it live: the link is in my message" / "haiderb.com" | 5.0 s | | | |

Chapters on the progress bar: The problem (0) · One bill (10.8) · Paying once (36.4) · Caught (50.2).

## What changed in the kit 2.1 cut, and why

- Both text screens run 3 s (they were 6.5 s and 6.0 s).
- Every result shot was re-cut to "about a second of wait, then the result for its full time". The 2.0 cut gave
  the typed bill 4.0 s, the checks 2.7 s, the decision 3.3 s, the attempts 1.6 s, the ledger 3.0 s and the refusal
  3.1 s. They now get 6.0, 6.0, 6.0, 5.6, 6.0 and 5.15 s.
- Feature 2a no longer shows the click: from the click to the retried answer is 2.4 s of real waiting, and a
  shot is at most 7 s. The shot starts with the first attempt already waiting, 0.45 s before it times out.
- Hero 1 ends before the typed bill lands (it used to show the bill for 1.8 s and then cut): the bill is hero 2's
  result and gets its whole shot.
- Hero 2 frames the whole typed bill (fields, lines, totals, remit-to) at 1.64x instead of the fields and lines at
  2.27x: the caption says "total and bank detail", and the viewer now has 6 s with it.
- The hook starts on "No reply. Retrying…" so "Paid once" is up within a second and stays 4.0 s (it was 2.3 s).
- **Dropped: the bank-change shot** ("Changed bank details? Held for a call.", Crestline's decision held for
  review). With honest holds each result shot is about 7 s; eight of them plus the hook, the text screens, the
  proof and the end card come to about 76 s, over the 72 s limit, and the rule is to drop the weakest shot, never
  a hold. It was the weakest as film: the same card as hero 4 at the lowest magnification of the features, and the
  problem statement (a timeout, a resent invoice) does not set it up. The footage is recorded with a full hold
  (media 108.3-121.0; the decision and its note are fully in at 113.1 and stay 7.9 s), so it can come back as one
  7 s shot if it is wanted over one of the two payment shots. The demo page still shows the case.
- The capture was re-taken (2026-11-18) with a real hold of 7.5-8.9 s after every result, so no shot uses a held
  frame.

## Rules that are easy to break

- No title card, no logo of Truss, no kicker, no stepper, no "If I join" content.
- No internal names in captions: "a decision model", never Jev, Gemini or DeepSeek. Implementation terms go in
  the proof beat's under-the-hood line only.
- One focal point per shot, page shown at >= 1.5x.
- Real page footage only, nothing redrawn. Label the example run and the faster replay.
- A shot never ends as its result appears: take the time from the wait before it.

## Footage

One take, `flow` (137.4 s), recorded 2026-11-18 with kit/scripts/capture.cjs at 1360x765 CSS px, 2x device pixels
(frames 2720x1530), cursor 0.75 with idle hide, 450 ms rest before clicks, from an isolated `next start -p 3163`
copy of the branch with no demo key (preview mode). No live calls. Times below are media seconds; "DOM" is the
capture mark, "footage" is the first frame of the built footage that shows it.

| What | DOM | Footage | Then holds until |
| --- | --- | --- | --- |
| On-load example: "No reply. Retrying…" | 6.25 | 6.37 | |
| On-load example: "Paid once" | 7.07 | 7.23 | 16.09 |
| Keystone picked: its invoice (problem backdrop) | 16.09 | 16.6 | 23.3 |
| Read and check pressed (cursor) | 26.75 | | |
| The typed bill lands beside the invoice | 28.58 | 28.78 | |
| Typed bill pinned: fields land / lines fully in | 38.04 | 38.20 / 38.5 | 47.38 |
| Checks pinned: first check / "8/8 passed" | 51.53 / 52.86 | 51.6 / 53.05 | 61.41 |
| Decision pinned: bars land / note in | 67.19 / 67.89 | 67.25 / 67.85 | 75.9 |
| Payment: pressed (cursor) / timed out / both attempts final | 78.89 / 80.42 / 81.28 | 78.9 / 80.45 / 81.4 | 88.8 |
| Ledger pinned (payment pressed off screen at 96.32): ledger updates / rows fully in | 98.70 | 98.85 / 99.0 | 106.8 |
| Crestline decision (not used): lands / note in | 112.28 / 112.98 | 113.1 | 121.0 |
| Keystone payment card: Try to pay it anyway pressed (cursor) / refused | 128.96 / 129.12 | 129.25 | 136.7 |

- "New session" empties the in-browser ledger before each Northline replay, so the bill is not a duplicate of the
  previous replay's payment.
- The capture script pins the card a shot is about (keeps its top at a fixed height while cards above change
  size). The invoice column is sticky, so for the read shots it pins the picker above it instead. Nothing on the
  page is altered or redrawn. Footage plays at 1x; every hold is real footage, no freeze frames.

## Cold-viewer test

After 10.8 s a stranger has read "Payment retried. Still charged only once." over a card that goes from "No reply.
Retrying…" to "Paid once · 1 charge · 1 retry deduplicated", then "An AI agent that checks subcontractor bills
before paying them. A prototype built for Truss by Haider Bokhari", then "A timeout or a resent invoice can pay
twice." over an invoice stamped "REMINDER · PAST DUE". They can say what it is and what it is for before the first
click.

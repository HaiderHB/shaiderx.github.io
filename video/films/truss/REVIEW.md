# Review: Truss launch film (launch format, kit 2.1 cut)

Re-cut on kit 2.1 after Haider's review of the first cut (2026-11-18): "It stays on the title screens way too
long … it should be 3 s per text screen", and "as soon as the result appears the next frame we are onto the next
part … gave no time to read the response". The first cut was 70.6 s with 6.5 s and 6.0 s text screens and results
that stayed 1.6-4.0 s. This cut is 68.7 s; the beat table is in SPEC.md.

## What it shows (68.7 s, kit 2.1.0, accent cobalt)

| Film s | Beat | Text on screen |
| --- | --- | --- |
| 0.0-4.8 | Hook: the page's hero card goes from "No reply. Retrying…" to "Paid once · 1 charge · 1 retry deduplicated", shown at 2.3x | Payment retried. Still charged only once. |
| 4.8-7.8 | What it is (3 s), over the top of the page, blurred | An AI agent that checks subcontractor bills before paying them. / A prototype built for Truss by Haider Bokhari |
| 7.8-10.8 | Problem (3 s), over the resent invoice stamped "REMINDER · PAST DUE" | A timeout or a resent invoice can pay twice. |
| 10.8-15.5 | Hero 1: the invoice image; Read and check is pressed; the page reads it | A subcontractor invoice arrives as an image |
| 15.5-22.4 | Hero 2: the typed bill lands: fields, five lines, totals, retainage, remit-to bank, lien waiver | It reads every line, total and bank detail |
| 22.4-29.4 | Hero 3: the last five of eight checks tick, 8/8 passed | Code checks the PO, the math, past payments |
| 29.4-36.4 | Hero 4: approve 97%, "every check passed", Approve, the reviewer note | A decision model approves; rules can only block |
| 36.4-43.4 | Feature 2a: the payment in flight: attempt 1 times out, attempt 2 is replayed, no new charge | The bank is slow. The browser retries. |
| 43.4-50.2 | Feature 2b: the ledger goes from zeros to 1 charge, 2 requests, 1 retry deduplicated | Same key, so the retry never charges twice |
| 50.2-57.2 | Feature 3: Keystone is "Stopped before payment"; "Try to pay it anyway" is refused with 403 | Already paid? Stopped before any money moves. |
| 57.2-63.7 | Proof: the top of the page, wide | 8/8 checks passed · 1 charge · 1 retry, no new charge / A vision model reads · code checks · a decision model decides · idempotency keys pay once |
| 63.7-68.7 | End card | Built for Truss by Haider Bokhari / Try it live: the link is in my message / haiderb.com |

Chapters on the progress bar: The problem · One bill · Paying once · Caught.

## The result rule, shot by shot

Wait = seconds from the cut to the result being fully on screen. Hold = seconds it then stays before the next cut.
Needs = max(2.5, 0.5 + 0.3 x words), 6 s at most. Landing times were read off the footage frame by frame and checked
again on stills of the composed film at each landing and 0.2 s before each cut.

| Shot | Caption | Wait | Hold | Words counted | Needs |
| --- | --- | --- | --- | --- | --- |
| Hero 1 | A subcontractor invoice arrives as an image | 0 s (the invoice is there from the first frame) | 4.7 s | 13 (the button, its note, the invoice's name and title) | 4.4 s |
| Hero 2 | It reads every line, total and bank detail | 0.9 s | 6.0 s | 102 (the whole typed bill) | 6.0 s |
| Hero 3 | Code checks the PO, the math, past payments | 1.0 s | 6.0 s | 135 (the eight checks) | 6.0 s |
| Hero 4 | A decision model approves; rules can only block | 1.0 s | 6.0 s | 51 (bars, rules floor, Approve, the note) | 6.0 s |
| Feature 2a | The bank is slow. The browser retries. | 1.4 s | 5.6 s | 17 (the two attempt rows) | 5.6 s |
| Feature 2b | Same key, so the retry never charges twice | 0.8 s | 6.0 s | 57 (the three counters, the charge, both requests) | 6.0 s |
| Feature 3 | Already paid? Stopped before any money moves. | 1.85 s | 5.15 s | 13 (the refusal; the "Stopped" banner is up all 7.0 s) | 4.4 s |

Every shot meets the rule. Three notes on how:

- Hero 1's result is the invoice image the caption names, on screen from the first frame. The click starts the
  read and the shot ends 0.08 s before the typed bill appears, so the bill is not flashed and cut: it is hero 2's
  result. The "reading" state itself lasts 1.8 s on the page and cannot be held longer.
- Feature 2a starts 1.1 s after the click (the click is not in the film). From the click to the retried answer is
  2.4 s of real waiting, and with a 5.6 s hold the shot would pass the 7 s caption limit. Its lit box narrows to the
  two attempt rows once they are final; those 17 words are the count.
- Feature 3 keeps the click, so its wait is 1.85 s: the card it clicks in already shows the result the caption
  promises ("Stopped before payment · Already paid …"), and the refusal that lands is 13 words.

One shot from the first cut is gone: the bank-change hold ("Changed bank details? Held for a call."). With honest
holds the eight result shots made the film about 76 s; the limit is 72 s and the rule is to drop the weakest shot,
not shorten a hold. It was the same card as hero 4 at the lowest magnification, and the problem line does not set
it up. Its footage is in the take with a 7.9 s hold if it is wanted back in place of one of the payment shots.

## QA (kit/scripts/qa.mjs, launch rules, kit 2.1)

- Static and `--frames`: PASS, 0 fail, 0 warn. 68.70 s; beats hook, what, problem, hero, feature, feature, proof,
  end, in order; both text screens 3.00 s; 9 launch cues, each one line at 66 px (hook 72 px), on screen >= its
  reading time and <= 7 s; 4 chapters; hero and feature shots show the page at 1.53-2.82x, the hook at 2.26x, the
  proof at 1.41x (wide); every hero / feature shot carries `data-kit-lands` / `data-kit-read` and passes the result
  rule with no wait over half a shot; no camera move under a caption; run "example", labelled.
- HyperFrames check: 0 errors; the kept warnings are the same two kinds as the other launch films
  (timeline_track_too_dense, nested_media_start_basis_ambiguous: starts are composition-local).
- Render (`qa.mjs --video`): PASS, 0 fail, 0 warn. H.264 1920x1080 30 fps + AAC, 68.70 s, 6.7 MB; -20.0 LUFS
  integrated, true peak -6.3 dBTP; fade-in and a fade-out landing on the last frame. Web encode (CRF 26, faststart):
  public/demo-videos/truss.mp4, 2.9 MB.

## Review loop

- Landings: seven strips of footage frames at 0.05-0.1 s steps around each result (the hook card, the typed bill,
  the checks, the decision, the attempts, the ledger, the refusal) to find when each is fully on screen. The
  screencast shows a change 0.1-0.3 s after its DOM mark while spinners run, and rows fade in for 0.3 s, so the
  marks alone were up to 0.5 s early.
- Stills of the composed film: 70 frames (every 3.4 s, every seam, each landing and 0.2 s before each cut), then
  32 frames of the final render at the same landings and cuts. At 0.2 s before every cut the finished result is on
  screen and has been since its landing time: the typed bill
  (16.4-22.4), "8/8 passed" (23.4-29.4), the decision with its note (30.4-36.4), both attempt rows (37.8-43.4), the
  full ledger (44.2-50.2), the refusal (52.05-57.2).
- Fixed on the way: the first long-hold take still cut the checks 0.2 s short in the footage (the reset showed at
  57.43), so the take was recorded again with 7.5-8.9 s after every result; hero 1's caption is 7 words, not 6, so
  the shot is 4.7 s; the hook now opens on "No reply. Retrying…" so "Paid once" has 4.0 s.
- Cold-viewer test: by 10.8 s the viewer has read the outcome, what it is, who built it for whom, and the problem,
  before the first click. Yes.

## Honesty

- Footage: the page's own example, captured with no demo key from an isolated build of the branch. Its model
  outputs (Gemini's JSON for each invoice image, Jev's answers, DeepSeek's notes) were recorded from live runs on
  the Vercel preview on 2026-11-17; the schema check, the eight checks, the rules floor and the payment endpoint run
  in the browser on the same code as the API. `data-kit-run="example"`; chips: "Example run" (hook), "Example run,
  replayed faster" (hero 1: the read replays in 1.8 s, 2.7 s live), "Example run, simulated bank" (feature 2a);
  the page's own "Example run" pill, "(example)" button label and preview notes are on screen.
- The timeout is real timing in the browser: the simulated bank holds its reply 2.5 s after the charge is
  committed, the page gives up at 1.5 s and retries with the same key. The same flow was run live on the preview
  (real HTTP timeout, real retry, Redis-backed idempotency key): 201 charged, 201 replayed, one charge.
- Waits are cut, not sped up: every shot plays at 1x. Shots start after their run was started (the press is off
  screen, or in feature 2a simply earlier than the shot); the two clicks the film shows (Read and check, Try to
  pay it anyway) are real. The example is replayed several times in the take; "New session" empties the
  in-browser ledger before each Northline replay.
- Every hold is real footage; no freeze frames. Nothing on the page is redrawn.
- No voice, no avatar, no Truss logo. Music: the kit's instrumental bed (bright-pluck-112-long).

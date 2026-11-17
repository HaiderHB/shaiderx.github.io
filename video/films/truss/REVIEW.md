# Review: Truss launch film (launch format)

Built on kit 2 in the launch format for the Truss bill-to-payment demo; the beat table is in SPEC.md.

## What it shows (70.6 s, kit 2.0.0, accent cobalt)

| Film s | Beat | Text on screen |
| --- | --- | --- |
| 0.0-4.6 | Hook: the page's hero card goes "Paying…" → "No reply. Retrying…" → "Paid once · 1 charge · 1 retry deduplicated", shown at 2.3x | Payment retried. Still charged only once. |
| 4.6-11.1 | What it is, over the top of the page, blurred | An AI agent that checks subcontractor bills before paying them. / A prototype built for Truss by Haider Bokhari |
| 11.1-17.1 | Problem, over the resent invoice stamped "REMINDER · PAST DUE" | A timeout or a resent invoice can pay twice. |
| 17.1-22.3 | Hero 1: Read and check is pressed beside the invoice image; the scan sweeps it | A subcontractor invoice arrives as an image |
| 22.3-27.6 | Hero 2: the typed bill lands: vendor, invoice, PO, dates, five lines | It reads every line, total and bank detail |
| 27.6-32.9 | Hero 3: eight checks tick, 8/8 passed | Code checks the PO, the math, past payments |
| 32.9-38.2 | Hero 4: approve 97%, "every check passed", Approve, the reviewer note | A decision model approves; rules can only block |
| 38.2-43.8 | Feature 2a: Simulate a timeout and retry: attempt 1 times out, attempt 2 replayed, no new charge | The bank is slow. The browser retries. |
| 43.8-49.1 | Feature 2b: the ledger: 1 charge, 2 requests, 1 retry deduplicated | Same key, so the retry never charges twice |
| 49.1-54.1 | Feature 3a: Crestline: hold 100%, the floor "bank details differ", Hold for review, call the number on file | Changed bank details? Held for a call. |
| 54.1-59.1 | Feature 3b: Keystone: stopped before payment; "Try to pay it anyway" is refused with 403 | Already paid? Stopped before any money moves. |
| 59.1-65.6 | Proof: the top of the page, wide | 8/8 checks passed · 1 charge · 1 retry, no new charge / A vision model reads · code checks · a decision model decides · idempotency keys pay once |
| 65.6-70.6 | End card | Built for Truss by Haider Bokhari / Try it live: the link is in my message / haiderb.com |

Chapters on the progress bar: The problem · One bill · Paying once · Caught.

## QA (kit/scripts/qa.mjs, launch rules)

- Static and `--frames`: PASS, 0 fail, 0 warn. 70.60 s; beats hook, what, problem, hero, feature, feature, proof,
  end, in order; 11 launch cues, each one line at 66 px (hook 72 px), on screen >= its reading time and <= 7 s;
  4 chapters; hero and feature shots show the page at 1.53-2.82x, the hook at 2.26x, the proof at 1.41x (wide);
  13 camera shots and spotlights inside the safe area; no camera move under a caption; run "example", labelled.
- HyperFrames check: 0 errors; the same kept warnings as the GoodTime film (timeline_track_too_dense on the
  captions host, nested_media_start_basis_ambiguous: starts are composition-local).
- Render (`qa.mjs --video`): see the render section below.

## Review loop

- Stills: three passes over the composition (the contact sheet every 3.4 s plus every seam, then nine extra
  frames around the payment, ledger and refusal shots), then the framing sheet.
- Fixed from the stills: the checks and decision cards jumped in height when results landed, so the lit box
  showed the next section's heading before they did (the page now lists all eight checks while a run plays and
  keeps the decision layout with pending bars); the invoice column is sticky, so pinning it fought the page scroll
  and the invoice jittered 17 px in hero 1 (the capture now pins the picker above it); the payment card at 1.6x
  did not read at phone width (the shot is now close on the buttons and the attempt rows, 2.8x); the "Writing…"
  placeholder in the decision card was taller than the note (now one line); the page title sliced beside the hook
  card is dimmed almost out.
- Phone check: nine frames shrunk to 390 px wide. Every caption, the hook card ("Paying…", "Paid once", 8/8,
  Approve 97%), the typed bill's fields and lines, the 8/8 pill and ticks, the hold bar, "Stopped before payment",
  the 403 refusal, the ledger's 1 / 2 / 1 and both attempt rows read. The checks' detail text and the request log's
  notes are small at that width; the captions carry those shots. The wide proof shot restates its numbers large.
- Cold-viewer test: by 17.1 s the viewer has read the outcome, what it is, who built it for whom, and the problem
  (a timeout or a resent invoice can pay twice), before the first click. Yes.

## Honesty

- Footage: the page's own example, captured with no demo key from an isolated build of the branch. Its model
  outputs (Gemini's JSON for each invoice image, Jev's answers, DeepSeek's notes) were recorded from live runs on
  the Vercel preview on 2026-11-17; the schema check, the eight checks, the rules floor and the payment endpoint run
  in the browser on the same code as the API. `data-kit-run="example"`; chips: "Example run" (hook), "Example run,
  replayed faster" (hero 2: the extraction replays in 1.8 s, 2.7 s live), "Example run, simulated bank" (feature
  2a); the page's own "Example run" pill, "(example)" button label and preview notes are on screen.
- The timeout is real timing in the browser: the simulated bank holds its reply 2.5 s after the charge is
  committed, the page gives up at 1.5 s and retries with the same key. The same flow was run live on the preview
  (real HTTP timeout, real retry, Redis-backed idempotency key): 201 charged, 201 replayed, one charge.
- The example is replayed several times in the take (the hero's four shots, the payment, the ledger); "New
  session" empties the in-browser ledger before each Northline replay so it is not a duplicate of the last
  replay's payment. Three presses are off screen (the capture script); the three clicks the film shows are real.
- Every hold is real footage at 1x; no freeze frames, no speed changes. Nothing on the page is redrawn.
- No voice, no avatar, no Truss logo. Music: the kit's instrumental bed (bright-pluck-112-long).

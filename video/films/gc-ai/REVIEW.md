# Review: GC AI launch film v2 (launch format)

Rebuilt on kit 2 after Haider's notes on v1: too fast, hard to know where to look, straight into the UI
without saying what the product is or what problem it solves. v1 was 45 s, seven steps, the whole page on
screen and captions about mechanics. v2 is 68.2 s in the launch format; the beat table is in SPEC.md.

## What it shows (68.2 s, kit 2.0.0, accent cobalt)

| Film s | Beat | Text on screen |
| --- | --- | --- |
| 0.0-4.2 | Hook: clauses 11-12 while tracked changes land, shown at 2.7x | Vendor contract, redlined in 23 seconds |
| 4.2-10.2 | What it is, over the review, blurred | An AI assistant that redlines contracts against your playbook. / A prototype built for GC AI by Haider Bokhari |
| 10.2-16.2 | Problem, over the vendor's original contract | Reviewing a vendor's contract clause by clause is slow. |
| 16.2-20.9 | Hero 1: Review is pressed | Your playbook sets the rules. Press Review. |
| 20.9-26.2 | Hero 2: four changes land in clauses 3-4 | Changes land in the document as tracked changes |
| 26.2-31.5 | Hero 3: one change card, selected | Every change cites the playbook rule behind it |
| 31.5-36.8 | Hero 4: the clause's decision | A call per changed clause: accept, negotiate, escalate |
| 36.8-42.1 | Feature 2a: the tracked change in clause 12, selected | Every edit is pinned to the exact words |
| 42.1-46.8 | Feature 2b: the refused edit | If it can't find them, it refuses |
| 46.8-51.1 | Feature 3a: one change accepted | Accept or reject each change yourself |
| 51.1-56.4 | Feature 3b: the .docx button | Download a Word file with real tracked changes |
| 56.4-63.2 | Proof: the finished review, wide | 13 clauses · 14 redlines · 2 refused / Under the hood: an LLM drafts · code verifies every edit · a decision model routes changed clauses |
| 63.2-68.2 | End card | Built for GC AI by Haider Bokhari / Try it live: the link is in my message / haiderb.com |

Chapters on the progress bar: The problem · The review · No guessing · Word export.

## QA (kit/scripts/qa.mjs, launch rules)

- Static: PASS, 0 fail, 0 warn. 68.20 s; beats hook, what, problem, hero, feature, feature, proof, end, in order;
  10 launch cues, each one line at 66 px (hook 72 px), on screen >= its reading time and <= 7 s; 4 chapters;
  hero and feature shots show the page at 2.1-2.8x, the hook at 2.7x, the proof at 1.1x; 10 camera shots and
  10 spotlights inside the safe area; no camera move under a caption; run "example", labelled on screen.
- Render (qa.mjs --video): H.264 1920x1080 30 fps + AAC, 68.20 s, 8.7 MB; -20.0 LUFS integrated, true peak
  -6.3 dBTP; fade-in and a fade-out landing on the last frame. Web encode (CRF 26, faststart): 3.6 MB.
- HyperFrames check: 0 errors; kept warnings as in v1: timeline_track_too_dense (captions host, hero scene),
  nested_media_start_basis_ambiguous (starts are composition-local).
- The three kit 1.1 films (assemblyai, distru, great-question) still pass their own rules under the new qa.mjs.

## Review loop

- Three passes over stills: 48 frames of the composition (every 3.4 s plus every seam), then 36 frames of the
  first render around every cut and every click, then 15 frames of the final render.
- Fixed from the stills: the hook's first frame had no redline yet (the footage now starts where one is already
  on screen); the band and the spotlights faded in after each cut, which flashed the white page (they now
  switch with the cut); a camera move between two lit shots showed the page undimmed (now a cut); the lit box
  around the playbook form covered the old status line before the click (two spotlights, the first on the form
  as it is before the click); the parked cursor was still fading at the start of the Review and proof shots
  (both start later); the proof numbers crowded the chapter labels.
- Phone check: six frames shrunk to 390 px wide. Captions, the hook's clause, the change card, the decision
  bars, the refused edit and the proof numbers read. The clause text in hero 2 is small at that width (the
  red and blue redlines still read; the caption says what happens). The wide proof shot is not readable at
  that width by design: its three numbers are restated large.
- Cold-viewer test: by 16.2 s the viewer has read the outcome, what it is, who built it for whom, and the
  problem, before the first click. Yes.

## Honesty

- Footage: the page's own example run, captured with no demo key: the exact event stream of a live run on the
  Vercel preview (22.9 s), replayed 2x by the page. `data-kit-run="example"`; the hook and the "changes land"
  shot carry the chip "Recorded live run, replayed 2x"; the page's own pill reads "Example run" and its notice
  says so when Review is pressed. "23 seconds" is the live run's 22.9 s. No live calls during capture.
- Footage plays at 1x everywhere; no freeze frames (every hold was recorded).
- The problem beat's backdrop is the page with every suggestion rejected, which shows the vendor's own text.
- The Word claim was checked on the file the take downloaded: 13 w:del, 12 w:ins, trackRevisions on, comments.
- Proof numbers are the run's: 13 clauses reviewed, 16 edits proposed, 14 drawn as redlines, 2 refused.
- No voice, no avatar, no target-company logo. Music: the kit's ElevenLabs instrumental bed, extended to 94 s
  by repeating 16 bars (one splice on the beat). The splice was checked by measurement (loop lag, levels across
  the join), not by ear.

## Where it falls short of the standard

- Hero 1: the screen is still for about 0.65 s before the cursor appears (the standard says 1-1.5 s); the click
  itself comes 2.2 s after the caption. The other four action shots hold 1.0-1.2 s first.
- Feature 3b: pressing .docx shows nothing on the page (a headless browser has no download bar), so the result
  of the film's last action is carried by the caption alone. Showing the downloaded file open in Word would be
  the strongest closing shot, but it is not page footage: Haider's call.
- Hero 1's visible result is the page's preview notice, and the dimmed status line under the form reads
  "Reviewed 13 clauses in 22.90 s" before Review is pressed, because the page plays its example on load.
- The proof beat's under-the-hood line (16 words) and the end card (17 words in 5 s) are not held to the
  0.6 s per word rule; the three proof numbers are (6 words, 6.8 s).
- Spotlights are static boxes: while changes land, the lit box in the hook and in hero 2 also covers two lines
  of the next clause until the clause above has grown.
- 2x capture records about 12-14 changed frames per second while changes stream (the film itself is 30 fps);
  cursor glides and the insert animation are slightly stepped.
- The page's own labels ("Anchored", "Rule fit 91%", "Jev · 4 typed questions") are visible inside the zoomed
  cards. They are the real UI; the captions do not use them.

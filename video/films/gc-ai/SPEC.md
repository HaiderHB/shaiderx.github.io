# SPEC: GC AI launch film v2 (kit 2, launch format)

GOAL:    A stranger at GC AI (the role: Microsoft Office integrations) watches 68 s, sound on or off, on a laptop
         or a phone. After 16 s they can say what this is (an AI assistant that redlines a vendor's contract
         against your playbook) and what problem it solves (clause-by-clause review is slow). By the end they
         have seen ONE review done, know it never guesses an edit, know it exports a real Word file with
         tracked changes, and know where to try it. Text carries everything; no voice.
OUTPUT:  HyperFrames 1920x1080, 30 fps, H.264 + AAC, < 20 MB. Web encode (CRF 26, faststart) committed as
         public/demo-videos/gc-ai.mp4. Music: kit bed bright-pluck-112-long, its own ending on the last frame,
         -20 LUFS integrated, fades 0.3 / 1.5 s.
TIME:    68.2 s, 8 scenes, 3 features (the review, no guessing, the Word file).
LOOK:    kit 2 launch format, accent cobalt #6896ff (the demo page's accent). Captions 66 px, one line, no
         kicker; four chapter labels over a thin progress bar.
RUN:     example (data-kit-run="example"). Preview mode, no keys, no live calls: the page replays its recorded
         live run of the Customer-side SaaS playbook (DeepSeek V3.2 + the decision model, 22.9 s live on the
         Vercel preview, recorded 2026-11-16) at 2x and labels it "Example run".

## Beat table (as built)

Reading time = max(2.5, 0.5 + 0.6 x words). Page shown at = camera zoom x 1.41 (the 1360 px capture on the 1920 stage).

| # | Beat | Film s | Picture (clip, media s) | Text on screen | Words / needs / gets | Focus box, page shown at | Honesty |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | HOOK | 0.0-4.2 | Clauses 11-12 while tracked changes land: the liability cap already reads "twelve (12) months" on frame 0, the mutual cap lands from 0.3 s, the venue from 1.2 s, then a 2 s hold (review 13.75-17.95) | "Vendor contract, redlined in 23 seconds" | 6 / 4.1 / 4.2 s | `c11` + `c12`, 2.7x | chip "Recorded live run, replayed 2x"; 23 s = the live run's 22.9 s |
| 2 | WHAT IT IS | 4.2-10.2 | The review streaming, blurred 10 px and dimmed (review 6.0-12.0) | "An AI assistant that redlines contracts against your playbook." + "A prototype built for GC AI by Haider Bokhari" | 9 / 5.9 / 6.0 s | statement | |
| 3 | PROBLEM | 10.2-16.2 | The vendor's original contract, scrolled slowly, blurred 5 px and dimmed (before 0.6-6.6), document pane only | "Reviewing a vendor's contract clause by clause is slow." | 9 / 5.9 / 6.0 s | statement | the "before" picture is the page with every suggestion rejected, which shows the vendor's own text |
| 4 | HERO 1 | 16.2-20.9 | The playbook form; Review is pressed at 18.37; the page's preview notice appears (review 0.9-5.6) | "Your playbook sets the rules. Press Review." | 7 / 4.7 / 4.7 s | `setup`, 2.1x | the notice on the page says it replays a recorded run |
| 4 | HERO 2 | 20.9-26.2 | Clauses 3-4: four changes land between 22.0 and 23.4, then hold (review 5.4-10.7) | "Changes land in the document as tracked changes" | 8 / 5.3 / 5.3 s | `c3` + `c4`, 2.2x | chip "Recorded live run, replayed 2x" |
| 4 | HERO 3 | 26.2-31.5 | One change card (rule R4, the reason, the words); it is selected at 28.71 (review 18.9-24.2) | "Every change cites the playbook rule behind it" | 8 / 5.3 / 5.3 s | `cardC4`, 2.8x | |
| 4 | HERO 4 | 31.5-36.8 | The clause's decision: Negotiate 99%, Accept 0%, Escalate 1% (review 24.2-29.5) | "A call per changed clause: accept, negotiate, escalate" | 8 / 5.3 / 5.3 s | `head4` + `jev4`, 2.8x | 7 of the 13 clauses were changed; each got a call (all "negotiate" in this run) |
| 5 | FEATURE 2a | 36.8-42.1 | Clause 12: the venue change, selected at 39.25 (review 32.1-37.4) | "Every edit is pinned to the exact words" | 8 / 5.3 / 5.3 s | `c12`, 2.7x | |
| 5 | FEATURE 2b | 42.1-46.8 | The refused edit: "California" appears twice in clause 12, so the document was not changed (review 39.3-44.0) | "If it can't find them, it refuses" | 7 / 4.7 / 4.7 s | `refused2`, 2.8x | |
| 6 | FEATURE 3a | 46.8-51.1 | Accept is pressed on the liability-cap change at 49.1; the card says Accepted (review 46.5-50.8) | "Accept or reject each change yourself" | 6 / 4.1 / 4.3 s | `cardC13`, 2.8x | |
| 6 | FEATURE 3b | 51.1-56.4 | The .docx button is pressed at 53.55 (review 52.2-57.5) | "Download a Word file with real tracked changes" | 8 / 5.3 / 5.3 s | `taskFoot` (spotlight on `docxBtn`), 2.8x | 13 changes were still pending, so the file carries them as tracked changes: the downloaded file has 13 w:del, 12 w:ins, trackRevisions on |
| 7 | PROOF | 56.4-63.2 | The finished review, the whole add-in window (review 61.5-68.3) | "13 clauses · 14 redlines · 2 refused" + "Under the hood: an LLM drafts · code verifies every edit · a decision model routes changed clauses" | 6 / 4.1 / 6.8 s | `window`, 1.1x (wide) | the run's own counts: 13 clauses reviewed, 16 edits proposed, 14 drawn, 2 refused |
| 8 | END | 63.2-68.2 | End card | "Built for GC AI by Haider Bokhari" / "Try it live: the link is in my message" / "haiderb.com" | 5.0 s | | |

Chapters on the progress bar: The problem (0) · The review (16.2) · No guessing (36.8) · Word export (46.8).

## What changed from the suggested story, and why

- Hook: "Vendor contract, redlined in 23 seconds" (6 words, 4.1 s) instead of "A vendor contract, ..." (7 words
  need 4.7 s, longer than the hook).
- Proof numbers are this run's: 14 redlines and 2 refused, not 11 and 1.
- Feature 3 is "accept or reject each change" then "download a Word file with real tracked changes", not
  "accept all, then download": the export writes accepted changes as plain text, so after Accept all the file
  would hold no tracked changes. One change is accepted; the other 13 are exported as tracked changes.
- "A call per changed clause", not "each clause": only the 7 clauses with changes get a decision.
- The Review shot says "Your playbook sets the rules. Press Review." because the default playbook is already
  selected: one action per shot.

## Footage

Two takes recorded 2026-11-16 with kit/scripts/capture.cjs at 1360x765 CSS px, 2x device pixels (frames
2720x1530), cursor 0.75 with idle hide, 450 ms rest before clicks, from an isolated `next start -p 3167` copy of
the branch with no demo key (preview mode). No live calls.

- `before` (8.4 s): the example run finishes and every suggestion is rejected in the pre-roll, so the page
  shows the vendor's original text; the document pane is scrolled slowly.
- `review` (68.4 s): one continuous take. Review at 3.07; one wheel tick so the page stops following the
  newest redline (the script then scrolls the panes); changes land 4.15-14.73 (clause 3 at 4.15 and 6.51,
  clause 4 at 6.97 / 7.40 / 7.91, clause 11 at 12.70 and 13.75, clause 12 at 14.73), done 14.8; card C4
  selected 21.41; clause 12 change selected 34.55; refused list 38.9-45.1; Accept on C13 48.80; .docx 54.65;
  wide 59.9-68.4. Every hold in the film is real footage: no speed changes, no freeze frames.
  The footage shows each change about 0.2-0.4 s after its DOM time and the page animates insertions in over
  up to a second, so shots start on what the footage shows (checked on frames), not on the event times.

## Cold-viewer test

After 16.2 s a stranger has read: "Vendor contract, redlined in 23 seconds", "An AI assistant that redlines
contracts against your playbook. A prototype built for GC AI by Haider Bokhari", and "Reviewing a vendor's
contract clause by clause is slow", over a clause being redlined, the product, and a wall of contract text.
They can say what it is and what it is for before the first click.

# SPEC: Superhuman launch film (kit 2, launch format)

GOAL:    A stranger at Superhuman watches 60-75 s, sound on or off, on a laptop or a phone. After 15 s they can
         say what this is and what problem it solves; by the end they have seen ONE real task done and know
         where to try it. Text carries everything (no voice); one instrumental bed sits under it.
OUTPUT:  HyperFrames 1920x1080, 30 fps, H.264 + AAC, < 20 MB. Music: one kit bed (bright-pluck-112-long for
         60-90 s) at -20 LUFS integrated, fades 0.3 / 1.5 s. Web encode: H.264 CRF ~26, faststart.
RUN:     <live | example | cached | mixed> (data-kit-run on the root). What was recorded, when, with which keys.

## Beat table (write this first; QA gates it)

Captions: one idea, one line, <= 8 words (12 at the very most), plain words, why it matters and not what was
clicked. Reading time = max(2.5, 0.5 + 0.6 x words) s, never over 7 s. Each caption starts on the cut of its
shot; the screen holds still ~1 s, ONE action happens, the result holds >= 1.5 s, cut.

| # | Beat | Seconds | Picture (real page footage) | Text on screen | Words / needs | Focus box (tracked component) | Honesty |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | HOOK | 0.0-4.2 | the best moment already happening, zoomed 1.5-2x | "<the outcome, <= 7 words>" | 6 / 4.1 s | `result` | label an example run / a speed change |
| 2 | WHAT IT IS | 4.2-10.2 | the product, blurred and dimmed | "<one plain sentence a stranger understands>" + "A prototype built for Superhuman by Haider Bokhari" | 9 / 5.9 s | (statement) | |
| 3 | PROBLEM | 10.2-16.2 | the "before" state, blurred and dimmed | "<the pain, in the viewer's own world>" | 9 / 5.9 s | (statement) | |
| 4 | HERO 1 | 16.2-21.2 | start the task: ONE action | "<...>" | 7 / 4.7 s | `input` | |
| 4 | HERO 2 | 21.2-26.2 | the work happens | "<...>" | 7 / 4.7 s | `output` | speed tag if sped up |
| 4 | HERO 3 | 26.2-31.2 | the result, one detail | "<...>" | 7 / 4.7 s | `card` | |
| 4 | HERO 4 | 31.2-36.2 | the result, the decision | "<...>" | 7 / 4.7 s | `decision` | |
| 5 | FEATURE 2 | 36.2-45.2 | one idea tied to the same problem (1-2 shots) | "<...>" / "<...>" | | | |
| 6 | FEATURE 3 | 45.2-54.2 | the coolest one, last (1-2 shots) | "<...>" / "<...>" | | | |
| 7 | PROOF | 54.2-61.2 | the finished result, wider | 1-3 real numbers from the run + "Under the hood: <the ONE line for technical viewers>" | | `window` | numbers come from this run |
| 8 | END | 61.2-66.2 | end card | "Built for Superhuman by Haider Bokhari" / "Try it live: the link is in my message" / "haiderb.com" | | | |

Chapters (3-4 plain labels on the progress bar): <The problem> · <The task> · <Feature 2> · <Feature 3>

## Rules that are easy to break

- No title card, no logo of Superhuman, no kicker ("STEP 3 · ..."), no stepper, no "If I join" content.
- No internal names or jargon in captions ("a decision model", not the model's name; "pinned to the exact
  words", not "anchored"). Implementation terms go in the proof beat's under-the-hood line only.
- One focal point per shot: zoom the active area so the page shows at >= 1.5x (camera zoom x stage scale) and
  spotlight it (.kit-spot). A wide view of the whole page appears only in the hook or the proof beat.
- Anything the viewer must read is large enough at phone width (check frames at 390 px) or restated in the caption.
- Real page footage only, nothing redrawn. Cut waits. Label speed changes with the rate, example runs and held frames.
- Record at 2x (capture/record.cjs: viewport 1360x765, deviceScaleFactor 2) so zooms stay sharp.

## Footage (fill in after capture)

Takes, what each shows, the media time of every click and of every result (from data/clips/<take>.json marks).

## Cold-viewer test (answer before the final render)

After 15 seconds, could a stranger say what this is and what problem it solves? What on screen tells them?

# Review: Distru launch film v2

## What changed from v1 (82.1 s -> 48.3 s)
- Rebuilt on video/kit: cold-open, next-steps and end-card blocks; footage scenes driven by shot JSON;
  captions animated by Kit.captions from the HTML timing.
- No title or problem card: product footage from frame 0 (cold open = the real page as sample 2 is
  picked), headline in the caption band. The "Distru today / next per job post" card is gone; the
  next-steps card carries the "harness + MCP" ask.
- Every camera keyframe frames its WHOLE component above the caption band (Kit.camera.fit); v1's
  1.6-1.75x push-ins that cropped the email, decision and reply cards are replaced by fitted framings
  (1.28-2.0x). Big components are split into their real parts (sample list + email text, run button,
  extract block, check block) instead of being cropped.
- Speed changes are 6x everywhere (was 6x/4x/4x) and each is tagged.

## QA (kit/scripts/qa.mjs)
- 48.32 s, first product frame 0.00 s, 20 camera keyframes + 6 rings all inside the safe area, 3 speed changes
  labelled, 0 fail, 0 warn. HyperFrames check: 0 errors; kept warnings: film_silent (requested),
  timeline_track_too_dense (one captions host by design), nested_media_start_basis_ambiguous (starts are
  composition-local).
- Looked at: renders/qa/contact-sheet.jpg (every 3 s + seams), renders/qa/framing-sheet.jpg (one frame
  per shot with focus box and safe area), and frames of the rendered MP4.

## Framing notes
- Boxes for these 2026-11-14 takes were measured on the frames (they predate DOM-box capture); overlays
  were checked by eye on the framing sheet.
- The sales order card's bottom padding was below the recorded viewport in the take. The shot frames the
  order's content (title through the footnote) whole, bottom-aligned with captions off so the footage edge
  falls below the frame edge (no visible cut). The caption band is off for those 2 s.
- The email and trace cards' top borders sit under the demo page's own sticky header in the takes (page
  behaviour); their titles and contents are fully visible.

## Honesty
- Sample 2 and 3 runs were uncached live calls (pill: "Live · deepseek/deepseek-v3.2").
- In the eval run, sample 1 ran live; samples 2 and 3 replayed the same-day cache of the runs above: the
  RESULT caption has a "cached replay" chip and a note.
- Jump cuts: cursor travel before Run agent (sample 3) and Call tool, and the page scrolls to the decision
  and to the MCP result. The last 1 s of the sales order is the take's final frame held (page static).
- Ground patches keep the local dev URL ("claude mcp add ... localhost:3120") and the neighbouring
  "Design choices"/"Evals" sections out of frame.
- Silent: no music, no voice, no avatar.

## Weakest shot
- run2 "check" (9.75-11.72): six tool calls land in ~1 s of real time; at 1.44x the rows are readable but
  the caption is on for only 1.83 s.

# Review: Distru launch film v3

## What changed from v2 (48.3 s -> 50.2 s)
- Haider's new direction (kit 1.1): no voice of any kind; the caption band carries the whole story as a
  product demo (kicker = step, one headline, optional detail, an 8-step progress stepper); a light
  instrumental bed (bright-pluck-112) under the whole film; no "If I join / First 30 days" card; the end
  card is the sign-off alone (Haider Bokhari · haiderb.com).
- All footage re-recorded on the revamped demo UI with kit/scripts/capture.cjs (true DOM boxes); the v2
  frame-measured boxes are gone. Palette follows the new UI: ground #0a0a0f, accent iris #8e78ff.
- New UI strengths used: the run-at-a-glance card (cold open: Live run, 4 of 4 stages, Needs review,
  12.48 s, 7 tool calls, $2,352.00), the "Live · deepseek" trace with stage timings, the decision gauge and
  probability bars, the 9/9 eval ring, the MCP callers diagram and tool panel.
- Annotations (kit 1.1) point at the proof: "Flagged vague" (the extraction's VAGUE tag), "Garlic Cookies out
  of stock" (check_inventory), "Same verdict the agent got" (the MCP result).
- Close-ups on one column of the two-column page put the frame edge in the 24 px gutter (kit 1.1.1 `edge`),
  and frame tops sit under the page's sticky header, so no neighbouring card is sliced.

## QA (kit/scripts/qa.mjs)
- 50.24 s, first product frame 0.00 s, 15 camera keyframes + 3 annotations inside the safe area, 3 speed
  changes labelled (6x), 11 cues each on screen >= its reading time, one music bed, no voice: 0 fail, 2 warn
  (the cold open frames the hero with a measured box: the take did not track the hero, see Honesty).
- Render (qa.mjs --video): H.264 1920x1080 30 fps + AAC, -20.0 LUFS integrated, true peak -6.2 dBTP,
  fade-in (first 30 ms -48 dB) and fade-out landing on the last frame (last 50 ms below -100 dB).
- No voice: the render's audio nulls against the bed excerpt (correlation 0.9998, residual 34 dB down,
  no 2 s window above -30 dB), so nothing but the bed is in the mix.
- HyperFrames check: 0 errors; kept warnings: timeline_track_too_dense (one captions host by design),
  nested_media_start_basis_ambiguous (starts are composition-local).
- edges.mjs: 2 advisory hits, both the dark padding of the page's sticky header pill at the top edge
  (tools shot, MCP section shot), chosen so the Check title and the header pill are whole.
- Looked at: renders/qa/contact-sheet.jpg, renders/qa/framing-sheet.jpg, renders/qa-video/contact-sheet.jpg
  and full-resolution frames of the render.

## Honesty
- Sample 2 and sample 3 were live, uncached runs (pill "Live · deepseek/deepseek-v3.2"). In Run evals,
  sample 1 ran live; samples 2 and 3 replayed today's cache of those runs: the evals cue has a
  "Cached replay" chip and the detail line says so. Live runs used: 3.
- Speed: 6x on the s2 extraction call, the whole s3 run and the eval wait, each tagged.
- Jump cuts skip page scrolls and cursor travel; one 2.03 s held frame of the static decision/reply view.
- Ground patches keep the recording's local "claude mcp add ... http://localhost:3160/..." row out of frame.
- The cold open's framing box (the page hero: title, glance card, pipeline strip, 340,132 1240x503) was
  measured on the same page in a layout probe, because record.cjs tracked the pipeline strip under the wrong
  class (`Charts_flow`; fixed to `Timeline_flow` for the next take).
- No voice, no avatar, no cloned voice. Music: ElevenLabs instrumental bed from kit/music.

## Weakest shot
- Step 1 (2.4-5.8 s): before Run agent is clicked, the trace panel still shows the page's own example run
  (labelled "Example run" by the page). It is the real page state, but a viewer may read it as the live run
  for a moment; the click resets it to the live trace at 5.6 s.

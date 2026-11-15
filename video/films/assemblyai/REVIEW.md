# Review: AssemblyAI launch film v2

## What changed from v1 (82.5 s -> 45.95 s)
- Rebuilt on video/kit: cold-open, next-steps and end-card blocks; four footage scenes driven by shot
  JSON; one captions host animated by Kit.captions. No title card, no north-star quote card: real page
  from frame 0 (the hero: the task and "3 failures"), headline in the band.
- All footage recaptured today with kit/scripts/capture.cjs, so every focus has true DOM boxes and the
  UI is the current demo ("Explain and fix", reviewed Fix lines). The old takes were not reused: they
  had no DOM boxes, two predated the demo's latest copy, and the Explain take was from an older prompt.
- New beats: the proposed MCP tools and the one-line README fix (closes the L9 SyntaxError story).
  Dropped: the separate north-star card, the eval design card (it is visible under the README fix shot
  with its own "Design only. No results yet." badge), the HB monogram end animation.

## QA (kit/scripts/qa.mjs)
- 45.95 s, first product frame 0.00 s, 11 camera keyframes + 3 rings inside the safe area, 1 speed change
  (4x) labelled, 0 fail, 0 warn. hyperframes check: 0 errors; kept warnings: film_silent (requested),
  nested_media_start_basis_ambiguous (starts are composition-local), timeline_track_too_dense (one
  captions host by design).
- kit/scripts/edges.mjs (new): no tracked neighbour sliced at a frame edge except the checker's
  Run again button at the explain start, which sits under the demo's own sticky header (not visible).
- Looked at: renders/qa/contact-sheet.jpg and framing-sheet.jpg from snapshots and again from the
  rendered MP4, full-resolution crops of the frame tops (1.0, 5.5, 22.05 s) and frames of the MP4 at
  8.0, 12.2, 20.6, 24.8, 37.8, 45.85 s.
- Render: H.264 1920x1080 30 fps, 45.97 s (1379 frames), 11.5 MB, no audio track.

## Framing notes
- Every shot shows its focus whole above the band. Beyond QA, the frame edges were moved into
  whitespace so no neighbouring card, button or text line is sliced at the top or sides:
  checker push-ins use `align: top, pad: 0, margin: 4` (top edge between the hint line and the panels),
  the Reference fix shot `align: top, margin: 52` (keeps the section title, half under the page's sticky
  header, out), gaps `align: bottom, pad: 0, margin: 0` (top edge below the section intro), tools
  `pad: 0, margin: 0`, the README fix `align: top-left` at column-fit zoom after a recapture that scrolls
  the README to the top of the viewport (at 2x the tool cards above it were cut at the top edge).
- The L9 and L43-44 focus uses code rows recorded with capture.cjs's new `clip` option (only the part
  visible in the code pane), so the rings sit on the visible line, not on the 947 px row.
- The 4x model wait and the reply arrival are framed on the whole panel head; the findings are shown at
  1.46x (reply text ~22 px on a 1080p frame).

## Honesty
- Explain and fix: ONE live, uncached run (DeepSeek V3.2 via fal) on First try, right after a server
  restart (in-memory cache empty). Labelled "Live run · uncached". The 7.2 s model wait is shown at 4x
  (tagged). The server streams the finished answer word by word (8 ms/word) once the call returns; the
  film does not claim token streaming. Reply text kept in capture/explain-reply.txt; read in full: no
  contradictions (L7 stays GET with force-dynamic, L8's fetch uses POST, L9 defers to L8, L43-44
  Terminate then wait).
- "Each Fix line is reviewed text": true of this demo version (b99700c onwards): the model writes the
  "what breaks" sentence per check; the Fix line is canonical text for that check.
- First try: the caption says "built from AssemblyAI's own snippets" and does not claim an agent run
  (the demo README: assembled by hand from the material an agent reads). The page's own hero label
  "The agent's first try" is visible in the cold open.
- Reference fix: "Rule checks only; no live AssemblyAI session yet" (the demo never opened a real session).
- Proposals are captioned "Proposed, not shipped"; the eval box carries the page's "Design only. No
  results yet." badge.
- Jump cuts over page scrolls only (hero -> checker, checker -> gaps, tools -> README fix). No held
  frames, no stills. Silent: no music, no voice, no avatar, no AssemblyAI logo.

## Weakest shots
- Explain findings at 1.46x: readable on a laptop, small on a phone. A tighter push would slice the
  panel head or the button at the frame edge; the caption carries the point.
- The checker holds one 1.77x framing for ~8.7 s (4.6-13.3 s); the motion comes from the cursor, two
  rings, the L43 click, the code-pane scroll and the line flash, not the camera.
- The README fix shot is top-left with the eval design box filling the lower frame; it reads, but the
  diff is not centred.
- Next steps is 3.5 s (the brief's cap) for three short lines.

# Review: GoodTime launch film

## What it shows (44.65 s)
- Cold open on the page's own glance card: "Loop at risk" (Priya's chip red) flips to "Loop rescued" (Wei's chip),
  headline "Interviewer out. Loop rescued."
- Six steps on the v2 band: the dropout message and the calendar block turning red; the run trace (DeepSeek's
  report_dropout tool call, then getLoop, findQualifiedInterviewers, checkAvailability, scoreOptions, holdSlot);
  Jev's probabilities over the three repairs beside the calendar with Wei held; the candidate asking for Thursday
  afternoon and the replan (coding and the hiring manager round move, the manager stays last); drafted messages
  per channel; the audit trail.
- Annotations point at the proof: "Dropped: out sick" (the calendar block), "Only Wei passes every rule"
  (checkAvailability), "Manager moved to stay last" (Thursday column).

## Honesty
- Footage is the real page, recorded from an isolated production build in preview mode: the example run. Its model
  outputs (two DeepSeek tool calls, Jev's answer, the drafts) were recorded from live runs on the Vercel preview the
  same day; every tool call, check, hold and calendar change in the footage is computed in the browser by the same
  code the API runs. The first cue carries an "Example run" chip and the page's own pill says "Example run".
- No speed changes, no held frames. Jump cuts skip page scrolls only.
- The opening shot frames the message card with a measured box (the take did not track that card); QA lists it.
- No voice of any kind; the only sound is the bright-pluck-112 bed. No avatar, no GoodTime logo.

## QA (kit/scripts/qa.mjs)
- 44.65 s (WARN: target 45-55 s, under the 60 s cap), first product frame 0.00 s, 9 camera keyframes and
  3 annotations inside the safe area, 7 cues each on screen >= its reading time, one music bed, no voice:
  0 fail, 3 warn (duration; the measured box; the checkAvailability label sits over the calendar column because the
  trace shot has no clear space on the right).
- HyperFrames check: 0 errors; kept warnings: timeline_track_too_dense (one captions host by design),
  nested_media_start_basis_ambiguous (starts are composition-local), two "not on the page at media x" notes for
  components that appear during the hold (the shots use a `window` from the moment they exist).
- edges.mjs (advisory): the trace and audit shots slice the sticky calendar at the left frame edge; the drafts shot
  keeps the calendar whole beside the drafts.
- Render (qa.mjs --video renders/goodtime-launch.mp4): PASS. H.264 1920x1080 30 fps + AAC, 44.67 s, 8.0 MB,
  -20.0 LUFS integrated, true peak -6.1 dBTP, fade-in (first 30 ms -43.5 dB) and fade-out landing on the last frame
  (last 50 ms -97.5 dB).
- Web encode for the site: public/demo-videos/goodtime.mp4 (libx264 slow, CRF 26, yuv420p, AAC 128k, faststart),
  2.2 MB.
- Looked at: renders/qa/contact-sheet.jpg (before and after the render), renders/qa/framing-sheet.jpg.

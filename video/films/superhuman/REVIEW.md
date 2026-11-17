# Review: Superhuman launch film (launch format, kit 2.0.0)

69.3 s, 8 scenes, accent iris. Beat table and footage notes: SPEC.md.

| Film s | Beat | Text on screen |
| --- | --- | --- |
| 0.0-4.2 | Hook: the approval gate holds the agent's reply; the judge's scores land | Inbox triaged. Nothing sends without you. |
| 4.2-10.7 | What it is, over the workspace, blurred | An AI email agent that only does what you allow. / A prototype built for Superhuman by Haider Bokhari |
| 10.7-16.6 | Problem, over the untouched inbox | An agent that can send email can send mistakes. |
| 16.6-21.9 | Hero 1: Run the agent | Triage the inbox and answer what's urgent |
| 21.9-27.2 | Hero 2: the tool-call log: reads, then labels | It reads first, then labels and flags |
| 27.2-32.5 | Hero 3: the reply lands at the gate with its scores | Its reply stops here, with a fact-check score |
| 32.5-37.8 | Hero 4: Approve and send | Nothing is sent until you approve it |
| 37.8-42.8 | Feature 2a: the grant narrowed to Read + draft | Narrow its access to read and draft |
| 42.8-47.8 | Feature 2b: archive and label calls blocked | The server blocks every change it tries |
| 47.8-52.5 | Feature 3a: the eval summary tiles | Eight test tasks grade every change |
| 52.5-57.8 | Feature 3b: task 6 opened, the scam reply caught | They caught a reply drafted to a scam |
| 57.8-64.3 | Proof: the eval section, wide | 8 test tasks · 0 out-of-scope calls · 0 unapproved sends / An LLM calls MCP-style tools · the server enforces scopes · a decision model grades replies |
| 64.3-69.3 | End card | Built for Superhuman by Haider Bokhari / Try it live: the link is in my message / haiderb.com |

## QA (kit/scripts/qa.mjs, launch rules)

- Static: PASS, 0 fail, 0 warn. Beats in order; 10 launch cues, one line at 68 px (hook 72 px), each on screen
  >= its reading time and <= 7 s; 4 chapters; hero and feature shots show the page at 1.6-2.8x, the hook at 1.7x,
  the proof at 1.41x (wide, by intent); no camera move under a caption; run "example", labelled on screen.
- HyperFrames check: 0 errors; 7 lint warnings of the kinds the other launch films keep
  (timeline_track_too_dense, nested_media_start_basis_ambiguous: starts are composition-local).
- Render (qa.mjs --video): H.264 1920x1080 30 fps + AAC, 69.30 s, 8.8 MB; -20.0 LUFS integrated, true peak
  -6.3 dBTP; fade-in, fade-out on the last frame. Web encode (CRF 26, faststart): public/demo-videos/superhuman.mp4,
  3.4 MB.

## Review loop

- Stills: the composition contact sheet (35 frames, every 3.4 s and every seam), the framing sheet (one frame per
  shot), eight full-size stills at the key moments, the render's contact sheet (37 frames).
- Fixed from the stills: the whole workspace jumped 48 px down when the run finished (the hero card grew a
  "Review the send" button above the fold); the page now reserves that row, and the take was recaptured. The
  eval summary tiles were half out of view at the scroll position of task 6 (the sticky column ran out of room),
  so feature 3a uses the tiles from the wide view at the end of the take.
- Phone check: eight frames shrunk to 390 px wide. Every caption, the permission card (struck-through act tools),
  the red "blocked" rows, the eval tiles and the held reply's subject read. The tool arguments, the reply body and
  the eval table's rows are small at that width; the captions carry those shots.
- Cold-viewer test: by 16.6 s the viewer has read the outcome, what it is, who built it for whom, and the problem.

## Honesty

- data-kit-run="example": the page's recorded live runs, replayed in preview mode; "Example run, replayed faster"
  on the hook and hero 2, "Recorded eval run" on the eval shots. The page itself labels both.
- The 4 / 8 on the eval tiles and the failing task 6 are the recorded run's own results; the film does not hide
  them. The proof numbers (8 tasks, 0 out-of-scope calls, 0 unapproved sends) are the same run's tiles.
- No speed changes, no freeze frames, no voice, no Superhuman logo, no "If I join" content.

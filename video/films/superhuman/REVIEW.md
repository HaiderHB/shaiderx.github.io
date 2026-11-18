# Review: Superhuman launch film (launch format, kit 2.1.0; re-cut 2026-11-18)

68.8 s, 8 scenes, accent iris. Beat table, word counts and footage notes: SPEC.md.

Re-cut after Haider's review of the first cut (69.3 s, kit 2.0): the text screens were too long (12.4 s for two
sentences) and shots cut away as their result arrived. Both are kit 2.1 rules now: 3 s text screens, and the
result rule (trim the wait, hold the result max(2.5, 0.5 + 0.3 x words) s, 6 s at most).

| Film s | Beat | Text on screen | Wait before the result | Result on screen |
| --- | --- | --- | --- | --- |
| 0.0-4.2 | Hook: the approval gate holds the agent's reply; the judge's scores land | Inbox triaged. Nothing sends without you. | 0.7 s | 3.5 s |
| 4.2-7.2 | What it is, over the workspace, blurred | An AI email agent that only does what you allow. / A prototype built for Superhuman by Haider Bokhari | | 3 s screen |
| 7.2-10.2 | Problem, over the untouched inbox | An agent that can send email can send mistakes. | | 3 s screen |
| 10.2-15.5 | Hero 1: Run the agent | Triage the inbox and answer what's urgent | 1.5 s | 3.8 s (1 word, needs 2.5) |
| 15.5-22.2 | Hero 2: the run ends, the finished tool-call log | It labels, drafts, then asks to send | 0.7 s | 6.0 s (42 words, needs 6.0) |
| 22.2-28.2 | Hero 3: the reply held at the gate with its scores | Its reply stops here, with a fact-check score | 0 s | 6.0 s (65 words, needs 6.0) |
| 28.2-32.9 | Hero 4: Approve and send | Nothing is sent until you approve it | 1.35 s | 3.35 s (5 words, needs 2.5) |
| 32.9-39.0 | Feature 2a: the grant narrowed to Read + draft | Narrow its access to read and draft | 1.65 s | 4.45 s (13 words, needs 4.4) |
| 39.0-45.8 | Feature 2b: the blocked run ends, the finished log | The server blocks every change it tries | 0.8 s | 6.0 s (57 words, needs 6.0) |
| 45.8-51.8 | Feature 3a: the eval summary tiles | Eight test tasks grade every change | 0 s | 6.0 s (41 words, needs 6.0) |
| 51.8-57.8 | Feature 3b: task 6 open, the scam reply caught | They caught a reply drafted to a scam | 0 s | 6.0 s (91 words, needs 6.0) |
| 57.8-63.8 | Proof: the eval section, wide | 8 test tasks · 0 out-of-scope calls · 0 unapproved sends / An LLM calls MCP-style tools · the server enforces scopes · a decision model grades replies | | 6.0 s |
| 63.8-68.8 | End card | Built for Superhuman by Haider Bokhari / Try it live: the link is in my message / haiderb.com | | |

Every hero and feature shot meets the result rule. The waits in hero 1, hero 4 and feature 2a are the cursor
coming to rest and the click (the scene rule asks for about 1 s still before an action).

## QA (kit/scripts/qa.mjs, launch rules, kit 2.1)

- Static: PASS, 0 fail, 0 warn. Beats in order; both text screens 3.00 s; 10 launch cues, one line at 68 px (hook
  72 px), each on screen >= its reading time and <= 7 s; all 8 hero / feature shots carry data-kit-lands and
  data-kit-read and hold their result for at least the rule's time; 4 chapters; hero and feature shots show the
  page at 1.6-2.8x, the hook at 1.7x, the proof at 1.41x (wide, by intent); no camera move under a caption; run
  "example", labelled on screen.
- HyperFrames check: 0 errors; 7 lint warnings of the kinds the other launch films keep
  (timeline_track_too_dense, nested_media_start_basis_ambiguous: starts are composition-local).
- Render (qa.mjs --video): PASS, 0 fail, 0 warn. H.264 1920x1080 30 fps + AAC, 68.80 s, 6.4 MB; -20.0 LUFS
  integrated, true peak -6.4 dBTP; fade-in, fade-out on the last frame. Web encode (CRF 26, faststart):
  public/demo-videos/superhuman.mp4, 2.8 MB.
- Render frames checked: 24 frames of the final render, at each landing, mid-hold and 0.2 s before every cut of
  the eight hero / feature shots. In every pair the result is whole and unchanged from its landing to the cut.

## Review loop

- Landing times: read from the capture's DOM marks, then checked on the footage in 0.07 s steps around each one
  (the Run click, the end of both runs, the gate's scores, Approve, the grant change, task 6): the shots are set
  on what the footage shows.
- Cuts: for every cut, the composition frame 0.2 s before it and 0.2 s after it (30 frames), plus the frame at
  each landing. Before each cut the result had been still and whole for its full hold.
- Fixed from the stills: the approve shot's spotlight changed to the shorter (approved) box 0.05 s before the
  footage showed the approved card, leaving the buttons outside the lit box for a frame (boundary moved to the
  footage time); the first caption for hero 2 was 9 words (now 7).
- The page's replay notice in hero 1 ("Preview mode: live runs need the private link ... Replaying the recorded
  live run of this task.", 19 words) lands under the lit box and is dimmed. Counting it would need a 6 s hold on
  a "Running" button; the caption's chip ("Example run, replayed faster") carries the same fact.
- Cold-viewer test: by 10.2 s the viewer has read the outcome, what it is, who built it for whom, and the problem.

## Honesty

- data-kit-run="example": the page's recorded live runs, replayed in preview mode; "Example run, replayed faster"
  on the hook, hero 1 and feature 2b, "Recorded eval run" on the eval tiles. The page itself labels both.
- The 4 / 8 on the eval tiles and the failing task 6 are the recorded run's own results. The proof numbers
  (8 tasks, 0 out-of-scope calls, 0 unapproved sends) are the same run's tiles.
- Every hold is a real hold recorded on the page: no speed changes, no freeze frames, no voice, no Superhuman
  logo, no "If I join" content.

# Review: GC AI launch film v1

## What it shows (45.2 s, kit 1.1.1, accent cobalt)
- Cold open on the document while redlines land: "Redlines, *anchored* in code".
- Seven steps on the stepper: Playbook, Stream, Anchor, Decide, Review, Export, Checks. The real page throughout:
  the playbook picker and Review; tracked changes streaming into the contract with Jev cards filling the task
  pane; the §12 card with Jev's rule-fit warning (23%) and the refused edits; the §11 clause with its Jev
  decision (negotiate 92%); Accept, Accept all and No markup; the .docx download; the six anchoring checks and one
  raw edit with the anchor computed for it.
- Annotations point at the proof: the refused list ("Refused: document left unchanged") and the §11 Jev card
  ("Jev: negotiate at 92%").
- End card: Haider Bokhari · haiderb.com.

## QA (kit/scripts/qa.mjs)
- 45.23 s, first product frame 0.00 s, 9 camera keyframes + 2 annotations inside the safe area, 7 cues each on
  screen >= its reading time, one music bed, no voice: 0 fail, 6 warn (4 manual boxes: the cold open and the two
  wide document + task pane shots frame a measured region of the add-in window, because the panes are taller than
  the frame above the caption band; 2 annotation labels sit over other task-pane UI, never over the focus).
- Render (qa.mjs --video): H.264 1920x1080 30 fps + AAC, -20.0 LUFS integrated, true peak -6.3 dBTP, fade-in and a
  fade-out landing on the last frame, 19.9 MB.
- HyperFrames check: 0 errors; kept warnings: timeline_track_too_dense (one review scene, one captions host),
  nested_media_start_basis_ambiguous (starts are composition-local, as in the other films).
- edges.mjs (advisory): the remaining cuts are task-pane cards and document paragraphs sliced by the frame top
  in the close-ups. They live inside scrolling panes, so the pane itself already cuts them; the shots that showed
  part of the contract page horizontally now put the frame edge on the document pane edge (`edge.left 281`).
- Looked at: renders/qa/contact-sheet.jpg, renders/qa/framing-sheet.jpg and frames of the render.

## Honesty
- The streamed review is the page's own example run, captured with no demo key: the exact event stream of a live
  run on the Vercel preview (DeepSeek V3.2 via fal + Jev, 22.9 s), replayed 2x by the page. The Stream cue carries
  an "Example run" chip and says "Recorded live run, replayed 2x."; the page's pill reads "Example run". No live
  calls were made during capture.
- Footage plays at 1x everywhere (no speed tags needed). Held frames: 2.35 s of the finished review (media 14.4 s),
  0.65 s before Accept (media 19.3 s), 0.8 s at the end of the checks take.
- No voice, no avatar, no cloned voice. Music: ElevenLabs instrumental bed from kit/music.

## Weakest shot
- Step 3 (13.2-18.75 s): the refused list is at the bottom of the task pane, so only its first entry (an edit
  identical to its quote) is fully visible; the "California appears twice" refusal sits just below. The
  annotation says what both have in common instead of naming one.

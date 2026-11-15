# Review: Great Question launch film v2

## What changed from v1 (88.5 s -> 53.3 s)
- Rebuilt on video/kit: cold-open, next-steps and end-card blocks; footage scenes driven by shot JSON
  framed from DOM boxes; captions animated by Kit.captions.
- No title or problem card: the opening line arrives live at 0.04 s (T1 text + Jev badges, dock "Moderator
  speaking") and the moderator is heard from 0.3 s, headline in the band. The "leading questions ruin
  research" why is the note on the first subtitle, next to a ring on Jev's badges.
- Faster voice: the demo now speaks at 1.15x (turn.api.js SPEED); this is a FRESH take, so the moderator
  audio is the product's own 1.15x output (opening line 13.69 s vs 16.56 s in v1). The simulated participant
  was regenerated with Selene at 1.15x and shorter answers (5.7 s and 7.0 s instead of 11-13 s).
- Framing: the interview card is fully inside the recorded viewport (page scrolled so the sticky column sits
  at 72 px; card 72-825 px), and every keyframe frames its whole component above the caption band. The
  v1 0:19 problem shot (cursor tapping Answer under the band) is now the whole card at 1.02x (9.6-17.4 s),
  and the dock is inside every interview framing (1.2-1.8x). Wide framings are bottom-aligned on the dock so
  the frame top falls in the gap above the card controls, not through a row.
- Dead time cut: the 4 s first-call wait, the opening line's middle sentence, "Your turn" idles, the second
  pipeline wait (hard cut), turns 3-4 of the take. The first pipeline plays at 2x with its real timings.

## QA (kit/scripts/qa.mjs)
- 53.32 s, first product frame 0.00 s, 11 camera keyframes + 4 rings inside the safe area, 2 speed changes
  labelled (2x, 5x), 0 fail, 2 warn: one 95-character two-sentence subtitle (verbatim answer 1, 5.75 s on
  screen), and "audio on" (the interview's own sound, allowed).
- HyperFrames check: ok, 0 errors; kept warnings timeline_track_too_dense, nested_media_start_basis_ambiguous.
- Looked at renders/qa/contact-sheet.jpg, renders/qa/framing-sheet.jpg and renders/qa-video/* (frames of
  the real render), plus snapshots of every seam.

## Sound and sync (measured)
- Moderator: the take's MP3s from /turn/ (what the page played), placed at the page's audio `playing` time.
  Participant: the WAVs that went into the fake mic, placed at the time their first sample entered the
  stream. Both + 0.05 s screencast lag (kit/scripts/frame-lag.py: median 0.043 s over 27 dock changes and
  clicks). Placed by kit/scripts/place-audio.mjs, which splits a line at footage cuts and refuses sound over
  sped-up footage.
- Listen check on the render (place-audio --check): all 6 pieces land at +0.00 s (envelope correlation
  0.99-1.00). Subtitles start 0.05 s before their first word and end 0.15-0.9 s after the last word (2.2 s on
  the opening question's tail, before "Your turn").
- Loudness: every voice clip normalized to -18 LUFS (mono); `npx hyperframes audio` reads -17.1 to -18.1
  LUFS per placed piece; the mix is -15.1 LUFS integrated (stereo), peak -1.5 dBFS. No music.

## Honesty
- One live take (2026-11-15, local `next start`, real Fish ASR, DeepSeek V3.2 via fal, Fish TTS, Jev,
  DeepSeek findings). Chips: "Real run · Fish stock voice Adrian, 1.15x", "Simulated participant · Fish voice
  Selene, 1.15x" on every participant subtitle. The participant's answers are scripted TTS; the moderator's
  questions, Jev's scores, the transcript (Fish ASR of the recorded answers) and the findings are live.
  Answer pauses were capped at 0.4 s before the take (so the page's 1.2 s end-of-answer detector sees one
  answer).
- No live moderator line crossed Jev's 30% band (9%, 13%, 18%, 25% leading), so the "what Jev flags" beat
  is the page's own example check (real Jev scores the page ships with), labelled "The page's example
  check". Its neighbouring example-run transcript is under a ground patch.
- Cuts: a 0.4 s pause and "this takes about three minutes, and there are no right or wrong answers." from
  the opening line (picture and sound cut together, page static); 1.6 s of waiting before the moderator's
  third line; turn 3 (an answer that did not fit the question: the scripted answers are picked by keyword)
  and turn 4; 0.75 s of cursor travel before Run tool. Speed: the first answer-to-reply pipeline at 2x, the
  findings wait at 5x. The findings reached the screencast 0.5 s after the DOM had them; the cut follows the
  screen. The last 0.68 s of findings is the take's frame held (page static). While findings load, a ground
  patch keeps the next page section from sitting under the caption band.
- The findings cite a quote from turn 3 (F3), which the film does not play.
- No avatar, no cloned voice, no narrator, no music.

## Weakest parts
- The take has no live guardrail catch; the flagged question comes from the page's example check.
- Turn 3 of the take is a non sequitur (keyword-picked scripted answer), so the film stops after answer 2;
  a third coherent turn (and Jev's guide-progress move to Q2) is not shown.
- 9.6-17.4 s is the whole card at 1.02x: complete but small text; the subtitles carry the words.
- The last 19 s are silent (no voice there, no music by rule).

# Kit changelog

Add, don't rename. Any API change after `READY` is listed here with what films must do.

## 1.0.0 (2026-11-15)

- First release: tokens, kit.css, blocks (cold-open, title, next-steps, end-card), components
  (footage-scene, caption-band, callout-ring, speed-tag, label-chip, cursor, word-blur, headline-overlay),
  lib (core, camera, clips, scene, reveal, captions, cursor, blocks), scripts (capture, build-footage,
  measure-boxes, new-film, sync, qa, contact_sheet), film template.
- Block variables are read from the runtime's per-composition map (`window.__hfVariablesByComp`);
  `window.__hyperframes.getVariables()` alone returns the wrong mount from inside kit.js.

## 1.0.1 (2026-11-15)

- Fix: `Kit.camera.fit(box, {margin})` also shrank the safe area's 24 px frame margin (shared option
  name). `margin` now only pads the box; the frame margin is `safeMargin` (default and minimum 24).
  No film change needed; re-sync and re-run QA.
- `--kit-cap-label` 26 px -> 28 px (HyperFrames' 28 px reading floor; affects caption labels and kickers).
- cold-open block: new variable `reveal` ("instant" default, "words" = the 1.0.0 word-by-word reveal):
  the headline is readable from frame 0, so a 2 s cold open passes the reading-time check.
- `.kit-tag` / `.kit-speed` / `.kit-chip` text 24 px -> 26 px (honesty labels must read on a phone).

## 1.0.2 (2026-11-15)

- capture.cjs: `track` entries may be `{sel|fn, clip: true}` to record only the part of a component its scroll pane shows (hidden = absent). Existing captures are unchanged.
- New `scripts/edges.mjs`: advisory list of tracked components cut at the frame edges by each keyframe (qa.mjs still gates the focus).
- New `scripts/fake-mic.cjs` (simulated participant through the page's real mic path + playback log for `capture.cjs`), `scripts/frame-lag.py` (screencast lag vs DOM time), `scripts/place-audio.mjs` (voice placement in sync with footage cuts, speech cues, `--check` listen check) and `components/voice-subtitle.html`.
- Fix: `qa.mjs` did not count `<audio>` (or `<video data-has-audio>`) in the root `index.html`, so a film with placed voice reported "silent". It now warns "audio on: main#...". No film change needed.
- Open items: expose `clip.t0` in capture.cjs; add a `beforeFinish` hook so page-side logs are collected before the browser closes; a `clipTo` option for list items.


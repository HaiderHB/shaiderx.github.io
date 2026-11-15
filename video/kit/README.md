# Video kit

Shared parts for Haider's demo launch films (HyperFrames 0.9.43, 1920x1080, 30 fps). Edit here, then
`npm run sync -- <slug>` (or `npm run sync:all`) to vendor the kit into each film's `kit/` folder.
Never edit a film's `kit/` copy. Add items; never rename or change an API (log any change in
`CHANGELOG.md`).

## How a film uses the kit

`films/<slug>/index.html` loads, in `<head>`:

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
<link rel="stylesheet" href="kit/tokens.css" />
<link rel="stylesheet" href="kit/kit.css" />
<script src="kit/kit.js"></script>        <!-- bundle of kit/lib/*.js, written by sync -->
<script src="data/clips.js"></script>     <!-- window.KIT_CLIPS, written by build-footage -->
```

Blocks mount straight from the vendored copy with per-film text in `data-variable-values`:

```html
<div id="endcard" data-composition-id="endcard" data-composition-src="kit/blocks/end-card.html"
  data-kit-role="end-card" data-variable-values='{"question": "…*human*…", "name": "Haider Bokhari", "url": "haiderb.com"}'
  data-start="45.2" data-duration="2.8" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></div>
```

Footage scenes are the film's own `compositions/*.html` built from `components/footage-scene.html`:
footage `<video data-kit-clip="s2">` inside `.kit-stage > .kit-cam`, camera keyframes as JSON in
`<script type="application/json" class="kit-shots">`, and one line of script:
`Kit.scene.footage({ id: "run2", tl })`. The camera framing is computed from the DOM boxes recorded at
capture time, so the focused component is always whole and above the caption band. QA reads the same
JSON with the same `kit/lib` code, so what QA checks is what renders.

Host ids must equal the block's composition id: `coldopen`, `title`, `nextsteps`, `endcard`.
`data-kit-role` on each host tells QA what a scene is (`cold-open`, `footage`, `captions`, `title`,
`problem`, `card`, `next-steps`, `end-card`).

## Catalog

| Item | What it does | Variables / props | Used by |
| --- | --- | --- | --- |
| `tokens.css` | House style as CSS variables: ground #111111, ink, one cyan #00e5ff, Inter, caption band top (840 px), margins | `--kit-*` | all films |
| `kit.css` | Styles for every component and block (`.kit-stage`, `.kit-cam`, `.kit-ring`, `.kit-band`, `.kit-cap*`, `.kit-speed`, `.kit-chip`, `.kit-headline`, `.kit-card*`, `.kit-row`, `.kit-cursor`) | class names | all films |
| **Blocks** (full scenes, own timeline) | | | |
| `blocks/cold-open.html` | First 1.5-2.5 s: real footage (`assets/footage/hook.mp4`, clip `hook`) moving from frame 0, framed on one component with a slow push-in, kicker + headline in the band | `kicker`, `headline` (`*word*` = cyan), `focus` (component name(s) or `x,y,w,h`), `zoom`, `push`, `align`, `reveal` (`instant` / `words`) | distru, assemblyai, great-question |
| `blocks/title.html` | Optional ≤1.8 s chapter/title card (QA fails text cards > 2 s) | `kicker`, `title`, `credit` | — |
| `blocks/next-steps.html` | "If I join / First 30 days" + up to 3 numbered lines, 3-4.5 s | `label`, `head`, `row1..row3` (`(…)` renders grey) | distru, assemblyai, great-question |
| `blocks/end-card.html` | Closing question + name · url, ≤3 s | `question` (`*word*` = cyan), `name`, `url` | distru, assemblyai, great-question |
| **Components** (snippets to paste) | | | |
| `components/footage-scene.html` | Skeleton of a footage scene: stage, camera, clips, ring, shot JSON | ids, `data-kit-clip`, shot fields (see `lib/scene.js`) | distru, assemblyai, great-question |
| `components/caption-band.html` | Skeleton of `compositions/captions.html`: band + cues, animated by `Kit.captions.animate` | cue `data-start`/`data-duration`, label, main, note | distru, assemblyai, great-question |
| `components/callout-ring.html` | Cyan ring on a recorded component + flat dim; placed from the DOM box | `data-kit-focus`, `data-kit-pad`, `no-dim` | distru, assemblyai, great-question |
| `components/speed-tag.html` | Label for every speed change ("2.5x"); QA matches it to the clip | `data-rate`, `data-tag-start`, `data-tag-end` | distru, assemblyai, great-question |
| `components/label-chip.html` | Honesty label: "Replayed from cache", "Example run", "Simulated participant" | text | distru, assemblyai, great-question |
| `components/cursor.html` | Overlay cursor replaying the REAL recorded pointer path (`Kit.cursor.follow`) | clip, from, to | — |
| `components/voice-subtitle.html` | Speech subtitles (`.kit-cap.kit-voice`, `data-kit-voice`), written by `place-audio`, never hand-timed | — | great-question |
| `components/word-blur.html` | Words blur in one by one (8 px → 0), no slide-ups | stagger, dur | blocks |
| `components/headline-overlay.html` | Kicker + headline in the band over footage (what cold-open uses), for a scene that is itself the opening | text | — |
| **lib/** (in `kit.js`, also loadable in Node) | | | |
| `lib/core.js` | `Kit.FRAME`, `Kit.time.frame/seq/speed/label`, `Kit.warn` | — | all |
| `lib/camera.js` | **Framing guarantee**: `Kit.camera.fit(box, opts)` returns the push-in that shows the whole box inside the safe area (frame − 24 px margin − caption band), lowering the zoom instead of cropping; `safeArea`, `project`, `inside`, `union`, `grow` | `maxZoom`, `zoom`, `minZoom`, `pad`, `margin`, `align`, `captions`, `fill`, `partial`+`reason`, `center` | all |
| `lib/clips.js` | Clip data (DOM boxes, marks, events) lookups and scene-time → media-time mapping | `data-kit-clip`, `data-kit-media-time` | all |
| `lib/scene.js` | `Kit.scene.footage({id, tl})`: camera keyframes + rings from shot JSON, boxes unioned over each hold; `Kit.scene.plan` (pure, used by QA) | shot: `t`, `focus`, `dur`, `ease`, `cut`, zoom opts, `captions`, `partial`, `reason`, `window`, `label` | all |
| `lib/reveal.js` | `Kit.reveal.split/words/blurIn/blurOut/fadeIn/fadeOut` | stagger, dur, blur | blocks, captions |
| `lib/captions.js` | `Kit.captions.animate(tl, "captions")`: band + cues + tags from the HTML timing | — | all |
| `lib/cursor.js` | `Kit.cursor.follow(tl, el, {clip, sceneClips, from, to})` | — | — |
| `lib/blocks.js` | Block helpers: `vars` (per-mount variables), `rich` (`*word*`), `parseFocus`, `coldOpenShots` (shared with QA) | — | blocks |
| **scripts/** (run from `video/`) | | | |
| `scripts/capture.cjs` | Playwright + CDP screencast recorder: visible cursor, DOM boxes of named components every frame, clicks/scrolls/cursor/marks | `film`, `name`, `url`, `track` (selector, `(document) => Element`, or `{sel\|fn, clip: true}` = only the part visible inside scroll panes), `viewport` | assemblyai, great-question |
| `scripts/build-footage.mjs` | Frames → 30 fps H.264 `assets/footage/<clip>.mp4`; `data/clips/<clip>.json` + `data/clips.js`; cuts (`capture/cuts.json`, e.g. the `hook`), stills, `--import` of older footage | see header | distru |
| `scripts/measure-boxes.py` | Boxes for legacy footage without DOM boxes: snaps rough boxes to card borders in the frames (`--debug` overlays) | spec JSON | distru |
| `scripts/edges.mjs` | Advisory (exit 0): tracked neighbouring components that a keyframe slices at the frame edges (qa.mjs gates only the focus). Move the edge into whitespace with the shot's `align` / `margin` / `pad` | `films/<slug>`, `--min`, `--json` | assemblyai |
| `scripts/fake-mic.cjs` | Simulated participant for voice demos with `capture.cjs`: replaces `getUserMedia` with a Web Audio stream that plays prepared WAV answers on cue, so the page's real recorder/silence detection/upload runs; logs the page's own audio playback; `collect()` writes `raw/<clip>/audio.json` | `CHROME_ARGS`, `init({watch})`, `attach`, `load`, `speak`, `collect` | great-question |
| `scripts/frame-lag.py` | Measures how late the screencast shows a DOM change; the lag `place-audio` adds when placing sound | `<raw/clip> [--watch name=component]` | great-question |
| `scripts/place-audio.mjs` | Places the demo's own recorded sound on the film timeline through footage cuts, writes speech cues from the same mapping, `--check render.mp4` = listen check (±80 ms) | `capture/voice.json` | great-question |
| `scripts/new-film.mjs` | Scaffold `films/<slug>/` on the retention-first template and sync the kit | `<slug> --company` | distru |
| `scripts/sync.mjs` | Vendor the kit into a film (`kit/`, `kit/kit.js`, `kit/VERSION`), relink node_modules, rewrite `data/clips.js` | `<slug>` / `--all` | all |
| `scripts/qa.mjs` | The gate: duration < 60 s, first product frame ≤ 2 s, scene lengths, framing of every keyframe and ring, speed labels, captions, style; `--frames` / `--video` builds the contact sheet (every 3 s + seams ±0.2 s) and a framing sheet | `--frames`, `--video`, `--at`, `--every`, `--out`, `--json` | all |
| `scripts/contact_sheet.py` | Labelled contact sheet with focus/safe rectangles (used by qa) | spec JSON | qa |
| `templates/film/` | What `new-film` copies: index.html (cold open → footage → next steps → end card + captions), compositions, SPEC.md, capture script, cuts.json | `{{SLUG}}`, `{{COMPANY}}` | new-film |

## Adding an item

1. Blocks: a full scene in `blocks/<name>.html` with everything inside `<template>`; a fixed composition
   id (the host must use it); copy as variables in the root's `data-composition-variables`; read them with
   `Kit.blocks.vars(inner, "<id>")`; animate with `Kit.reveal`; register `window.__timelines["<id>"]`.
   Add its duration rule to `scripts/qa.mjs` if it has one.
2. Components: a commented snippet in `components/<name>.html`; styles in `kit.css` under a new
   `.kit-*` class; behaviour in a new `lib/<name>.js` (attach to `window.Kit`, export for Node like the
   others). New lib files are appended to the bundle automatically.
3. Header comment on every file: what it does, its variables/props, where it is used.
4. Add a row above, a line in `CHANGELOG.md`, then `npm run sync:all` and `npm run qa -- films/<slug>`
   for each film.

## Framing tips (from the first three films)

- QA guarantees the focus is whole; also run `scripts/edges.mjs` so the frame edge lands in whitespace, not through a neighbouring card (Haider notices sliced components).
- On dense pages: `"align": "top", "pad": 0, "margin": 4` puts the frame top between a hint line and the panels; `"align": "top-left"` with `maxZoom` at column fit keeps a full-width card below the focus whole. `fill` overrides `align` when the footage bottom would show, so recapture with the page scrolled instead of top-aligning a low component at high zoom.
- A ring's default pad (6 px) pokes past the safe area when a shot uses `pad: 0, margin: 4`: set `data-kit-pad` ≤ the shot margin.
- Components inside a scrolling list report unclipped rects: track them with `{sel, clip: true}`.
- Voice: place sound with `place-audio` (it applies the measured screencast lag, ~0.04 s), never by hand. Fish's Selene voice runs ~2.5 words/s at 1.15x, so a simulated answer of ~17 words is ~6 s.

# Video kit

Shared parts for Haider's demo launch films (HyperFrames 0.9.x, 1920x1080, 30 fps). Kit **2.0.0** adds the
**launch format** (60-75 s: hook, what it is, the problem, one task, two features, proof, end card; see
"Launch format" below and `video/README.md`). Everything from kit 1.1 is still here and unchanged for the films
built on it: text-first films (no voice), one instrumental music bed, v2 caption band with a progress stepper,
annotations, no next-steps card, palette matched to the demo UI revamp. Edit here, then
`npm run sync -- <slug>` to vendor the kit (and the film's music bed) into that film. Never edit a film's
`kit/` copy. Add items; never rename or change an API (log any change in `CHANGELOG.md`).

**Demo-film rules in one breath (kit 1.1):** text carries everything, so no voice of any kind; one bed from
`music/` under the whole film at about -20 LUFS (fade in ≤ 0.3 s, out ~1.5 s on the last frame); one v2
cue at a time (kicker = step, one-line headline ≤ ~10 words at 58 px, optional detail ≤ ~14 words) with
`data-kit-step` driving the stepper; at most one annotation (≤ 6 words) beside it; every cue and
annotation on screen ≥ 0.6 s + 0.35 s per word; no next-steps card; end card ≤ 3 s with name and
haiderb.com; accent = the demo page's accent. `scripts/qa.mjs` gates all of it.

## Launch format (kit 2) in one page

A film opts in with `data-kit-format="launch"` on its root; `scripts/qa.mjs` then gates the launch rules
(`lib/launch.js` `Kit.launch.RULES`) instead of the kit 1.1 duration / scene / caption rules.

```html
<div id="root" data-composition-id="main" data-kit-format="launch" data-kit-accent="cobalt" data-kit-run="example"
  data-start="0" data-duration="68.6" ...>
  <div id="hook"    data-composition-src="compositions/hook.html"    data-kit-role="footage"   data-kit-beat="hook" ...></div>
  <div id="what"    data-composition-src="compositions/what.html"    data-kit-role="statement" data-kit-beat="what" ...></div>
  <div id="problem" data-composition-src="compositions/problem.html" data-kit-role="statement" data-kit-beat="problem" ...></div>
  <div id="hero"    data-composition-src="compositions/hero.html"    data-kit-role="footage"   data-kit-beat="hero" ...></div>
  <div id="pinned"  data-composition-src="compositions/pinned.html"  data-kit-role="footage"   data-kit-beat="feature" ...></div>
  <div id="export"  data-composition-src="compositions/export.html"  data-kit-role="footage"   data-kit-beat="feature" ...></div>
  <div id="proof"   data-composition-src="compositions/proof.html"   data-kit-role="footage"   data-kit-beat="proof" ...></div>
  <div id="launchend" data-composition-src="kit/blocks/launch-end.html" data-kit-role="end-card" data-kit-beat="end"
    data-variable-values='{"built": "Built for *Acme* by Haider Bokhari", "action": "Try it live: the link is in my message", "url": "haiderb.com"}' ...></div>
  <div id="captions" data-composition-src="compositions/captions.html" data-kit-role="captions" data-start="0" ...></div>
  <!-- kit:music:start --> … <!-- kit:music:end -->
</div>
```

The pieces, and where each beat gets its parts:

| Beat | Scene | Text | Kit parts |
| --- | --- | --- | --- |
| hook | footage scene, one tight shot, footage from frame 0 | `.kit-cap3.kit-hook` cue (72 px, <= 7 words, crisp on frame 0) | `components/footage-scene.html`, `.kit-spot` |
| what, problem | statement scene: `.kit-stage.kit-backdrop` + `.kit-scrim` + `.kit-statement` | `.kit-statement-text` (96 px, <= 12 words), `.kit-statement-sub` | `components/statement-scene.html`, `Kit.launch.statement` |
| hero, feature | footage scene: one `<video>` + one cut + one `.kit-spot` + one cue per shot | `.kit-cap3` cues (68 px, <= 8 words, one line) | `components/spotlight.html`, `components/launch-captions.html` |
| proof | footage scene, wide | `.kit-cap3.kit-proof`: `.kit-stats` (1-3 `.kit-stat`) + `.kit-hood` | `components/launch-captions.html` |
| end | block | variables `built`, `action`, `url` | `blocks/launch-end.html` |
| (all) | | `.kit-chapters[data-kit-chapters="Name:start|…"]`: 3-4 labels over a thin progress bar | `Kit.captions.animate` |

Tight zooms: the camera still shows the whole focus box (`Kit.camera.fit`), so the way to get a 2x close-up is
to focus a small box: track ONE clause, card or button in `capture/record.cjs` (`{sel, clip: true}` inside
scroll panes) and name it in the shot (`"focus": "cardC4", "maxZoom": 2, "cut": true`). 2x capture
(`deviceScaleFactor: 2`, viewport 1360x765) keeps those zooms sharp; `build-footage` scales boxes and clicks to
the 1920 stage and writes `stageScale` into the clip data; QA's "page shown at Nx" = camera zoom x stage scale.

## How a film uses the kit

`films/<slug>/index.html` loads, in `<head>`:

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
<link rel="stylesheet" href="kit/tokens.css" />
<link rel="stylesheet" href="kit/kit.css" />
<script src="kit/kit.js"></script>        <!-- bundle of kit/lib/*.js, written by sync -->
<script src="data/clips.js"></script>     <!-- window.KIT_CLIPS, written by build-footage -->
```

The root carries the film's accent (the demo page's DemoLayout accent) and, at its end, the music bed
written by `scripts/music-bed.mjs` between two markers:

```html
<div id="root" data-composition-id="main" data-kit-accent="iris" data-start="0" data-duration="50.2" ...>
  ...scene hosts...
  <!-- kit:music:start -->
  <audio id="music" class="clip kit-music" src="assets/music/bright-pluck-112.mp3" data-kit-music="bright-pluck-112"
    data-start="0" data-duration="50.2" data-media-start="9" data-volume="0.569" data-fade-in="0.3" data-fade-out="1.5" ...></audio>
  <!-- kit:music:end -->
</div>
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

Host ids must equal the block's composition id: `coldopen`, `title`, `endcard`, `launchend` (`nextsteps` is not
for demo films). `data-kit-role` on each host tells QA what a scene is (`cold-open`, `footage`, `captions`,
`title`, `problem`, `card`, `end-card`, and kit 2's `statement`; `next-steps` fails QA in a demo film). Launch
films add `data-kit-beat` (`hook`, `what`, `problem`, `hero`, `feature`, `proof`, `end`).

Captions (v2) and annotations, in short:

```html
<!-- compositions/captions.html -->
<div id="cap-progress" class="clip kit-progress" data-start="0" data-duration="44" data-kit-steps="Email,Extract,Check,Decide,Reply,Evals,MCP" data-layout-ignore></div>
<div id="cap-check" class="clip kit-cap kit-cap2" data-start="7.9" data-duration="5.2" data-kit-step="3">
  <div class="kit-cap-kicker"><span>Step 3 · Check</span><span class="kit-speed" data-rate="6" data-tag-start="7.9" data-tag-end="9.5">6x</span></div>
  <div class="kit-cap-head">Seven tools check it against the *ERP*</div>
  <div class="kit-cap-detail">Stock, license and credit: code, not the model.</div>
</div>
<!-- in a footage scene, outside .kit-stage -->
<div id="r2-ann-route" class="clip kit-ann" data-start="11.2" data-duration="2.8" data-kit-focus="finalRoute"
  data-layout-allow-overlap data-layout-allow-occlusion><div class="kit-ann-label">Rules overrule the model</div></div>
```

## Catalog

"Used by" lists the films built on kit 1.1. The v2 films (built on 1.0.x) keep their vendored copy until
they are re-cut on 1.1.

| Item | What it does | Variables / props | Used by |
| --- | --- | --- | --- |
| `tokens.css` | House style as CSS variables, matched to the demo UI revamp: ground #0a0a0f, ink #f2f1f9, ONE accent per film via `data-kit-accent` (iris #8e78ff, cobalt #6896ff, coral #ff8060, cyan #00e5ff), Inter, caption band top (840 px), v2 caption and annotation sizes | `--kit-*`, `data-kit-accent` | distru, assemblyai, great-question |
| `kit.css` | Styles for every component and block (`.kit-stage`, `.kit-cam`, `.kit-ring`, `.kit-band`/`.kit-band2`, `.kit-cap`/`.kit-cap2` (kicker, head, detail), `.kit-progress`, `.kit-ann`, `.kit-speed`, `.kit-chip`, `.kit-headline`, `.kit-card*`, `.kit-row`, `.kit-cursor`) | class names | distru, assemblyai, great-question |
| **Kit 2: launch format** | | | |
| `lib/launch.js` | `Kit.launch.RULES` (every number QA gates), `BEATS`, `readingTime(words)` = max(2.5, 0.5 + 0.6 x words), `isLaunch`, `mag(scale, clip)`, `cover(region, zoom)`, `statement({id, tl})` (backdrop camera + sentence reveal) | `data-kit-format="launch"`, `data-kit-beat`, `data-kit-cam` | gc-ai |
| `blocks/launch-end.html` | End card, about 5 s (QA 4-6 s): who built it, ONE action, the url. Host id `launchend` | `built` (`*word*` = accent), `action`, `url` | gc-ai |
| `components/statement-scene.html` | Statement scene: ONE sentence (96 px, <= 12 words) + a small line over blurred (`--kit-backdrop-blur`), dimmed (`--kit-scrim`) product footage; `data-kit-cam="x,y,w,h"` frames one footage region | `.kit-statement-text`, `.kit-statement-sub`, `data-kit-cam`, style overrides | gc-ai (what, problem) |
| `components/launch-captions.html` | Skeleton of a launch `captions.html`: `.kit-cap3` cues (one line, 64-72 px, no kicker), `.kit-hook`, `.kit-proof` (`.kit-stats` + `.kit-hood`), `.kit-cap-tags` for labels, `.kit-chapters` (3-4 labels over a thin progress bar), band windows | cue timing, `data-kit-chapters="Name:start\|…"` | gc-ai |
| `components/spotlight.html` | `.kit-spot[data-kit-focus]` inside `.kit-cam`: flat dim outside ONE recorded component, 2 px accent outline (`bare` = none); switches hard on cuts, fades elsewhere; planned and checked like a ring; `data-kit-window="a,b"` takes the box from other scene seconds (the state before a click) | `data-kit-focus`, `data-kit-pad`, `data-kit-window`, `bare` | gc-ai |
| `scripts/capture.cjs` (kit 2 options) | `deviceScaleFactor: 2` (real 2x frames through `--force-device-scale-factor`), `cursor: {scale, idleHide}`, `clickPause` | see header | gc-ai |
| `scripts/build-footage.mjs` (kit 2) | 2x / narrow-viewport captures keep their pixels; boxes, cursor and clicks are scaled to the 1920x1080 stage; clip data gains `stageScale`, `viewport`, `deviceScaleFactor`, `pixels` | automatic | gc-ai |
| `music/bright-pluck-112-long.mp3` | The default bed extended to 94 s for 60-90 s films; `music-bed.mjs` picks it when the film outlasts the 60 s bed | `--bed` | gc-ai |
| **Blocks** (full scenes, own timeline) | | | |
| `blocks/cold-open.html` | First 1.5-2.5 s: real footage (`assets/footage/hook.mp4`, clip `hook`) moving from frame 0, framed on one component with a slow push-in, kicker + headline on the v2 band. Reading time applies: ≤ 4 headline words at 2.2 s | `kicker`, `headline` (`*word*` = accent), `focus` (component name(s) or `x,y,w,h`), `zoom`, `push`, `align`, `reveal` (`instant` / `words`) | distru, assemblyai, great-question |
| `blocks/title.html` | Optional ≤1.8 s chapter/title card (QA fails text cards > 2 s) | `kicker`, `title`, `credit` | — |
| `blocks/next-steps.html` | **Not for demo films** (kit 1.1: "a demo shows skill, not plans"; QA fails it). "If I join / First 30 days" + up to 3 numbered lines | `label`, `head`, `row1..row3` | — (removed from the template and from v3 films) |
| `blocks/end-card.html` | Name · url (≤ 3 s), with an optional closing question; `question: ""` = sign-off alone, larger, mid-frame | `question` (optional, `*word*` = accent), `name`, `url` | distru, assemblyai, great-question |
| **Components** (snippets to paste) | | | |
| `components/footage-scene.html` | Skeleton of a footage scene: stage, camera, clips, ring, annotation, shot JSON | ids, `data-kit-clip`, shot fields (see `lib/scene.js`) | distru, assemblyai, great-question |
| `components/caption-band.html` | Skeleton of `compositions/captions.html`, kit 1.1: solid band, `.kit-progress` stepper, v2 cues (`.kit-cap2`: kicker = step, one-line headline ≤ ~10 words, optional detail ≤ ~14 words, `data-kit-step`), animated by `Kit.captions.animate` | cue `data-start`/`data-duration`/`data-kit-step`, kicker, head, detail; stepper `data-kit-steps` | distru, assemblyai, great-question |
| `components/annotation.html` | **Kit 1.1.** Ring + ≤ 6-word label on a recorded component, auto-placed in the safe area (beside the ring, else just outside the focus box with a leader), never over the focus box, the ring or the band; prefers whitespace over other tracked components; one camera hold | `data-kit-focus`, `data-kit-pad`, `data-kit-side`, `dim`, `.kit-ann-label` | distru, assemblyai, great-question |
| `components/music-bed.html` | **Kit 1.1.** What `scripts/music-bed.mjs` writes: one `<audio class="kit-music">` from 0 to the film's end, fades 0.3 / 1.5 s, measured `data-volume` for -20 LUFS | written by the script | distru, assemblyai, great-question |
| `components/callout-ring.html` | Accent ring on a recorded component + flat dim; placed from the DOM box | `data-kit-focus`, `data-kit-pad`, `no-dim` | distru, assemblyai, great-question |
| `components/speed-tag.html` | Label for every speed change ("2.5x"); QA matches it to the clip | `data-rate`, `data-tag-start`, `data-tag-end` | distru, assemblyai, great-question |
| `components/label-chip.html` | Honesty label: "Replayed from cache", "Example run", "Simulated participant" (its words count toward reading time) | text | distru, assemblyai, great-question |
| `components/cursor.html` | Overlay cursor replaying the REAL recorded pointer path (`Kit.cursor.follow`) | clip, from, to | — |
| `components/voice-subtitle.html` | Speech subtitles for a film whose sound was the demo's own recorded voice. **Not for demo films since kit 1.1** (no voice) | — | — (great-question v2 only) |
| `components/word-blur.html` | Words blur in one by one (8 px → 0), no slide-ups | stagger, dur | blocks |
| `components/headline-overlay.html` | Kicker + headline in the band over footage (what cold-open uses), for a scene that is itself the opening | text | — |
| **music/** | | | |
| `music/*.mp3`, `music/beds.json`, `music/README.md` | **Kit 1.1.** Three 60 s ElevenLabs instrumental beds (default `bright-pluck-112`); `beds.json` = length, natural end, loudness, true peak per bed. Never edited per film: `sync` vendors the chosen bed into `films/<slug>/assets/music/` | `--bed` | distru (bright-pluck-112) |
| **lib/** (in `kit.js`, also loadable in Node) | | | |
| `lib/core.js` | `Kit.version` (2.0.0), `Kit.FRAME`, `Kit.time.frame/seq/speed/label`, `Kit.warn` | — | all |
| `lib/text.js` | **Kit 1.1.** `Kit.text.words/readingTime` (0.6 s + 0.35 s per word), `width/lines` (Inter glyph advances, so QA in Node measures what renders), `annSize`, `CAP2` / `ANN` geometry | — | captions, annotations, qa |
| `lib/camera.js` | **Framing guarantee**: `Kit.camera.fit(box, opts)` returns the push-in that shows the whole box inside the safe area (frame − 24 px margin − caption band), lowering the zoom instead of cropping; `safeArea`, `project`, `inside`, `union`, `grow`. Kit 1.1.1: `edge` puts a footage x / y (a column gutter) on the frame edge so a close-up does not slice the neighbour | `maxZoom`, `zoom`, `minZoom`, `pad`, `margin`, `align`, `captions`, `fill`, `edge`, `partial`+`reason`, `center` | all (`edge`: distru) |
| `lib/clips.js` | Clip data (DOM boxes, marks, events) lookups and scene-time → media-time mapping | `data-kit-clip`, `data-kit-media-time` | all |
| `lib/scene.js` | `Kit.scene.footage({id, tl})`: camera keyframes + rings + annotations from the scene markup, boxes unioned over each hold; `Kit.scene.plan` (pure, used by QA) | shot: `t`, `focus`, `dur`, `ease`, `cut`, zoom opts, `captions`, `partial`, `reason`, `window`, `label` | all |
| `lib/annotate.js` | **Kit 1.1.** `Kit.annotate.place` (label placement: beside the ring, else outside the focus box with a leader; inside the safe area; off the focus, ring, band and, when possible, other components), `render` | `side`, `gap`, `avoid` | scene |
| `lib/music.js` | **Kit 1.1.** `Kit.music.plan` (bed under the whole film, `align` end/start, fades), `volume`, `check` (QA), `TARGET` (-20 LUFS, -22..-18, ≤ -1 dBTP) | — | music-bed, qa |
| `lib/reveal.js` | `Kit.reveal.split/words/blurIn/blurOut/fadeIn/fadeOut` | stagger, dur, blur | blocks, captions |
| `lib/captions.js` | `Kit.captions.animate(tl, "captions")`: band + cues (v1 and v2) + tags + the progress stepper from the HTML timing; `*word*` accents in v2 heads | — | all |
| `lib/cursor.js` | `Kit.cursor.follow(tl, el, {clip, sceneClips, from, to})` | — | — |
| `lib/blocks.js` | Block helpers: `vars` (per-mount variables), `rich` (`*word*`), `parseFocus`, `coldOpenShots` (shared with QA) | — | blocks |
| **scripts/** (run from `video/`) | | | |
| `scripts/capture.cjs` | Playwright + CDP screencast recorder: visible cursor, DOM boxes of named components every frame, clicks/scrolls/cursor/marks | `film`, `name`, `url`, `track` (selector, `(document) => Element`, or `{sel\|fn, clip: true}` = only the part visible inside scroll panes), `viewport` | distru, assemblyai, great-question |
| `scripts/build-footage.mjs` | Frames → 30 fps H.264 `assets/footage/<clip>.mp4`; `data/clips/<clip>.json` + `data/clips.js`; cuts (`capture/cuts.json`, e.g. the `hook`), stills, `--import` of older footage | see header | distru, assemblyai, great-question |
| `scripts/music-bed.mjs` | **Kit 1.1.** Plans the bed for the film's length, measures that excerpt (ffmpeg ebur128, true peak), writes `#music` with the gain for -20 LUFS between the `kit:music` markers, vendors the bed | `--bed`, `--align end\|start`, `--media-start`, `--lufs`, `--fade-in`, `--fade-out`, `--dry-run` | distru, assemblyai, great-question |
| `scripts/measure-boxes.py` | Boxes for legacy footage without DOM boxes: snaps rough boxes to card borders in the frames (`--debug` overlays) | spec JSON | — |
| `scripts/edges.mjs` | Advisory (exit 0): tracked neighbouring components that a keyframe slices at the frame edges (qa.mjs gates only the focus). Move the edge into whitespace with the shot's `align` / `margin` / `pad` | `films/<slug>`, `--min`, `--json` | distru, assemblyai, great-question |
| `scripts/fake-mic.cjs` | Simulated participant for voice demos with `capture.cjs` (drives the page's real mic path; the film itself carries no voice since kit 1.1) | `CHROME_ARGS`, `init({watch})`, `attach`, `load`, `speak`, `collect` | — |
| `scripts/frame-lag.py` | Measures how late the screencast shows a DOM change | `<raw/clip> [--watch name=component]` | — |
| `scripts/place-audio.mjs` | Places the demo's own recorded sound on the film timeline (voice films, kit 1.0); kit 1.1 demo films carry no voice, so QA fails what it writes unless flagged | `capture/voice.json` | — |
| `scripts/new-film.mjs` | Scaffold `films/<slug>/` on the launch-format template (kit 2) and sync the kit | `<slug> --company` | — |
| `scripts/sync.mjs` | Vendor the kit into a film (`kit/`, `kit/kit.js`, `kit/VERSION`), vendor its music bed (`assets/music/`), relink node_modules, rewrite `data/clips.js` | `<slug>` / `--all` | distru, assemblyai, great-question |
| `scripts/qa.mjs` | The gate. Launch films (`data-kit-format="launch"`): 55-90 s, beats present and in order, <= 2 feature beats after the hero, `.kit-cap3` cues (words, one line, 64-72 px, reading time, <= 7 s), hook line, proof numbers, chapters, page shown at >= 1.5x in hero / feature shots, no camera move under a caption, run label, held-frame label, bed as long as the film. Kit 1.1 films: duration < 60 s, first product frame ≤ 2 s, scene lengths, no next-steps, framing of every keyframe, ring and annotation, speed labels, captions (one at a time, reading time, v2 sizes and one-line fits, stepper), exactly one music bed and no voice, style; `--frames` / `--video` builds the contact sheet (every 3 s + seams ±0.2 s) and a framing sheet (shots + annotations); `--video` also measures loudness (-22..-18 LUFS, ≤ -1 dBTP), fades, streams, size | `--frames`, `--video`, `--at`, `--every`, `--out`, `--json` | distru, assemblyai, great-question |
| `scripts/contact_sheet.py` | Labelled contact sheet with focus/safe/label rectangles (used by qa) | spec JSON | qa |
| `templates/film/` | What `new-film` copies (kit 2, launch format): index.html (eight beat hosts + captions + music bed, `data-kit-format="launch"`), compositions (hook, what, problem, hero, feature2, feature3, proof, captions), SPEC.md with the beat table, 2x capture script, cuts.json | `{{SLUG}}`, `{{COMPANY}}` | new-film |

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

## Writing for launch films (kit 2)

- Write the beat table before any capture: beat, seconds, picture, caption, focus box. A caption that needs
  more than 8 words is two shots.
- Say what it means for the viewer, not what was clicked: "Your playbook sets the rules. Press Review." beats
  "Step 1 · Playbook". Never name an internal component; the proof beat's under-the-hood line is where "an LLM
  drafts, code verifies, a decision model routes" goes.
- Check every claim against the page: the film says what a recorded run did. Numbers in the proof beat come
  from that run. If an action would make the next claim false (accepting every change before exporting
  "tracked changes"), reorder the shots.
- Budget: 8 words = 5.3 s, 7 = 4.7 s, 6 = 4.1 s, 5 = 3.5 s; a 9-word statement = 5.9 s.
- The hook's first frame is the thumbnail: start the footage where a result is already on screen.

## Writing for text-only films (kit 1.1)

- One idea per cue. The kicker names the step ("Step 3 · Check"); the headline says what happens in ≤ ~10
  words; the detail line (optional) gives the one fact that makes it impressive. Budget the time:
  0.6 s + 0.35 s per word, so 8 + 6 words = 5.5 s. Cut words before you add seconds.
- Use the accent (`*word*`) on the one word that carries the point; keep numbers as digits.
- An annotation points at the proof on screen ("Hold: license expires first"); it does not repeat the
  headline. Leave the focus room for it (a lower `maxZoom`), or QA finds no placement.
- Honesty chips ("Cached replay", "Example run") count as words to read; keep them to 2-3 words and put
  the explanation in the detail line.

## Launch-format tips (from gc-ai)

- A 1360x765 viewport at 2x gives 2720x1530 frames at 12-30 changed frames/s on the 2-core box; the UI is
  1.41x on the stage before any zoom. Check the page's breakpoints at that width first.
- One long take is easier to cut than many: scroll the panes yourself between shots, `clip.mark()` every
  step, and read the media times from `data/clips/<take>.json`. A page that auto-follows new results while it
  streams will scroll under your shot: take over the scrolling (one wheel tick) if the page allows it.
- The DOM changes ~0.05-0.2 s before the screencast shows it. Put a spotlight boundary on the DOM time of the
  change (the box sample in the clip data), not after it, or the union of the two states lights too much.
- Spotlights switch hard on cuts; a camera MOVE between two spotlights shows the page undimmed for its
  length, so cut instead of moving when both shots are lit.
- The idle-hide cursor stays visible for 1.2 s after its last move: start a shot's footage later than that
  after the pre-roll, or park the cursor earlier.
- A white page needs `--kit-scrim: 0.84` under a statement for the accent word to keep 4.5:1.
- `hyperframes render` cancels when its stdin closes: background it as `tail -f /dev/null | npx hyperframes render …`.

## Framing tips (from the first three films)

- QA guarantees the focus is whole; also run `scripts/edges.mjs` so the frame edge lands in whitespace, not through a neighbouring card (Haider notices sliced components).
- Two-column demo pages (email | trace, decision | reply): a close-up on one column slices the other. Put the
  frame edge in the 24 px gutter with `"edge": {"left": 859}` (kit 1.1.1), and the top edge under the page's
  sticky header with `"edge": {"top": 68}` (add `"pad": 0, "margin": 0-4` and a `maxZoom` when the focus is
  tall). The spare width on the far side is the natural place for an annotation label (distru v3).
- On dense pages: `"align": "top", "pad": 0, "margin": 4` puts the frame top between a hint line and the panels; `"align": "top-left"` with `maxZoom` at column fit keeps a full-width card below the focus whole. `fill` overrides `align` when the footage bottom would show, so recapture with the page scrolled instead of top-aligning a low component at high zoom.
- A ring's default pad (6 px) pokes past the safe area when a shot uses `pad: 0, margin: 4`: set `data-kit-pad` ≤ the shot margin.
- Components inside a scrolling list report unclipped rects: track them with `{sel, clip: true}`.
- Voice: place sound with `place-audio` (it applies the measured screencast lag, ~0.04 s), never by hand. Fish's Selene voice runs ~2.5 words/s at 1.15x, so a simulated answer of ~17 words is ~6 s.

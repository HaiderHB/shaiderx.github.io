# Launch videos

Every demo gets a ~50 s launch film: real screen capture of the working demo, a cold open, on-screen text
in a clear product-demo format, a light instrumental music bed and an end card. No voice of any kind:
the text carries all the information (kit 1.1). Films are HyperFrames projects (HTML rendered to video,
1920x1080, 30 fps). Most of each film is shared parts from `kit/`; a new film should be ~80% reused.

```
video/
  kit/                 the shared library (catalog: kit/README.md)
    tokens.css kit.css   house style + component styles
    blocks/              full scenes: cold-open, title, end-card (next-steps: not for demo films)
    components/          snippets: footage-scene, caption-band (v2), annotation, music-bed, callout-ring, ...
    lib/                 camera framing, clip data, shot planner, annotations, text measures, music plan,
                         reveals, captions (bundled to kit.js)
    music/               instrumental beds (README, beds.json); sync vendors the chosen one into the film
    scripts/             capture, build-footage, music-bed, measure-boxes, new-film, sync, qa, edges
    templates/film/      what new-film copies
  films/<slug>/        one self-contained HyperFrames project per film
    index.html           root: hosts for cold open, footage scenes, captions, end card + the music bed
    compositions/        the film's own scenes (footage scenes, captions)
    kit/                 vendored copy of video/kit (npm run sync), never edited by hand
    capture/             record.cjs (capture script), cuts.json (hook and other cuts)
    data/clips/          per-clip DOM boxes, marks, events (committed, small); data/clips.js for the page
    raw/                 screencast frames (git-ignored)
    assets/footage/      built footage mp4/png (git-ignored)
    assets/music/        the vendored bed (sync, git-ignored)
    renders/             renders and QA sheets (git-ignored)
```

`node_modules` (hyperframes) is shared: `video/node_modules`, linked into each film by `sync`.
Nothing here is deployed: `.vercelignore` skips `video/`.

## Daily workflow

All commands run from `video/`.

1. **Scaffold**: `npm run new-film -- acme --company "Acme"`. Fill `films/acme/SPEC.md` (goal, shots, the
   caption text). Set `data-kit-accent` on the root to the demo page's accent (`iris`, `cobalt`, `coral`).
2. **Capture** (real demo, real UI): run the demo locally on an isolated copy (several agents share this
   machine: never run `next` inside the shared worktree; copy it without `node_modules`, `.next`, `video`,
   link `node_modules`, `next build && next start -p 3160`), write `films/acme/capture/record.cjs`
   (template included), then `node films/acme/capture/record.cjs <clip>`. `track` every component a shot
   or an annotation will focus on: the recorder stores its DOM box every frame, plus clicks, scrolls, the
   cursor path and your marks. Prefer the page's example run or same-day cached runs; a live run costs
   money. Note what you used. Keep every focused component fully inside the 1920x1080 viewport while
   recording (QA refuses a component that runs under the window edge or a sticky header).
3. **Build footage**: `npm run footage -- films/acme` → `assets/footage/<clip>.mp4` (30 fps CFR) and
   `data/clips/<clip>.json`. Add the cold-open cut to `capture/cuts.json`
   (`{"name": "hook", "from": "s1", "start": 1.0, "end": 3.4}`) and run it again.
4. **Edit**: set the block variables in `index.html` (cold-open headline, end card); build footage scenes
   from `kit/components/footage-scene.html`: trim clips with `data-media-start` / `data-playback-rate`,
   write camera keyframes as shot JSON (`{"t": 3.2, "focus": "trace"}`), add rings and annotations
   (`kit/components/annotation.html`). Write the story as v2 caption cues
   (`kit/components/caption-band.html`): kicker = step, one headline, optional detail, `data-kit-step` for
   the progress stepper. Preview: `cd films/acme && npx hyperframes preview`.
5. **Music**: once the length is set, `node kit/scripts/music-bed.mjs films/acme [--bed bright-pluck-112]`
   writes the bed under the whole film, levelled to -20 LUFS, and vendors it (re-run after any length change).
6. **Check + QA**: `cd films/acme && npx hyperframes check --json` (fix every error), then
   `npm run qa -- films/acme --frames` and look at `renders/qa/contact-sheet.jpg` and
   `renders/qa/framing-sheet.jpg` (shots and annotations). Also `node kit/scripts/edges.mjs films/acme`.
   QA must say PASS.
7. **Render**: `cd films/acme && npx hyperframes render --quality delivery -o renders/acme-launch.mp4`.
   Then `npm run qa -- films/acme --video renders/acme-launch.mp4`: contact sheet of the real render plus
   loudness (-22..-18 LUFS, true peak <= -1 dBTP), fades, streams and size (< 20 MB; re-encode the video
   with `ffmpeg -crf 23 -c:a copy` if needed).

Changing the kit: edit `video/kit/`, add a line to `kit/CHANGELOG.md`, `npm run sync -- <slug>` for the
films you own, re-run QA for every film you touched.

## Rules

**Retention (QA fails the film otherwise)**
- Under 60 s, always; aim for 45-55 s.
- Real product footage on screen and moving by 2.0 s: the cold open is footage with the headline
  over it, never a title card first.
- No standalone problem or title card longer than 2 s: fold the one-line why into the headline or a
  caption. End card ≤ 3 s: name and haiderb.com (a closing question is optional).
- No "If I join / First 30 days" next-steps card (kit 1.1): a demo shows skill, not plans. QA fails it.

**Text carries the story (kit 1.1; QA fails the film otherwise)**
- No voice of any kind: no narrator, no TTS, no cloned voice, no recorded speech. Everything the viewer
  must know is on screen, in a product-demo format: the caption band shows one v2 cue at a time, a
  kicker naming the step ("Step 2 · Check"), ONE headline of at most ~10 words on one line (58 px; never
  below 52 px), an optional detail line of at most ~14 words, and a slim progress stepper (which step of
  the demo we are on).
- Reading time: every cue and annotation stays on screen ≥ 0.6 s + 0.35 s per word (headline + detail +
  honesty chips; the kicker and speed tags are labels and are not counted). The cold-open headline too:
  a 2.2 s cold open carries ≤ 4 words.
- At most one caption plus one annotation on screen at once. An annotation is a ring plus a ≤ 6-word label
  next to a recorded component, auto-placed in the safe area, never over the focus box or the band, and
  shown inside one camera hold.

**Music (kit 1.1; QA fails the film otherwise)**
- Exactly one instrumental bed from `kit/music/` under the whole film (`music-bed.mjs`): fade in ≤ 0.3 s,
  fade out ~1.5 s landing on the last frame, about -20 LUFS integrated for the film (render QA: -22 to
  -18 LUFS, true peak ≤ -1 dBTP). By default the bed's own ending lands on the last frame.
- Any other `<audio>` or sounding `<video>` fails QA unless it carries `data-kit-audio-reason="..."`.

**Framing (QA fails the film otherwise)**
- Never cut off a component. Every camera keyframe names the component in focus; the camera
  (`Kit.camera.fit`) shows its whole recorded box inside the safe area: the frame minus 24 px, minus the
  caption band (y ≥ 840) while captions are on. It lowers the zoom rather than crop. Boxes are unioned
  over the hold, so a card that grows or scrolls while the camera holds stays in frame.
- A shot that deliberately shows part of a component says so in the shot data:
  `"partial": true, "reason": "…"`. QA lists every partial shot.
- Captions never cover the focused component (same safe area); callout rings and annotations must sit
  inside it too.
- The camera moves only through shot data (no hand-written tweens on `.kit-cam`).

**House style** (kit 1.1 matches the demo UI revamp, `src/demos/ui/tokens.module.css`)
- Ground #0a0a0f (the demo pages' canvas), Inter, ink #f2f1f9, ONE accent per film = its demo page's
  accent (`data-kit-accent`: iris #8e78ff, cobalt #6896ff, coral #ff8060; cyan #00e5ff for kit 1.0 films).
- No glow, no glass, no gradients in the film's own graphics (the v2 band is solid), no logos of the
  target company, no three-cards-in-a-row, no text sliding up. Words blur in (8 px → 0).

**Honesty**
- Footage is the real demo, recorded from the real page. Nothing in the UI is redrawn or faked.
- Every speed change is labelled with its rate (`.kit-speed`, "2.5x"); QA fails an unlabelled one.
- Replays from cache, example runs, held frames over long waits and simulated participants are
  labelled on screen (`.kit-chip` or a caption note) and noted in REVIEW.md.
- No AI avatar, no voice cloning, no narrator, no voice of any kind. The only sound is the music bed.

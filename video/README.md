# Launch videos

Every demo gets a ~50 s launch film: real screen capture of the working demo, captions, a cold open,
next steps and an end card. Films are HyperFrames projects (HTML rendered to video, 1920x1080, 30 fps).
Most of each film is shared parts from `kit/`; a new film should be ~80% reused.

```
video/
  kit/                 the shared library (catalog: kit/README.md)
    tokens.css kit.css   house style + component styles
    blocks/              full scenes: cold-open, title, next-steps, end-card
    components/          snippets: footage-scene, caption-band, callout-ring, speed-tag, label-chip, ...
    lib/                 camera framing, clip data, shot planner, reveals, captions (bundled to kit.js)
    scripts/             capture, build-footage, measure-boxes, new-film, sync, qa
    templates/film/      what new-film copies
  films/<slug>/        one self-contained HyperFrames project per film
    index.html           root: hosts for cold open, footage scenes, captions, next steps, end card
    compositions/        the film's own scenes (footage scenes, captions)
    kit/                 vendored copy of video/kit (npm run sync), never edited by hand
    capture/             record.cjs (capture script), cuts.json (hook and other cuts)
    data/clips/          per-clip DOM boxes, marks, events (committed, small); data/clips.js for the page
    raw/                 screencast frames (git-ignored)
    assets/footage/      built footage mp4/png (git-ignored)
    renders/             renders and QA sheets (git-ignored)
```

`node_modules` (hyperframes) is shared: `video/node_modules`, linked into each film by `sync`.
Nothing here is deployed: `.vercelignore` skips `video/`.

## Daily workflow

All commands run from `video/`.

1. **Scaffold**: `npm run new-film -- acme --company "Acme"`. Fill `films/acme/SPEC.md` (goal, shots).
2. **Capture** (real demo, real UI): run the demo locally (`npm run dev -- -p 3160` in the portfolio
   worktree, `.env.local` there), write `films/acme/capture/record.cjs` (template included), then
   `node films/acme/capture/record.cjs <clip>`. `track` every component a shot will focus on: the
   recorder stores its DOM box every frame, plus clicks, scrolls, the cursor path and your marks.
   Prefer the page's example run or same-day cached runs; a live run costs money. Note what you used.
   Keep every focused component fully inside the 1920x1080 viewport while recording (QA refuses a
   component that runs under the window edge or a sticky header).
3. **Build footage**: `npm run footage -- films/acme` → `assets/footage/<clip>.mp4` (30 fps CFR) and
   `data/clips/<clip>.json`. Add the cold-open cut to `capture/cuts.json`
   (`{"name": "hook", "from": "s1", "start": 1.0, "end": 3.4}`) and run it again.
4. **Edit**: set the block variables in `index.html` (headline, next steps, end-card question); build
   footage scenes from `kit/components/footage-scene.html`: trim clips with `data-media-start` /
   `data-playback-rate`, write camera keyframes as shot JSON (`{"t": 3.2, "focus": "trace"}`), add rings
   and captions. Preview: `cd films/acme && npx hyperframes preview`.
5. **Check + QA**: `cd films/acme && npx hyperframes check --json` (fix every error), then
   `npm run qa -- films/acme --frames` and look at `renders/qa/contact-sheet.jpg` and
   `renders/qa/framing-sheet.jpg`. QA must say PASS.
6. **Render**: `cd films/acme && npx hyperframes render --quality delivery -o renders/acme-launch.mp4`
   (silent films have no audio track). Then `npm run qa -- films/acme --video renders/acme-launch.mp4`
   for a contact sheet of the real render, `ffprobe` the duration, and keep the file under 20 MB
   (re-encode with `ffmpeg -crf 23` if needed).

Changing the kit: edit `video/kit/`, add a line to `kit/CHANGELOG.md`, `npm run sync:all`, re-run QA
for every film you touched.

## Rules

**Retention (QA fails the film otherwise)**
- Under 60 s, always; aim for 45-55 s.
- Real product footage on screen and moving by 2.0 s: the cold open is footage with the headline
  over it, never a title card first.
- No standalone problem or title card longer than 2 s: fold the one-line why into the headline or a
  caption. Next steps 3-4.5 s. End card ≤ 3 s.

**Framing (QA fails the film otherwise)**
- Never cut off a component. Every camera keyframe names the component in focus; the camera
  (`Kit.camera.fit`) shows its whole recorded box inside the safe area: the frame minus 24 px, minus the
  caption band (y ≥ 840) while captions are on. It lowers the zoom rather than crop. Boxes are unioned
  over the hold, so a card that grows or scrolls while the camera holds stays in frame.
- A shot that deliberately shows part of a component says so in the shot data:
  `"partial": true, "reason": "…"`. QA lists every partial shot.
- Captions never cover the focused component (same safe area); callout rings must sit inside it too.
- The camera moves only through shot data (no hand-written tweens on `.kit-cam`).

**House style**
- Ground #111111 (the demo pages' own background), Inter, ink #fafafa, one cyan accent #00e5ff.
- No glow, no glass, no decorative gradients (only the caption band's 40 px fade), no logos of the
  target company, no three-cards-in-a-row, no text sliding up. Words blur in (8 px → 0).
- Captions: one idea per cue, ≤ 2 lines at 48 px, ≥ 2.2 s on screen.

**Honesty**
- Footage is the real demo, recorded from the real page. Nothing in the UI is redrawn or faked.
- Every speed change is labelled with its rate (`.kit-speed`, "2.5x"); QA fails an unlabelled one.
- Replays from cache, example runs, held frames over long waits and simulated participants are
  labelled on screen (`.kit-chip` or a caption note) and noted in REVIEW.md.
- No AI avatar, no voice cloning, no narrator, no music. Silent unless the demo's own sound is the
  point (e.g. a recorded voice interview).

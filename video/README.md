# Launch videos

Every demo gets a launch film: real screen capture of the working demo, on-screen text that carries the whole
story, a light instrumental music bed and an end card. No voice of any kind. Films are HyperFrames projects
(HTML rendered to video, 1920x1080, 30 fps). Most of each film is shared parts from `kit/`.

**New films use the launch format (kit 2): 60-75 s, hook → what it is → the problem → ONE task → two
features → proof → end card. Read "Launch format (kit 2)" below.** The three kit 1.1 films (assemblyai,
distru, great-question: ~50 s, cold open + 7-step stepper) keep their own rules, listed under "Kit 1.1 films";
`scripts/qa.mjs` gates each film by the format its root declares (`data-kit-format="launch"` or nothing).

```
video/
  kit/                 the shared library (catalog: kit/README.md)
    tokens.css kit.css   house style + component styles
    blocks/              full scenes: launch-end (kit 2); cold-open, title, end-card (kit 1.1)
    components/          snippets: footage-scene, statement-scene, launch-captions, spotlight (kit 2);
                         caption-band (v2), annotation, music-bed, callout-ring, ...
    lib/                 camera framing, clip data, shot planner, annotations, text measures, music plan,
                         reveals, captions, launch rules (bundled to kit.js)
    music/               instrumental beds (README, beds.json); sync vendors the chosen one into the film
    scripts/             capture, build-footage, music-bed, measure-boxes, new-film, sync, qa, edges
    templates/film/      what new-film copies
  films/<slug>/        one self-contained HyperFrames project per film
    SPEC.md              the beat table (launch format): beat, seconds, picture, caption, focus box, honesty
    index.html           root: one host per beat, the captions host, the music bed
    compositions/        the film's own scenes (hook, what, problem, hero, features, proof, captions)
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

## Launch format (kit 2)

Why: the 45 s kit 1.1 films were confusing to a cold viewer: the whole page on screen so text was tiny, seven
steps in 45 s, captions about mechanics, and no statement of what the product is or what problem it solves.
The launch format is modelled on product launch demos: say what it is, name the pain, do ONE real task with
one focal point at a time, prove it, give one action.

### The eight beats (60-75 s total, never over 90; 7-9 scenes; three features at most)

| # | Beat (`data-kit-beat`) | Seconds | Picture | Text |
| --- | --- | --- | --- | --- |
| 1 | `hook` | 0-4 | The demo's best moment already happening (the result landing), zoomed so it reads on a phone. No title card, no logo | ONE line, <= 7 words, naming the outcome in plain words |
| 2 | `what` | ~4-10 | Statement scene over blurred, dimmed product footage | One plain sentence a stranger understands, big + "A prototype built for <Company> by Haider Bokhari" |
| 3 | `problem` | ~10-17 | Statement scene over the "before" state | One line naming the pain in the viewer's own world |
| 4 | `hero` | ~17-40 | ONE real task, start to finish, in 3-4 shots | One caption per shot |
| 5 | `feature` | 8-10 s | One idea tied to the same problem | One caption per shot |
| 6 | `feature` | 8-10 s | One idea, the coolest last | One caption per shot |
| 7 | `proof` | ~6 | The finished result in a wider shot | 1-3 real numbers from the run + ONE small "under the hood" line (the only place implementation terms go) |
| 8 | `end` | ~5 | End card (`kit/blocks/launch-end.html`) | "Built for <Company> by Haider Bokhari" / "Try it live: the link is in my message" / haiderb.com. One action |

### Rules (QA fails the film unless marked "warn")

**Scene rule.** The caption lands with the cut; the screen holds still 1-1.5 s; ONE action happens (the cursor
rests 450 ms, then clicks); the result holds at least 1.5-2 s; cut. Never change a caption in the middle of an
action; one camera move per caption, at its start. (QA: a camera move under a caption fails; captions off the
cut, two clicks under one caption, a click under 1 s after the caption or a result held under 1.5 s warn.)

**Captions.** One idea, one line, 8 words or fewer (9-12 warns, more fails), plain words: no internal names or
jargon ("a decision model", not the model's name; "pinned to the exact words", not "anchored"); say why it
matters, not what was clicked. On screen at least `max(2.5, 0.5 + 0.6 x words)` s and never over 7 s. Headline
64-72 px (68 by default; `--kit-cap3-head` on the film's `:root` to change it), ink on the solid band (contrast
17:1). No kicker ("STEP 3 · ANCHOR"), no detail line, no stepper: 3-4 plain chapter labels over a thin progress
bar (`.kit-chapters`). Statement sentences: <= 12 words, same reading time. Labels (`.kit-chip`, `.kit-speed`)
sit under the headline and are not counted.

**Attention.** One focal point per shot. Track ONE clause, ONE card, ONE button at capture and focus that: the
camera shows the whole focus box above the band, and hero / feature shots must show the page at >= 1.5x
(camera zoom x the clip's stage scale; "wide": true + a reason is the only exception). Dim everything else
with a spotlight (`.kit-spot`). A wide view of the whole page appears only in the hook or the proof beat.
Anything the viewer must read is large enough at phone width (shrink frames to 390 px and look) or restated in
the caption.

**Capture.** Record at 2x device pixels (`deviceScaleFactor: 2`) at a 1360x765 viewport: the page is then
1.41x on the 1920 stage, so a camera zoom of 1.4-2x shows it at 2-2.8x and stays sharp. Cursor about 1.5x a
system arrow (`cursor: {scale: 0.75, idleHide: 1200}`), hidden when idle, a visible pause before each click
(`clickPause: 450`). Record real holds (~1.3 s still before an action, >= 2.5 s after): no freeze frames needed.

**Speed and honesty.** Cut waits. Speed up streaming only as far as it stays readable and label the rate
(`.kit-speed`). Say what kind of run the footage is on the root (`data-kit-run="live | example | cached |
mixed"`) and label example and cached runs on screen (`.kit-chip`; QA fails without one). A still held over
1.5 s in a footage scene needs a "Held frame" chip. Real page footage only, nothing redrawn. No voice of any
kind; one instrumental bed at about -20 LUFS (`bright-pluck-112-long`, 94 s, for films over 59 s); the film must
work muted. No target-company logos. No "If I join" content.

### Daily workflow (launch format)

All commands run from `video/`. Heavy steps (next build/start, capture, footage, snapshots, render) go under
`flock /tmp/claude-0/heavy.lock` on the shared machine.

1. **Scaffold**: `npm run new-film -- acme --company "Acme"` (or, for a kit 1.1 film being rebuilt, keep the
   folder and copy `kit/templates/film/` over its `index.html`, `compositions/`, `SPEC.md`, `capture/`).
2. **Beat table first**: fill `films/acme/SPEC.md`: beat, seconds, picture, caption, focus box, honesty. Check
   every word and number against the real page and run. Read each caption against its reading time
   (8 words = 5.3 s, 7 = 4.7 s, 6 = 4.1 s). Add up the seconds: 60-75.
3. **Capture** (real demo, real UI): run the demo from an isolated copy (never run `next` inside the shared
   worktree: copy it without `node_modules`, `.next`, `video`, link `node_modules`, `next build && next start
   -p 3160`). Write `films/acme/capture/record.cjs` from the template: `track` every focus box; one take can
   carry the whole task if you scroll panes yourself between shots and `clip.mark()` each step. Record when
   nothing else is capturing or rendering (2x frames come at ~12-30 fps).
4. **Build footage**: `npm run footage -- films/acme <take> ...` → `assets/footage/<take>.mp4` (native 2x
   pixels) and `data/clips/<take>.json` (boxes and clicks scaled to the 1920 stage, marks in media seconds).
5. **Compose**: one host per beat in `index.html` (`data-kit-beat`), one `<video>` per shot with
   `data-media-start` from the marks, one cut in `kit-shots`, one `.kit-spot`, one cue in
   `compositions/captions.html`. Chapters: `data-kit-chapters="The problem:0|The task:16.2|…"`.
6. **Music**: `node kit/scripts/music-bed.mjs films/acme` (picks the 94 s bed when the film outlasts 60 s;
   re-run after any length change).
7. **Check + QA**: `cd films/acme && npx hyperframes check --json`, then
   `node kit/scripts/qa.mjs films/acme --frames --every 3.4`. QA must say PASS with 0 fail.
8. **Review loop**: look at ~20 stills across the film (`renders/qa/contact-sheet.jpg`, `framing-sheet.jpg`, the
   PNGs in `renders/qa/snap/`) against the rules above; shrink a few to 390 px wide and read them; fix and
   repeat. Then the cold-viewer test: after 15 seconds, could a stranger say what this is and what problem it
   solves?
9. **Render**: `cd films/acme && npx hyperframes render --quality delivery -o renders/acme-launch.mp4` (keep
   stdin open if you background it: `tail -f /dev/null | npx hyperframes render …`; the render cancels when
   its stdin closes), then `node kit/scripts/qa.mjs films/acme --video renders/acme-launch.mp4`, then the web
   encode: `ffmpeg -i renders/acme-launch.mp4 -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -movflags
   +faststart -c:a aac -b:a 128k ../../public/demo-videos/acme.mp4`.

How a film opts in: `data-kit-format="launch"` on the root in `index.html` and kit 2 vendored
(`npm run sync -- <slug>`). Without the attribute a film is gated by the kit 1.1 rules below.

## Kit 1.1 films: daily workflow

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

## Kit 1.1 films: rules

These gate films without `data-kit-format="launch"` (assemblyai, distru, great-question). Framing, house
style, music and honesty also apply to launch films.

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
  (Launch format: the same guarantee, applied to a SMALLER box. Focusing whole panes is what made the kit 1.1
  films tiny; track and focus one clause or one card, which must be fully visible.)
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

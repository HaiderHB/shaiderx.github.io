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


## 1.1.0 (2026-11-15) — text-first films with a music bed (Haider's new direction)

Why: no voice of any kind in demo films; on-screen text carries everything over a light instrumental bed;
no "If I join / First 30 days" card (a demo shows skill, not plans); every demo's UI was revamped
(commit "demo UI revamp"), so all footage is re-recorded and the palette follows the new UI.

New
- Music bed: `music/beds.json`, `lib/music.js` (`Kit.music.plan/volume/check/TARGET`),
  `scripts/music-bed.mjs` (plans the bed for the film's length, measures the excerpt, writes `#music` with
  the gain for -20 LUFS between `<!-- kit:music:start -->` / `<!-- kit:music:end -->`), `components/music-bed.html`.
  `sync` now vendors the film's bed into `films/<slug>/assets/music/` (git-ignored).
- Caption v2 (`.kit-cap.kit-cap2` > `.kit-cap-kicker` / `.kit-cap-head` / `.kit-cap-detail`, `data-kit-step`),
  solid band `.kit-band.kit-band2`, progress stepper `.kit-progress[data-kit-steps]` (built and driven by
  `Kit.captions.animate`), `*word*` accents in v2 heads. Headline 58 px (QA floor 52 px), detail 32 px.
- Annotations: `.kit-ann[data-kit-focus] > .kit-ann-label` in footage scenes (`components/annotation.html`,
  `lib/annotate.js`, planned in `Kit.scene.plan`, rendered by `Kit.scene.footage`): ring + ≤ 6-word label,
  auto-placed in the safe area, off the focus box, the ring and the band, preferring whitespace.
- `lib/text.js`: word counts, reading time, Inter glyph widths (QA's one-line checks), annotation sizes.
- `end-card` block: `question` may be "" (sign-off alone, larger).
- Tokens: palette of the revamped demo UI (ground #0a0a0f, ink #f2f1f9) and per-film accents via
  `data-kit-accent` on the root: `iris` #8e78ff (default; Distru), `cobalt` #6896ff (AssemblyAI),
  `coral` #ff8060 (Great Question), `cyan` #00e5ff (kit 1.0). `--kit-ground-rgb`, `--kit-accent-rgb`,
  `--kit-on-accent`, `--kit-gutter2`, `--kit-cap2-*`, `--kit-ann-size`.

Changed (look only; no attribute or function renamed)
- Default accent cyan -> iris; ground #111111 -> #0a0a0f; ink #fafafa -> #f2f1f9. `.kit-chip` border and
  the v1 band fade follow the tokens.
- The cold-open block uses the v2 solid band and `.kit-headline` is now top-anchored at y 864 (the v2 cue
  position), left gutter 120 px.
- QA: reading time is a FAIL (was a WARN under 1.8 s): every cue, annotation and the cold-open headline
  stays on screen >= 0.6 s + 0.35 s per word (head + detail + chips). Cues may not overlap; annotations
  may not overlap. v1 cues WARN. Exactly one music bed is required; any other `<audio>`, `<video
  data-has-audio>` or un-muted video with sound FAILS unless flagged `data-kit-audio-reason="..."`. The
  "silent" expectation is retired. A `next-steps` host FAILS. `--video` measures loudness (-22..-18 LUFS
  integrated, true peak <= -1 dBTP), fades (quiet first 30 ms, last 50 ms below -45 dB), streams (H.264
  1920x1080 30 fps + AAC) and size (< 20 MB). WARN when the root has no `data-kit-accent`.
- Template (`new-film`): no next-steps host; end card without a question; v2 captions with a stepper; an
  annotation in the demo scene; music markers; `data-kit-accent="iris"`; `npm run music`, `qa:render`.
- `next-steps` block and `voice-subtitle` / `place-audio` are kept but marked "not for demo films".

What films must change to adopt 1.1 (`npm run sync -- <slug>`, then QA)
1. Remove the `nextsteps` host from index.html; move the end card up; set the root `data-duration`.
2. Remove every voice `<audio>` (and the `kit:voice` markers) and voice cues; no `.kit-voice` cues.
3. Add `data-kit-accent="<demo accent>"` to the root (`iris` | `cobalt` | `coral`).
4. Add `<!-- kit:music:start -->` / `<!-- kit:music:end -->` inside the root after the scene hosts, then
   `node kit/scripts/music-bed.mjs films/<slug>` (re-run whenever the length changes).
5. Rewrite captions as v2 cues (`kit-cap kit-cap2`, kicker / head / detail, `data-kit-step`), add the
   `.kit-progress` stepper, switch the band to `kit-band kit-band2`; give each cue its reading time.
6. Cold-open headline: <= 4 words for a 2.2 s slot (5 for 2.5 s).
7. Optional: annotations (`.kit-ann`) on the proof points; leave the focus room for the label.
8. Render, then `qa.mjs --video renders/<slug>-launch.mp4` (loudness, fades, size) must PASS.

## 1.1.1 (2026-11-15) — additive

- `Kit.camera.fit` / shot data: `"edge": {"left": x}` (or `right`, `top`, `bottom`) puts footage x / y ON
  the frame edge, e.g. the 24 px gutter between two page columns, so a close-up on one column does not
  slice the other. Applied only while the focus still fits the safe area (+ pad); otherwise ignored with
  a QA warning. Beyond the footage edge the frame shows the stage ground (the demo canvas colour).
  No film change needed. Used by distru.
- Template (`templates/film/compositions/captions.html`) and `components/caption-band.html`: the sample cues
  are retimed so they pass the 1.1 reading-time rule as written. No film change needed.

## 2.0.0 (2026-11-16) — the launch format (additive)

Why: Haider found the kit 1.1 films confusing: too fast, hard to know where to look, and straight into the UI
without saying what the product is or what problem it solves. A research pass over ~55 sources on product
launch demos gives the new standard: 60-75 s, hook, what it is, the problem, ONE task, two features, proof,
end card; one caption of <= 8 words per shot; one focal point, zoomed and spotlit. It replaces the kit 1.1
retention rules for new films. Nothing in the kit was renamed or changed in meaning: the three kit 1.1 films
keep their vendored copy and pass QA exactly as before.

New
- Opt-in: `data-kit-format="launch"` on the film root; each scene host names its beat with `data-kit-beat`
  (`hook`, `what`, `problem`, `hero`, `feature`, `proof`, `end`); `data-kit-run` says what the footage is.
- `lib/launch.js`: `Kit.launch.RULES`, `BEATS`, `readingTime` (max(2.5, 0.5 + 0.6 x words)), `isLaunch`, `mag`,
  `cover`, `statement`.
- Launch caption `.kit-cap.kit-cap3` (one line, 68 px, no kicker), hook line `.kit-hook` (72 px, crisp on
  frame 0), proof cue `.kit-proof` (`.kit-stats` > `.kit-stat`, `.kit-hood`), label row `.kit-cap-tags`, and
  `.kit-chapters[data-kit-chapters]` (3-4 plain labels over a thin progress bar). `Kit.captions.animate`
  handles all of them; `Kit.captions.parseChapters`. In a launch film the band switches on with the cut.
- Statement scene (`components/statement-scene.html`, `Kit.launch.statement`): `.kit-stage.kit-backdrop`,
  `.kit-scrim`, `.kit-statement-text` / `.kit-statement-sub`, `data-kit-cam`.
- Spotlight `.kit-spot[data-kit-focus]` (`components/spotlight.html`): planned by `Kit.scene.plan` like a
  ring, flat dim outside the box, hard on cuts. `data-kit-window="a,b"` (rings too) takes the box from other scene
  seconds than the time on screen (the state before a click). QA plans spotlights with the rings.
- End card block `blocks/launch-end.html` (host id `launchend`; `built`, `action`, `url`).
- 2x capture: `capture.cjs` `deviceScaleFactor` (via `--force-device-scale-factor`; an emulated dsf does not
  reach the CDP screencast), `cursor: {scale, idleHide}`, `clickPause`; `build-footage.mjs` keeps the pixels and
  scales boxes, cursor and clicks to the 1920x1080 stage (`stageScale`, `viewport`, `deviceScaleFactor`,
  `pixels` in the clip data). This closes great-question's suggestion 6.
- `Kit.scene.plan` keyframes gain `mag` (camera zoom x stage scale), `stageScale`, `wide`; the "zoom < 1"
  warning now looks at `mag`.
- Music: `music/bright-pluck-112-long.mp3` (94 s) and `"long"` in `beds.json`; `music-bed.mjs` picks the long
  version when the film outlasts the bed; QA fails a bed shorter than its film (all films).
- Tokens: `--kit-cap3-top`, `--kit-cap3-head`, `--kit-cap3-hook`, `--kit-chapters-top`, `--kit-statement`,
  `--kit-backdrop-blur`, `--kit-scrim`, `--kit-spot-dim`.
- QA (`scripts/qa.mjs`), launch films only: duration 55-90 s; footage at 0.0 s; beats present, once, in order;
  <= 2 feature beats; hook <= 5 s; statements with product footage, the problem named by 20 s; end card 4-6 s
  with its three lines; `.kit-cap3` cues only, word limits, one line, 64-72 px, reading time, <= 7 s; one hook
  line, one proof cue (1-3 numbers, one under-the-hood line); `.kit-chapters` with 3-4 labels; hero / feature
  shots at >= 1.5x; no camera move under a caption; run label; held-frame label; no "If I join". Warnings:
  9-12 words, jargon, caption off the cut, more than one click per caption, short still / hold, no spotlight.
- Template and `new-film`: a launch-format film with a beat-table SPEC.md and a 2x capture script.

HyperFrames catalog (0.9.58), checked before writing these: `yt-feather-highlight` (dims the frame except a
feathered ellipse), `mk-progress-stat` / `count-up` (stat with count-up and a progress track), `agent-cursor`,
`code-highlight`. Not adopted: none of them is placed from the recorded DOM boxes or planned by QA, and the
feathered / glowing looks break the house style (flat dim, no glow). `count-up` is the one worth a look for
the proof numbers in a later version.

Changed
- `Kit.version` 2.0.0. `scripts/qa.mjs` end-card limit is 6 s for launch films (3 s otherwise).
- The kit 1.1 template (cold open + stepper) is replaced by the launch template; the 1.1 blocks and components
  stay in the kit for the three films built on them.

What a kit 1.1 film must change to adopt the launch format (see video/README.md, "Daily workflow (launch format)")
1. `npm run sync -- <slug>`; add `data-kit-format="launch"` and `data-kit-run` to the root.
2. Write the beat table in SPEC.md; replace the cold-open host and the single footage scene with one host per
   beat (`data-kit-beat`); statements are `data-kit-role="statement"`.
3. Re-capture at 2x with small focus boxes tracked; rebuild footage; set `data-media-start` per shot.
4. Rewrite captions as `.kit-cap3` cues (no kicker, no detail, no `data-kit-step`); replace `.kit-progress` with
   `.kit-chapters`; add the hook line and the proof cue.
5. Swap `kit/blocks/end-card.html` for `kit/blocks/launch-end.html` (host id `launchend`).
6. `node kit/scripts/music-bed.mjs films/<slug>`; check, QA, review stills, render, `qa.mjs --video`.


## 2.1.0 (2026-11-18) — pacing (Haider's review of the Affirm, Superhuman and Truss films)

- **Text screens run 3 s each.** `RULES.statement` is now `{words: 10, maxWords: 12, sec: 3, minSec: 2.8, maxSec: 3.5}`;
  QA fails a `what` / `problem` statement outside 2.8-3.5 s (it used to demand the caption reading time, ~6 s
  each: 12 s of text before the product moved). `Kit.launch.statement` reveals the words faster on a 3 s screen.
- **The result rule.** New `RULES.land` and `Kit.launch.landHold(words)`. Every hero / feature `<video>` shot
  carries `data-kit-lands` (seconds from the shot's start when its result is fully on screen) and optionally
  `data-kit-read` (words to read in it); QA fails a missing `data-kit-lands` and a result cut sooner than
  `max(2.5, 0.5 + 0.3 x words)` s (6 s at most), and warns when the wait is over half the shot.
- Film template: statements 4.2-7.2 and 7.2-10.2, everything after moved 6 s earlier (60.2 s total), shots carry
  the two attributes, SPEC.md has a "Result lands at / held for" column.
- What films must do: `npm run sync -- <slug>`, set both statement hosts to 3 s and move every later host, cue,
  chapter and the music bed 6 s earlier, add `data-kit-lands` / `data-kit-read` to hero and feature shots and
  re-cut any shot that fails. gc-ai, goodtime and reacher shipped under 2.0 and were not re-cut; they need this
  before any re-render.

## 2.1.1 (2026-11-18) — Windows (additive, from the vena film)

- `scripts/sync.mjs`: on Windows without symlink rights (EPERM), links a film's `node_modules` with a directory
  junction instead of failing. Nothing changes elsewhere; no film needs a re-sync.
- `scripts/capture.cjs`: when the 2x window comes up smaller than the viewport (branded Chrome, `launch: {channel:
  "chrome"}`, counts its frame in `--window-size`), it grows the window by the gap over CDP instead of throwing.
- `scripts/qa.mjs`, `scripts/edges.mjs`: the dynamic import of `sync.mjs` uses a file URL (Windows paths broke it);
  `qa.mjs --frames` spawns `npx hyperframes snapshot` through a shell on Windows and reports a spawn error as text.

## Open suggestions from the v3 films (2026-11-15, not applied)

No kit files changed for AssemblyAI or Great Question v3. Notes kept for a later version:

### From assemblyai

No kit files were added or changed for this film: it is built on kit 1.1.0 as vendored by
`node kit/scripts/sync.mjs assemblyai`. Notes for the kit maintainer, from building it (none blocking):

- capture.cjs under load: on this 2-core box the CDP screencast drops to ~10 fps while another capture or
  render runs (~25-35 fps during motion when idle). A README line ("record when nothing else is
  capturing or rendering") would save re-takes. Tracking fewer components per take did not change the rate.
- annotate.js: when the focus box spans the frame width, the label can only go below the focus box, over
  the next component. On running text that can leave a misleading fragment visible (here it hid
  "un" of "undocumented"). A `data-kit-side="none"` / ring-only fallback, or a QA warning when the label
  covers text that continues on the same line, would catch it. The film uses a callout ring instead.
- cold-open block: `pad` / `margin` variables (like scene shots) would let a cold open reach the same
  zoom as a scene's matching first keyframe without relying on the "lowered to fit" value.
- The page header on the revamped demo UI is a floating sticky pill (y 12-68): frames whose top edge is
  under ~70 px of a scrolled page show a sliver of it; `align: "top", pad: 0, margin: 0` on a focus that
  starts ~85 px down keeps it out.

### From great-question

Kit changes made: none. The film uses kit 1.1.0 as vendored by `npm run sync -- great-question`; no file under
`video/kit/` was edited (this note is the only addition).

Suggestions for a later kit release (not applied; observed while cutting great-question v3):

1. `lib/camera.js`: `pad` applies to every side, so a shot cannot put the left edge in a column gap
   (needs pad ~50) and the top edge in a row gap (needs pad ~0) at once. A per-axis option
   (`padX` / `padY`) or an explicit `edge: {left: x, top: y}` in footage px would let shots land every
   frame edge in whitespace (scripts/edges.mjs advisories).
2. `lib/annotate.js`: placement fails by 1-4 px when a label just fits beside the focus box
   (e.g. 304 px label, 300 px room). Trying a 12 px gap before giving up, or letting the label
   shrink its padding, would save a re-label.
3. `lib/annotate.js`: a leader from a ring in the left column to a label beyond the right column crosses the
   neighbouring card's text (findings grid). Prefer the side whose leader crosses no other tracked component.
4. `scripts/qa.mjs --video <path>` resolves the path against the film folder; passing
   `films/<slug>/renders/x.mp4` from `video/` throws an ffmpeg stack trace instead of "file not found".
5. `scripts/capture.cjs`: with ~110 tracked components sampled every animation frame, the screencast lag
   (frame-lag.py) was median 0.09 s but spiked to ~0.4-0.5 s when a turn's TTS started and new transcript
   nodes rendered. Sampling at most every 2nd frame, or only components named in a `focus` list, would cut it.
6. `scripts/capture.cjs`: a `deviceScaleFactor` option (record at 2x, downscale in build-footage) would keep
   small UI text sharp at 1.5-2x camera zoom; text-first films zoom into transcripts and JSON a lot.

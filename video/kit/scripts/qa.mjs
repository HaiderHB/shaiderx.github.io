#!/usr/bin/env node
/*
 * kit/scripts/qa.mjs — the film gate. Fails loudly (exit 1) on any rule break.
 *
 *   node kit/scripts/qa.mjs <film> [--frames] [--video renders/x.mp4] [--at 3,7.5] [--every 3]
 *                                  [--out renders/qa] [--json]
 *
 * Checks (static, from the same shot data and kit/lib code that renders the film):
 *   duration        root data-duration < 60 s (FAIL), 45-55 s target (WARN outside)
 *   first product   first real footage frame (video/img from assets/footage|stills or data-kit-clip)
 *                   on screen at <= 2.0 s (FAIL)
 *   scene lengths   cold-open <= 3 s (WARN > 2.5), title/problem/text card <= 2 s (FAIL),
 *                   next-steps <= 4.5 s (WARN; FAIL > 6), end-card <= 3 s (FAIL)
 *   framing         every camera keyframe of every footage scene and the cold open: the focused
 *                   component's recorded box, unioned over the hold, lies fully inside the safe area
 *                   (frame minus 24 px margin, minus the caption band when captions are on); the box
 *                   is not cut off in the source footage; partial shots need a reason (listed)
 *   rings           every callout ring is inside the safe area under the shot in force
 *   speed labels    every footage clip with data-playback-rate != 1 is covered by a .kit-speed tag
 *                   whose text shows that rate (FAIL)
 *   captions        (kit 1.1) one cue on screen at a time (FAIL); reading time: on screen >= 0.6 s +
 *                   0.35 s per word of head + detail + chips (FAIL; the cold-open headline too); v2 cue
 *                   head <= ~10 words and detail <= ~14 (WARN 11-12 / 15-16, FAIL above), each fits one
 *                   line (FAIL), head >= 52 px (FAIL); v1 cues WARN; progress steps match the stepper;
 *                   captions:false shots with a cue (FAIL)
 *   annotations     (kit 1.1) label <= 6 words, reading time, inside one camera hold, ring in the safe
 *                   area, a label placement off the focus box and the band, one at a time (FAIL)
 *   music + voice   (kit 1.1) exactly one music bed (<audio class="kit-music">) from 0 to the film's end,
 *                   fade in <= 0.3 s, fade out ~1.5 s, a level, the file vendored (FAIL); any other
 *                   <audio>, <video data-has-audio> or un-muted video with sound FAILS unless it carries
 *                   data-kit-audio-reason="..." (WARN); next-steps block in a demo film (FAIL)
 *   style           glow / glass / decorative gradients (WARN); data-kit-accent on the root (WARN)
 * Launch format (kit 2): a film whose root carries data-kit-format="launch" is gated by these rules instead
 * of the kit 1.1 duration, scene-length and caption rules above (framing, rings, speed labels, annotations,
 * music and style still apply):
 *   duration        55-90 s (FAIL), target 60-75 s (WARN outside); product footage on screen at 0.0 s (FAIL)
 *   beats           every scene host names its beat (data-kit-beat): hook, what, problem, hero, feature (<= 2),
 *                   proof, end; each required beat once, in that order (FAIL); 7-9 scenes (WARN); hook <= 5 s
 *                   from 0 s on footage; what and problem are statement scenes, the problem named by 20 s
 *                   (FAIL); end card 4-6 s with its three lines; no title, cold-open or next-steps host (FAIL)
 *   captions        .kit-cap3 cues only: ONE line, no kicker, no detail line (FAIL); <= 8 words (WARN 9-12, FAIL
 *                   above; hook <= 7, FAIL); 64-72 px; on screen >= max(2.5, 0.5 + 0.6 x words) s and <= 7 s
 *                   (FAIL); one proof cue with 1-3 numbers and at most one under-the-hood line (FAIL);
 *                   statement screens (what, problem) run 3 s each, 2.8-3.5 (FAIL), sentence <= 10 words
 *                   (WARN, FAIL above 12)
 *   progress        a .kit-chapters element with 3-4 chapters (FAIL); a stepper with more than 4 steps (FAIL)
 *   attention       hero / feature shots show the page at >= 1.5x (camera zoom x the clip's stage scale; FAIL
 *                   unless the shot is "wide": true with a reason); a spotlight, ring or annotation per hero /
 *                   feature scene (WARN); the camera does not move under a caption (FAIL); captions land on a
 *                   cut or move, at most one click per caption, >= 1 s still before it and >= 1.5 s after (WARN);
 *                   the result rule (kit 2.1): every hero / feature shot names when its result is on screen
 *                   (data-kit-lands, seconds from the shot's start) and then holds max(2.5, 0.5 + 0.3 x
 *                   data-kit-read words) s before the cut (FAIL); a wait over half the shot warns
 *   honesty         data-kit-run on the root ("live" | "example" | "cached" | "mixed"; WARN if missing); example
 *                   and cached runs need a chip saying so (FAIL); a still held > 1.5 s in a footage scene needs
 *                   a "held frame" chip (FAIL); "If I join" content (FAIL); jargon in captions (WARN)
 *   music           the bed must be at least as long as the film (FAIL)
 * With --frames (HyperFrames snapshot) or --video (frames from a render): a contact sheet at every
 * --every seconds (default 3), every scene seam (-0.2 / +0.2 s) and --at times, plus a framing sheet
 * (one frame per keyframe hold and per annotation: focus rect cyan, safe area dashed, ring and label).
 * --video also measures the render (kit 1.1): integrated loudness -22..-18 LUFS and true peak <= -1 dBTP
 * (FAIL), an audio stream (AAC), a quiet first 30 ms and a faded last 50 ms (FAIL), 1920x1080 30 fps
 * H.264 and < 20 MB (FAIL). Written to --out (renders/qa).
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
if (!argv.length || argv[0] === "--help") {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0]);
  process.exit(argv.length ? 0 : 1);
}
const film = path.resolve(argv[0]);
const flag = (k) => argv.includes(k);
const val = (k, d) => {
  const i = argv.indexOf(k);
  return i >= 0 ? argv[i + 1] : d;
};
const OUT = path.resolve(film, val("--out", "renders/qa"));
const EVERY = parseFloat(val("--every", "3"));
const EXTRA_AT = (val("--at", "") || "").split(",").filter(Boolean).map(Number);
const VIDEO = val("--video", null);
const WANT_FRAMES = flag("--frames") || !!VIDEO;
const JSON_OUT = flag("--json");

// ---------- load the film's own vendored kit (what renders), fall back to video/kit ----------
const libDir = fs.existsSync(path.join(film, "kit", "lib")) ? path.join(film, "kit", "lib") : path.join(HERE, "..", "lib");
const { libFiles } = await import(path.join(HERE, "sync.mjs"));
globalThis.Kit = undefined;
const order = libFiles().filter((f) => fs.existsSync(path.join(libDir, f)));
for (const f of order) require(path.join(libDir, f));
const Kit = globalThis.Kit;
globalThis.__kitWarnings = [];
const origWarn = console.warn;
console.warn = () => {};

const clipsDir = path.join(film, "data", "clips");
globalThis.KIT_CLIPS = {};
if (fs.existsSync(clipsDir))
  for (const f of fs.readdirSync(clipsDir).filter((f) => f.endsWith(".json"))) {
    const c = JSON.parse(fs.readFileSync(path.join(clipsDir, f), "utf8"));
    globalThis.KIT_CLIPS[c.name] = c;
  }

// ---------- tiny HTML reader (tags + attributes; enough for HyperFrames files) ----------
function stripComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, (m) => " ".repeat(m.length));
}
function parseAttrs(s) {
  const out = {};
  const re = /([^\s=>\/"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let m;
  while ((m = re.exec(s))) out[m[1]] = m[2] != null ? m[2] : m[3] != null ? m[3] : m[4] != null ? m[4] : "";
  return out;
}
function tags(html) {
  const out = [];
  const re = /<([a-zA-Z][\w-]*)((?:\s+[^\s=>\/"']+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>/g;
  let m;
  while ((m = re.exec(html))) out.push({ name: m[1].toLowerCase(), attrs: parseAttrs(m[2] || ""), index: m.index, end: re.lastIndex });
  return out;
}
const hasClass = (t, c) => (" " + (t.attrs.class || "") + " ").includes(" " + c + " ");
const num = (v, d = 0) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : d);
const textAfter = (html, t) => html.slice(t.end, html.indexOf("<", t.end)).trim();

// ---------- results ----------
const results = [];
const add = (level, area, msg, extra) => results.push(Object.assign({ level, area, msg }, extra || {}));
const PASS = (a, m, e) => add("PASS", a, m, e);
const WARN = (a, m, e) => add("WARN", a, m, e);
const FAIL = (a, m, e) => add("FAIL", a, m, e);

// ---------- index.html ----------
const indexHtml = stripComments(fs.readFileSync(path.join(film, "index.html"), "utf8"));
const itags = tags(indexHtml);
const rootTag = itags.find((t) => t.attrs["data-composition-id"] === "main") || itags.find((t) => t.attrs.id === "root");
const duration = num(rootTag && rootTag.attrs["data-duration"], NaN);
// kit 2: launch-format films opt in on the root and are gated by the launch rules (kit/lib/launch.js)
const LAUNCH = !!rootTag && rootTag.attrs["data-kit-format"] === "launch";
const L = Kit.launch ? Kit.launch.RULES : null;
// kit 2.1 pacing rules; QA runs on the film's vendored lib, so a film synced before 2.1 falls back to these and is told to sync
const LAND = (L && L.land) || { hold: 2.5, base: 0.5, perWord: 0.3, maxHold: 6, waitShare: 0.5, waitSec: 2.5 };
const landHold = (w) => +Math.min(LAND.maxHold, Math.max(LAND.hold, LAND.base + LAND.perWord * (w || 0))).toFixed(2);
const STMT = { sec: 3, minSec: 2.8, maxSec: 3.5 };
if (LAUNCH && !L) {
  console.error('data-kit-format="launch" but the film\'s kit has no lib/launch.js: run npm run sync -- <slug> (kit 2)');
  process.exit(1);
}
const hosts = itags
  .filter((t) => t.attrs["data-composition-src"])
  .map((t) => {
    const src = t.attrs["data-composition-src"];
    const file = path.join(film, src);
    const raw = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
    const html = stripComments(raw);
    let role = t.attrs["data-kit-role"];
    if (!role) {
      if (/cold-open\.html$/.test(src)) role = "cold-open";
      else if (/end-card\.html$/.test(src)) role = "end-card";
      else if (/next-steps\.html$/.test(src)) role = "next-steps";
      else if (/title\.html$/.test(src)) role = "title";
      else if (t.attrs["data-track-kind"] === "captions") role = "captions";
      else if (/data-kit-clip=|<video/.test(html)) role = "footage";
      else role = "card";
    }
    let vars = {};
    try {
      vars = JSON.parse(t.attrs["data-variable-values"] || "{}");
    } catch (e) {
      FAIL("index", `#${t.attrs.id}: data-variable-values is not valid JSON`);
    }
    return { id: t.attrs.id, cid: t.attrs["data-composition-id"], src, file, raw, html, role, beat: t.attrs["data-kit-beat"] || null, start: num(t.attrs["data-start"]), duration: num(t.attrs["data-duration"]), vars, missing: !raw };
  });
hosts.forEach((h) => {
  if (h.missing) FAIL("index", `#${h.id}: ${h.src} not found`);
  if (h.id !== h.cid) FAIL("index", `#${h.id}: host id must equal data-composition-id (${h.cid})`);
});

// ---------- kit 1.1: demo films carry no next-steps card; one accent per film ----------
hosts.forEach((h) => {
  if (h.role === "next-steps") FAIL("scenes", `#${h.id}: the next-steps block is not for demo films (kit 1.1: a demo shows skill, not plans); remove it`);
});
const accentAttr = rootTag && rootTag.attrs["data-kit-accent"];
if (!accentAttr) WARN("style", 'root has no data-kit-accent: set the demo page\'s accent ("iris", "cobalt" or "coral"; tokens.css)');
else PASS("style", `accent: ${accentAttr}`);

// ---------- duration ----------
if (!Number.isFinite(duration)) FAIL("duration", "root data-duration missing");
else if (LAUNCH) {
  const D = L.duration;
  if (duration < D.min || duration > D.max) FAIL("duration", `${duration.toFixed(2)} s: launch films run ${D.min}-${D.max} s (target ${D.targetMin}-${D.targetMax} s)`);
  else if (duration < D.targetMin || duration > D.targetMax) WARN("duration", `${duration.toFixed(2)} s (launch target ${D.targetMin}-${D.targetMax} s, never over ${D.max} s)`);
  else PASS("duration", `${duration.toFixed(2)} s (launch format: target ${D.targetMin}-${D.targetMax} s, never over ${D.max} s)`);
} else if (duration >= 60) FAIL("duration", `${duration.toFixed(2)} s: films must be under 60 s`);
else if (duration < 45 || duration > 55) WARN("duration", `${duration.toFixed(2)} s (target 45-55 s, cap < 60 s)`);
else PASS("duration", `${duration.toFixed(2)} s (target 45-55 s, cap < 60 s)`);

// ---------- per-composition elements ----------
const product = [];
const speedClips = [];
const speedTags = [];
const cues = [];
const sounds = []; // every element that can make sound: {where, id, kind, attrs}
const unmuted = []; // <video> without muted / data-has-audio: silent only if its file has no audio stream
const pick = (body, cls) => {
  const m = body.match(new RegExp(`class="[^"]*\\b${cls}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/div>`));
  return m ? m[1] : null;
};
hosts.forEach((h) => {
  const ts = tags(h.html);
  const capTags = ts.filter((t) => hasClass(t, "kit-cap") && hasClass(t, "clip"));
  ts.forEach((t, i) => {
    const a = t.attrs;
    const isMedia = t.name === "video" || t.name === "img";
    if (isMedia && (a["data-kit-clip"] || /assets\/(footage|stills)\//.test(a.src || ""))) {
      const s = h.start + num(a["data-start"]);
      const d = num(a["data-duration"], t.name === "img" ? 3 : h.duration);
      product.push({ host: h.id, id: a.id, start: s, end: Math.min(h.start + h.duration, s + d), still: t.name === "img" });
      const rate = num(a["data-playback-rate"], 1);
      if (Math.abs(rate - 1) > 1e-3 && t.name === "video") speedClips.push({ host: h.id, id: a.id, rate, start: s, end: Math.min(h.start + h.duration, s + d) });
    }
    if (t.name === "audio" || (t.name === "video" && a["data-has-audio"] === "true")) sounds.push({ where: h.id, id: a.id || "?", kind: t.name, attrs: a });
    else if (t.name === "video" && !("muted" in a)) unmuted.push({ where: h.id, id: a.id || "?", src: a.src || "" });
    if (hasClass(t, "kit-speed")) {
      // the cue it sits in (captions) or its own data-tag window
      const cue = capTags.filter((c) => c.index < t.index).pop();
      const cs = cue ? num(cue.attrs["data-start"]) : 0;
      const ce = cue ? cs + num(cue.attrs["data-duration"]) : h.duration;
      const s = a["data-tag-start"] != null ? num(a["data-tag-start"]) : cs;
      const e = a["data-tag-end"] != null ? num(a["data-tag-end"]) : ce;
      speedTags.push({ host: h.id, rate: num(a["data-rate"], NaN), text: textAfter(h.html, t), start: h.start + Math.max(s, cs), end: h.start + Math.min(e, ce) });
    }
  });
  if (h.role === "captions")
    capTags.forEach((c) => {
      const s = h.start + num(c.attrs["data-start"]);
      const d = num(c.attrs["data-duration"]);
      const next = capTags.find((x) => x.index > c.index);
      const body = h.html.slice(c.end, next ? next.index : h.html.length);
      const v3 = hasClass(c, "kit-cap3"); // kit 2 launch cue
      const proof = v3 && hasClass(c, "kit-proof");
      const v2 = v3 || hasClass(c, "kit-cap2");
      const head = proof ? "" : pick(body, v2 ? "kit-cap-head" : "kit-cap-main");
      const detail = pick(body, v2 ? "kit-cap-detail" : "kit-cap-note");
      const kicker = pick(body, v2 ? "kit-cap-kicker" : "kit-cap-label");
      const chips = [...body.matchAll(/<span[^>]*class="[^"]*\bkit-chip\b[^"]*"[^>]*>([\s\S]*?)<\/span>/g)].map((m) => Kit.text.plain(m[1]));
      const main = Kit.text.plain(head != null ? head : body);
      cues.push({
        id: c.attrs.id,
        start: s,
        end: s + d,
        duration: d,
        v2,
        text: main,
        head: main,
        detail: detail != null ? Kit.text.plain(detail) : "",
        kicker: kicker != null ? Kit.text.plain(kicker.replace(/<span[^>]*class="[^"]*\bkit-(speed|chip|tag)\b[\s\S]*?<\/span>/g, "")) : "",
        chips,
        step: c.attrs["data-kit-step"] != null ? parseInt(c.attrs["data-kit-step"], 10) : null,
        voice: hasClass(c, "kit-voice"),
        v3,
        hook: v3 && hasClass(c, "kit-hook"),
        proof,
        stats: proof ? [...body.matchAll(/class="[^"]*\bkit-stat-n\b[^"]*"[^>]*>([\s\S]*?)<\/span>\s*<span[^>]*class="[^"]*\bkit-stat-l\b[^"]*"[^>]*>([\s\S]*?)<\/span>/g)].map((m) => Kit.text.plain(m[1] + " " + m[2])) : [],
        hoods: proof ? [...body.matchAll(/class="[^"]*\bkit-hood\b[^"]*"[^>]*>([\s\S]*?)<\/div>/g)].map((m) => Kit.text.plain(m[1])) : [],
        host: h.id,
      });
    });
});
// root-level sound in index.html (the music bed, or voice placed by place-audio.mjs) also counts
itags.forEach((t) => {
  if (t.name === "audio" || (t.name === "video" && t.attrs["data-has-audio"] === "true")) sounds.push({ where: "main", id: t.attrs.id || "?", kind: t.name, attrs: t.attrs });
  else if (t.name === "video" && !("muted" in t.attrs)) unmuted.push({ where: "main", id: t.attrs.id || "?", src: t.attrs.src || "" });
});

// ---------- first product frame ----------
const firstProduct = product.length ? Math.min(...product.map((p) => p.start)) : Infinity;
if (!product.length) FAIL("retention", "no product footage found (video/img with data-kit-clip or assets/footage src)");
else if (LAUNCH && firstProduct > 0.05) FAIL("retention", `first product frame at ${firstProduct.toFixed(2)} s: a launch film opens on the hook, footage from frame 0`);
else if (firstProduct > 2.0) FAIL("retention", `first product frame at ${firstProduct.toFixed(2)} s (must be <= 2.0 s)`);
else PASS("retention", `first product frame at ${firstProduct.toFixed(2)} s (<= 2.0 s)`);

// ---------- scene lengths ----------
hosts.forEach((h) => {
  const d = h.duration;
  const tag = `#${h.id} (${h.role}) ${h.start.toFixed(2)}-${(h.start + d).toFixed(2)} s = ${d.toFixed(2)} s`;
  if (h.role === "cold-open") {
    if (d > 3) FAIL("scenes", tag + ": cold open must be <= 3 s");
    else if (d > 2.5) WARN("scenes", tag + ": cold open longer than 2.5 s");
    else PASS("scenes", tag);
    if (h.start > 0.01) FAIL("scenes", tag + ": cold open must start at 0");
  } else if (h.role === "title" || h.role === "problem" || h.role === "card") {
    if (d > 2.0) FAIL("scenes", tag + ": text card longer than 2 s (fold it into the cold-open headline or a caption)");
    else PASS("scenes", tag);
  } else if (h.role === "next-steps") {
    if (d > 6) FAIL("scenes", tag + ": next steps longer than 6 s");
    else if (d > 4.5) WARN("scenes", tag + ": next steps longer than 4.5 s");
    else PASS("scenes", tag);
  } else if (h.role === "end-card") {
    const max = LAUNCH ? L.end.maxSec : 3.0;
    if (d > max + 1e-6) FAIL("scenes", tag + `: end card must be <= ${max} s`);
    else if (LAUNCH && d < L.end.minSec - 1e-6) WARN("scenes", tag + `: launch end card runs about 5 s (${L.end.minSec}-${L.end.maxSec} s)`);
    else PASS("scenes", tag);
  } else PASS("scenes", tag);
  if (Number.isFinite(duration) && h.start + d > duration + 1e-3) WARN("scenes", `#${h.id} ends at ${(h.start + d).toFixed(2)} s, after the root (${duration} s): it is cut`);
});
// gaps between picture scenes
const pics = hosts.filter((h) => h.role !== "captions").sort((a, b) => a.start - b.start);
for (let i = 1; i < pics.length; i++) {
  const gap = pics[i].start - (pics[i - 1].start + pics[i - 1].duration);
  if (gap > 0.1) WARN("scenes", `gap of ${gap.toFixed(2)} s (bare ground) between #${pics[i - 1].id} and #${pics[i].id}`);
}
if (pics.length && Number.isFinite(duration)) {
  const lastEnd = Math.max(...pics.map((h) => h.start + h.duration));
  if (lastEnd < duration - 0.1) WARN("scenes", `scenes end at ${lastEnd.toFixed(2)} s but the root runs to ${duration} s`);
}

// ---------- framing ----------
const plans = [];
function blockDefaultsOf(html) {
  return blockDefaults(html);
}
function blockDefaults(html) {
  const m = html.match(/data-composition-variables='([^']*)'/);
  const out = {};
  if (m)
    try {
      JSON.parse(m[1]).forEach((d) => (out[d.id] = d.default));
    } catch (e) {
      /* ignore */
    }
  return out;
}
function sceneClipsOf(h) {
  const list = tags(h.html)
    .filter((t) => (t.name === "video" || t.name === "img") && t.attrs["data-kit-clip"])
    .map((t) => Object.assign({ id: t.attrs.id }, t.attrs));
  return Kit.clips.fromAttrs(list).map((c) => Object.assign(c, { end: Math.min(c.end, h.duration) }));
}
hosts.forEach((h) => {
  if (h.role === "cold-open") {
    const v = Object.assign(blockDefaults(h.html), h.vars);
    const p = Kit.scene.plan({ scene: h.id, shots: Kit.blocks.coldOpenShots(v, h.duration), sceneClips: sceneClipsOf(h), duration: h.duration });
    plans.push(Object.assign(p, { host: h }));
  } else if (h.role === "footage") {
    const m = h.html.match(/<script[^>]*class="kit-shots"[^>]*>([\s\S]*?)<\/script>/);
    if (!m) {
      FAIL("framing", `#${h.id}: footage scene without <script type="application/json" class="kit-shots"> (camera must come from shot data)`);
      return;
    }
    let shots;
    try {
      shots = JSON.parse(m[1]);
    } catch (e) {
      FAIL("framing", `#${h.id}: kit-shots is not valid JSON: ${e.message}`);
      return;
    }
    // rings and (kit 2) spotlights are planned the same way: the box must sit inside the safe area
    const rings = tags(h.html)
      .filter((t) => (hasClass(t, "kit-ring") || hasClass(t, "kit-spot")) && t.attrs["data-kit-focus"])
      .map((t) => {
        let focus = t.attrs["data-kit-focus"].replace(/&quot;/g, '"');
        if (focus.trim().startsWith("[")) focus = JSON.parse(focus);
        const s = num(t.attrs["data-start"]);
        const spot = hasClass(t, "kit-spot");
        const win = (t.attrs["data-kit-window"] || "").split(",").map(Number);
        return { id: t.attrs.id, start: s, end: s + num(t.attrs["data-duration"], 1), focus, spot, window: win.length === 2 && win.every(Number.isFinite) ? win : null, pad: t.attrs["data-kit-pad"] != null ? num(t.attrs["data-kit-pad"]) : spot ? 10 : 6 };
      });
    const localCues = cues.map((c) => ({ id: c.id, start: c.start - h.start, end: c.end - h.start }));
    const annotations = tags(h.html)
      .filter((t) => hasClass(t, "kit-ann") && t.attrs["data-kit-focus"])
      .map((t) => {
        let focus = t.attrs["data-kit-focus"];
        if (focus.trim().startsWith("[")) focus = JSON.parse(focus);
        const s = num(t.attrs["data-start"]);
        const lm = h.html.slice(t.end).match(/class="[^"]*\bkit-ann-label\b[^"]*"[^>]*>([\s\S]*?)<\/div>/);
        return { id: t.attrs.id, start: s, end: s + num(t.attrs["data-duration"], 1), focus, pad: t.attrs["data-kit-pad"] != null ? num(t.attrs["data-kit-pad"]) : 6, side: t.attrs["data-kit-side"] || "auto", text: lm ? lm[1] : "" };
      });
    tags(h.html)
      .filter((t) => hasClass(t, "kit-ann") && !t.attrs["data-kit-focus"])
      .forEach((t) => FAIL("annotations", `#${h.id} #${t.attrs.id || "?"}: .kit-ann without data-kit-focus (an annotation points at a recorded component)`));
    const p = Kit.scene.plan({ scene: h.id, shots, sceneClips: sceneClipsOf(h), duration: h.duration, rings, cues: localCues, annotations });
    plans.push(Object.assign(p, { host: h }));
    // hand-written camera tweens bypass the guarantee
    const camTag = tags(h.html).find((t) => hasClass(t, "kit-cam"));
    if (!camTag) FAIL("framing", `#${h.id}: no .kit-cam element (footage must sit in .kit-stage > .kit-cam)`);
    else if (camTag.attrs.id && new RegExp(`\\.(to|set|fromTo|from)\\(\\s*["']#${camTag.attrs.id}["']`).test(h.html))
      FAIL("framing", `#${h.id}: #${camTag.attrs.id} is tweened by hand; move the camera with shot data (Kit.scene.footage) so QA can check it`);
  }
});
const fmt = (r) => (r ? `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.w)}x${Math.round(r.h)}` : "-");
plans.forEach((p) => {
  const h = p.host;
  p.keyframes.forEach((k) => {
    const at = `${h.id} shot ${k.i} @${(h.start + k.t).toFixed(2)}s`;
    const desc = `${at} focus=${k.focus}${k.label ? ` (${k.label})` : ""} zoom ${k.fit ? k.fit.scale : "-"} rect ${fmt(k.rect)} safe ${fmt(k.safe)}`;
    const extra = { scene: h.id, abs: h.start + k.t, holdAbs: [h.start + k.hold[0], h.start + k.hold[1]], rect: k.rect, safe: k.safe, partial: k.partial };
    if (!k.ok) FAIL("framing", desc + " :: " + k.problems.join("; "), extra);
    else if (k.partial) WARN("framing", desc + ` :: PARTIAL by intent: ${k.reason}`, extra);
    else PASS("framing", desc + (k.lowered ? ` (zoom lowered from wanted to fit)` : ""), extra);
    k.warnings.forEach((w) => WARN("framing", `${at}: ${w}`));
  });
  p.rings.forEach((r) => {
    const at = `${h.id} ring #${r.id} @${(h.start + r.start).toFixed(2)}s focus=${r.focus} rect ${fmt(r.rect)}`;
    if (!r.ok) FAIL("rings", at + " :: " + r.problems.join("; "));
    else PASS("rings", at);
    r.warnings.forEach((w) => WARN("rings", `${h.id} ring #${r.id}: ${w}`));
  });
  (p.annotations || []).forEach((a) => {
    const at = `${h.id} #${a.id} @${(h.start + a.start).toFixed(2)}-${(h.start + a.end).toFixed(2)}s "${a.text}" on ${a.focus}`;
    const where = a.label ? ` label ${fmt(a.label)} (${a.side}${a.leader ? ", leader" : ""})` : "";
    if (!a.ok) FAIL("annotations", at + " :: " + a.problems.join("; "));
    else PASS("annotations", at + where + ` · ${a.words} words, needs ${a.reading} s`);
    a.warnings.forEach((w) => WARN("annotations", `${h.id} #${a.id}: ${w}`));
  });
  if (!p.keyframes.length) FAIL("framing", `#${h.id}: no camera keyframes`);
});
// one annotation on screen at a time (film time)
const allAnns = plans.flatMap((p) => (p.annotations || []).map((a) => ({ id: a.id, start: p.host.start + a.start, end: p.host.start + a.end }))).sort((a, b) => a.start - b.start);
for (let i = 1; i < allAnns.length; i++)
  if (allAnns[i].start < allAnns[i - 1].end - 0.01) FAIL("annotations", `#${allAnns[i - 1].id} and #${allAnns[i].id} overlap (${allAnns[i].start.toFixed(2)} < ${allAnns[i - 1].end.toFixed(2)} s): one annotation at a time`);

// ---------- speed labels ----------
speedClips.forEach((c) => {
  const label = Kit.time.label(c.rate);
  const covering = speedTags.filter((t) => Math.min(t.end, c.end) - Math.max(t.start, c.start) >= 0.8 * (c.end - c.start) - 0.05);
  const match = covering.find((t) => (Number.isFinite(t.rate) ? Math.abs(t.rate - c.rate) < 0.06 : true) && t.text.replace(/\s/g, "").replace("×", "x").toLowerCase().includes(label.toLowerCase()));
  const at = `${c.host}#${c.id} x${c.rate} ${c.start.toFixed(2)}-${c.end.toFixed(2)} s`;
  if (match) PASS("speed", `${at} labelled "${match.text}"`);
  else FAIL("speed", `${at}: no .kit-speed tag showing "${label}" over this window`);
});
speedTags.forEach((t) => {
  if (!speedClips.some((c) => Math.min(t.end, c.end) - Math.max(t.start, c.start) > 0.2)) WARN("speed", `speed tag "${t.text}" at ${t.start.toFixed(2)}-${t.end.toFixed(2)} s has no sped-up clip under it`);
});

// ---------- captions (kit 1.1: text-first, the band carries the whole story) ----------
const C2 = Kit.text.CAP2;
const filmCss = [path.join(film, "index.html")]
  .concat(fs.existsSync(path.join(film, "compositions")) ? fs.readdirSync(path.join(film, "compositions")).filter((f) => f.endsWith(".html")).map((f) => path.join(film, "compositions", f)) : [])
  .map((f) => stripComments(fs.readFileSync(f, "utf8")))
  .join("\n");
let headSize = C2.head;
const ov = filmCss.match(/--kit-cap2-head:\s*([\d.]+)px/) || filmCss.match(/\.kit-cap-head[^{]*\{[^}]*font-size:\s*([\d.]+)px/);
if (ov) headSize = parseFloat(ov[1]);
let detailSize = C2.detail;
const ovd = filmCss.match(/--kit-cap2-detail:\s*([\d.]+)px/);
if (ovd) detailSize = parseFloat(ovd[1]);
if (!LAUNCH && cues.some((c) => c.v2)) {
  if (headSize < C2.minHead) FAIL("captions", `headline size ${headSize} px < ${C2.minHead} px (must read on a phone)`);
  else PASS("captions", `headline ${headSize} px, detail ${detailSize} px (kit 1.1 band)`);
}
const byStart = cues.slice().sort((a, b) => a.start - b.start);
for (let i = 1; i < byStart.length; i++)
  if (byStart[i].start < byStart[i - 1].end - 0.01) FAIL("captions", `#${byStart[i - 1].id} and #${byStart[i].id} overlap (${byStart[i].start.toFixed(2)} < ${byStart[i - 1].end.toFixed(2)} s): one caption at a time`);
const progressTags = hosts.filter((h) => h.role === "captions").flatMap((h) => tags(h.html).filter((t) => hasClass(t, "kit-progress")));
const steps = progressTags.length ? (progressTags[0].attrs["data-kit-steps"] || "").split(/[,|]/).map((x) => x.trim()).filter(Boolean) : [];
if (!LAUNCH) {
let readFails = 0;
cues.forEach((c) => {
  const words = Kit.text.words(c.head) + Kit.text.words(c.detail) + c.chips.reduce((n, x) => n + Kit.text.words(x), 0);
  const need = Kit.text.readingTime(words);
  c.words = words;
  c.need = need;
  const tag = `#${c.id} ${c.start.toFixed(2)}-${c.end.toFixed(2)} s`;
  if (c.duration < need - 1e-6) {
    readFails++;
    FAIL("captions", `${tag}: on screen ${c.duration.toFixed(2)} s < reading time ${need.toFixed(2)} s (0.6 + 0.35 x ${words} words) "${c.head}"${c.detail ? ` / "${c.detail}"` : ""}`);
  }
  if (!c.v2) {
    WARN("captions", `${tag}: v1 cue (.kit-cap-main); kit 1.1 films use .kit-cap2 (kicker, head, detail)`);
    return;
  }
  const hw = Kit.text.words(c.head);
  const dw = Kit.text.words(c.detail);
  if (!c.head) FAIL("captions", `${tag}: v2 cue without a .kit-cap-head`);
  if (hw > C2.maxHeadWords + 2) FAIL("captions", `${tag}: headline is ${hw} words (<= ~${C2.maxHeadWords})`);
  else if (hw > C2.maxHeadWords) WARN("captions", `${tag}: headline is ${hw} words (<= ~${C2.maxHeadWords})`);
  if (dw > C2.maxDetailWords + 2) FAIL("captions", `${tag}: detail is ${dw} words (<= ~${C2.maxDetailWords})`);
  else if (dw > C2.maxDetailWords) WARN("captions", `${tag}: detail is ${dw} words (<= ~${C2.maxDetailWords})`);
  const hpx = Kit.text.width(c.head, headSize, 700, C2.headTracking);
  if (hpx > C2.width) FAIL("captions", `${tag}: headline is ${Math.round(hpx)} px wide at ${headSize} px, more than the band's ${C2.width} px: one line only ("${c.head}")`);
  if (c.detail) {
    const dpx = Kit.text.width(c.detail, detailSize, 400, C2.detailTracking);
    if (dpx > C2.width) FAIL("captions", `${tag}: detail is ${Math.round(dpx)} px wide, more than ${C2.width} px: one line only ("${c.detail}")`);
  }
  if (!c.kicker) WARN("captions", `${tag}: no kicker (e.g. "Step 2 · Check")`);
  if (c.step != null) {
    if (!progressTags.length) WARN("captions", `${tag}: data-kit-step ${c.step} but no .kit-progress stepper in the captions host`);
    else if (!(c.step >= 1 && c.step <= steps.length)) FAIL("captions", `${tag}: data-kit-step ${c.step} is not one of the ${steps.length} steps (${steps.join(", ")})`);
  } else if (progressTags.length) WARN("captions", `${tag}: no data-kit-step (the stepper holds the previous step)`);
});
if (cues.length) {
  const v2n = cues.filter((c) => c.v2).length;
  if (!readFails) PASS("captions", `${cues.length} cues (${v2n} v2), ${byStart[0].start.toFixed(2)}-${byStart[byStart.length - 1].end.toFixed(2)} s, every one on screen >= its reading time`);
  if (progressTags.length) PASS("captions", `progress stepper: ${steps.length} steps (${steps.join(" · ")})`);
}
} // !LAUNCH
// ---------- launch format (kit 2): beats, captions, progress, attention, honesty ----------
if (LAUNCH) launchChecks();
// the cold open's headline is read in its slot too
hosts
  .filter((h) => h.role === "cold-open")
  .forEach((h) => {
    const v = Object.assign(blockDefaultsOf(h.html), h.vars);
    const words = Kit.text.words(v.headline || "");
    const need = Kit.text.readingTime(words);
    if (h.duration < need - 1e-6) FAIL("captions", `cold open "${Kit.text.plain(v.headline)}": ${words} words need ${need.toFixed(2)} s, slot is ${h.duration.toFixed(2)} s (shorten the headline or lengthen the slot to <= 2.5 s)`);
    else PASS("captions", `cold open "${Kit.text.plain(v.headline)}": ${words} words, ${need.toFixed(2)} s <= ${h.duration.toFixed(2)} s`);
  });

function launchChecks() {
  const R = L.cue;
  if (!L.land) FAIL("kit", "this film vendors a kit older than 2.1.0 (3 s text screens, the result rule): npm run sync -- <slug>, then re-check");
  const beatHosts = pics.slice();
  const planOf = (id) => plans.find((p) => p.host.id === id);
  const extraJargon = ((rootTag.attrs["data-kit-jargon"] || "").split(/[,|]/).map((x) => x.trim().toLowerCase())).filter(Boolean);
  const jargonRe = new RegExp("(^|[^\\p{L}\\p{N}])(" + L.jargon.concat(extraJargon).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")(?![\\p{L}\\p{N}])", "iu");
  const jargon = (where, text) => {
    const m = String(text || "").match(jargonRe);
    if (m) WARN("captions", `${where}: "${m[2]}" is an internal or technical term; say it in plain words (implementation terms go in the proof beat's under-the-hood line)`);
  };
  const joined = [];

  // ---- beats
  const count = {};
  beatHosts.forEach((h) => {
    if (!h.beat || !Kit.launch.BEATS.includes(h.beat)) FAIL("beats", `#${h.id}: no data-kit-beat (one of ${Kit.launch.BEATS.join(", ")})`);
    else count[h.beat] = (count[h.beat] || 0) + 1;
    if (["cold-open", "title", "problem", "card", "next-steps"].includes(h.role)) FAIL("beats", `#${h.id} (${h.role}): launch films have no title card, cold-open block or next-steps card; use the hook, statement and proof beats`);
  });
  ["hook", "what", "problem", "hero", "proof", "end"].forEach((b) => {
    if (!count[b]) FAIL("beats", `no "${b}" beat (required: hook, what, problem, hero, proof, end)`);
    else if (count[b] > 1) FAIL("beats", `${count[b]} "${b}" beats: exactly one`);
  });
  if ((count.feature || 0) > L.features) FAIL("beats", `${count.feature} feature beats after the hero: three features at most (hero + ${L.features})`);
  const order = beatHosts.filter((h) => h.beat).map((h) => Kit.launch.BEATS.indexOf(h.beat));
  if (order.some((v, i) => i && v < order[i - 1])) FAIL("beats", `beats out of order (${beatHosts.map((h) => h.beat || "?").join(" > ")}): hook, what, problem, hero, feature, proof, end`);
  else if (beatHosts.length) PASS("beats", beatHosts.map((h) => `${h.beat || "?"} ${h.start.toFixed(1)}-${(h.start + h.duration).toFixed(1)}`).join(" · "));
  if (beatHosts.length < L.scenes.min || beatHosts.length > L.scenes.max) WARN("beats", `${beatHosts.length} scenes (launch format: ${L.scenes.min}-${L.scenes.max})`);
  beatHosts.forEach((h) => {
    const tag = `#${h.id} (${h.beat}) ${h.start.toFixed(2)}-${(h.start + h.duration).toFixed(2)} s`;
    const end = h.start + h.duration;
    if (["hook", "hero", "feature", "proof"].includes(h.beat) && h.role !== "footage") FAIL("beats", `${tag}: must be a footage scene (real page footage), not "${h.role}"`);
    if (h.beat === "hook") {
      if (h.start > 0.01) FAIL("beats", `${tag}: the hook starts at 0`);
      if (h.duration > L.hook.maxSec + 1e-6) FAIL("beats", `${tag}: the hook runs 0-4 s (at most ${L.hook.maxSec} s)`);
    }
    if (h.beat === "what" || h.beat === "problem") {
      if (h.role !== "statement") FAIL("beats", `${tag}: must be a statement scene (data-kit-role="statement", components/statement-scene.html)`);
      const text = Kit.text.plain(pick(h.html, "kit-statement-text") || "");
      const w = Kit.text.words(text);
      joined.push(text, Kit.text.plain(pick(h.html, "kit-statement-sub") || ""));
      if (!text) FAIL("captions", `${tag}: no .kit-statement-text`);
      else if (w > L.statement.maxWords) FAIL("captions", `${tag}: the sentence is ${w} words (<= ${L.statement.words})`);
      else if (w > L.statement.words) WARN("captions", `${tag}: the sentence is ${w} words (<= ${L.statement.words})`);
      if (h.duration < STMT.minSec - 1e-6 || h.duration > STMT.maxSec + 1e-6) FAIL("captions", `${tag}: a text screen runs ${STMT.sec} s (${STMT.minSec}-${STMT.maxSec}); this one runs ${h.duration.toFixed(2)} s "${text}"`);
      else if (text) PASS("captions", `${tag}: "${text}" · ${w} words, ${h.duration.toFixed(2)} s`);
      if (!product.some((p) => p.host === h.id)) FAIL("beats", `${tag}: a statement sits over product footage (video or img with data-kit-clip), not a bare card`);
      if (!/\bkit-backdrop\b/.test(h.html) || !/\bkit-scrim\b/.test(h.html)) WARN("beats", `${tag}: no .kit-backdrop / .kit-scrim (the footage should be blurred and dimmed under the sentence)`);
      jargon(tag, text);
      const by = h.beat === "what" ? L.whatBy : L.problemBy;
      if (end > by + 1e-6) (h.beat === "problem" ? FAIL : WARN)("beats", `${tag}: ends at ${end.toFixed(1)} s; a stranger should know ${h.beat === "what" ? "what it is" : "the problem"} by ${by} s`);
    }
    if (h.beat === "proof" && (h.duration < L.proof.minSec || h.duration > L.proof.maxSec)) WARN("beats", `${tag}: the proof beat runs about 6 s (${L.proof.minSec}-${L.proof.maxSec} s)`);
    if (h.beat === "end") {
      if (h.role !== "end-card") FAIL("beats", `${tag}: the end beat is the end card (data-kit-role="end-card", kit/blocks/launch-end.html)`);
      const v = Object.assign(blockDefaults(h.html), h.vars);
      joined.push(v.built, v.action, v.url);
      if (/launch-end\.html$/.test(h.src)) {
        ["built", "action", "url"].forEach((k) => !String(v[k] || "").trim() && FAIL("beats", `${tag}: end card variable "${k}" is empty (who built it, ONE action, the url)`));
        if (/\bCompany\b/.test(v.built || "")) FAIL("beats", `${tag}: end card still says "Company"`);
        PASS("beats", `${tag}: "${Kit.text.plain(v.built)}" / "${Kit.text.plain(v.action)}" / "${Kit.text.plain(v.url)}"`);
      } else WARN("beats", `${tag}: not kit/blocks/launch-end.html (built for / one action / url)`);
    }
  });

  // ---- captions
  let head3 = R.head;
  const o3 = filmCss.match(/--kit-cap3-head:\s*([\d.]+)px/);
  if (o3) head3 = parseFloat(o3[1]);
  let hook3 = L.hook.head;
  const oh = filmCss.match(/--kit-cap3-hook:\s*([\d.]+)px/);
  if (oh) hook3 = parseFloat(oh[1]);
  if (head3 < R.minHead || head3 > R.maxHead || hook3 < R.minHead || hook3 > R.maxHead) FAIL("captions", `caption headline ${head3} px, hook ${hook3} px: launch captions are ${R.minHead}-${R.maxHead} px`);
  else PASS("captions", `caption headline ${head3} px, hook ${hook3} px (launch: ${R.minHead}-${R.maxHead} px, one line)`);
  let bad = 0;
  const fail = (m) => {
    bad++;
    FAIL("captions", m);
  };
  cues.forEach((c) => {
    const tag = `#${c.id} ${c.start.toFixed(2)}-${c.end.toFixed(2)} s`;
    joined.push(c.head, c.detail, ...c.stats, ...c.hoods);
    if (!c.v3) return fail(`${tag}: launch films use .kit-cap3 cues (one headline, no kicker, no stepper)`);
    if (c.kicker) fail(`${tag}: kicker "${c.kicker}": launch captions have no kicker`);
    if (c.detail) fail(`${tag}: detail line "${c.detail}": one idea, one line`);
    c.chips.forEach((x) => Kit.text.words(x) > R.chipWords && WARN("captions", `${tag}: label "${x}" is ${Kit.text.words(x)} words (<= ${R.chipWords})`));
    if (c.proof) {
      if (c.stats.length < L.proof.minStats || c.stats.length > L.proof.maxStats) fail(`${tag}: the proof cue shows ${c.stats.length} numbers (${L.proof.minStats}-${L.proof.maxStats} .kit-stat with .kit-stat-n + .kit-stat-l)`);
      if (c.hoods.length > 1) fail(`${tag}: ${c.hoods.length} under-the-hood lines: ONE`);
      c.hoods.forEach((x) => Kit.text.words(x) > L.proof.hoodWords && WARN("captions", `${tag}: under-the-hood line is ${Kit.text.words(x)} words (<= ${L.proof.hoodWords})`));
      const w = c.stats.reduce((n, x) => n + Kit.text.words(x), 0);
      const need = Kit.launch.readingTime(w);
      if (c.duration < need - 1e-6) fail(`${tag}: on screen ${c.duration.toFixed(2)} s < reading time ${need.toFixed(2)} s for ${c.stats.join(" · ")}`);
      else PASS("captions", `${tag}: proof ${c.stats.join(" · ")}${c.hoods.length ? ` / "${c.hoods[0]}"` : ""}`);
      return;
    }
    const w = Kit.text.words(c.head);
    if (!c.head) return fail(`${tag}: cue without a .kit-cap-head`);
    if (c.hook && w > L.hook.words) fail(`${tag}: the hook line is ${w} words (<= ${L.hook.words}) "${c.head}"`);
    else if (w > R.maxWords) fail(`${tag}: ${w} words (<= ${R.words}; ${R.maxWords} at the very most) "${c.head}"`);
    else if (w > R.words) WARN("captions", `${tag}: ${w} words (aim for <= ${R.words}) "${c.head}"`);
    const px = Kit.text.width(c.head, c.hook ? hook3 : head3, 700, R.tracking);
    if (px > R.width) fail(`${tag}: ${Math.round(px)} px wide at ${c.hook ? hook3 : head3} px, more than ${R.width} px: one line only ("${c.head}")`);
    const need = Kit.launch.readingTime(w);
    if (c.duration < need - 1e-6) fail(`${tag}: on screen ${c.duration.toFixed(2)} s < reading time ${need.toFixed(2)} s (max(${R.minSec}, ${R.base} + ${R.perWord} x ${w} words)) "${c.head}"`);
    if (c.duration > R.maxSec + 1e-6) fail(`${tag}: on screen ${c.duration.toFixed(2)} s: never over ${R.maxSec} s (cut the shot or split the idea)`);
    jargon(tag, c.head);
  });
  const hooks = cues.filter((c) => c.hook);
  if (hooks.length !== 1 || hooks[0].start > 0.1) fail(`the hook needs exactly one .kit-cap3.kit-hook line from 0 s (found ${hooks.length}${hooks.length ? ` at ${hooks[0].start.toFixed(2)} s` : ""})`);
  if (cues.filter((c) => c.proof).length !== 1) fail(`the proof beat needs exactly one .kit-cap3.kit-proof cue (1-3 numbers + one under-the-hood line)`);
  if (cues.length && !bad) PASS("captions", `${cues.length} launch cues, each one line, on screen >= its reading time and <= ${R.maxSec} s`);

  // ---- progress
  const chapterTags = hosts.filter((h) => h.role === "captions").flatMap((h) => tags(h.html).filter((t) => hasClass(t, "kit-chapters")).map((t) => ({ t, h })));
  if (!chapterTags.length) FAIL("progress", "no progress element: add .kit-chapters (3-4 plain labels over a thin bar) to the captions host");
  chapterTags.forEach(({ t, h }) => {
    const list = Kit.captions.parseChapters(t.attrs["data-kit-chapters"]);
    const C = L.chapters;
    const s0 = h.start + num(t.attrs["data-start"]);
    if (list.length < C.min || list.length > C.max) FAIL("progress", `${list.length} chapters (${list.map((c) => c.name).join(", ")}): ${C.min}-${C.max} plain labels`);
    else if (list.some((c, i) => !Number.isFinite(c.start) || (i && c.start <= list[i - 1].start))) FAIL("progress", `chapter starts must be ascending seconds ("Name:start|Name:start"): ${t.attrs["data-kit-chapters"]}`);
    else PASS("progress", `chapters ${list.map((c) => `${c.name} ${(h.start + c.start).toFixed(1)} s`).join(" · ")}, bar ${s0.toFixed(1)}-${(s0 + num(t.attrs["data-duration"])).toFixed(1)} s`);
    list.forEach((c) => Kit.text.words(c.name) > 3 && WARN("progress", `chapter "${c.name}": keep labels to 1-3 plain words`));
    if (s0 > 0.5) WARN("progress", `the progress bar starts at ${s0.toFixed(1)} s (show it from the first frame)`);
  });
  if (progressTags.length) (steps.length > 4 ? FAIL : WARN)("progress", `.kit-progress stepper with ${steps.length} steps: launch films use .kit-chapters (no stepper)`);

  // ---- attention: zoom, spotlight, one move and one action per caption
  const clicksOf = (h) => {
    const out = [];
    sceneClipsOf(h).forEach((sc) => {
      if (sc.still != null) return;
      const c = Kit.clips.get(sc.clip);
      ((c && c.events) || []).filter((e) => e.type === "click").forEach((e) => {
        const t = sc.start + (e.t - sc.mediaStart) / sc.rate;
        if (t >= sc.start - 1e-6 && t < sc.end - 1e-6) out.push(h.start + t);
      });
    });
    return out;
  };
  beatHosts.filter((h) => h.role === "footage").forEach((h) => {
    const p = planOf(h.id);
    if (!p) return;
    const tight = h.beat === "hero" || h.beat === "feature";
    const mags = p.keyframes.filter((k) => k.fit).map((k) => k.mag);
    p.keyframes.forEach((k) => {
      if (!k.fit || k.mag >= L.minMag - 1e-3) return;
      const at = `${h.id} shot ${k.i} @${(h.start + k.t).toFixed(2)}s focus=${k.focus}: the page is shown at ${k.mag}x`;
      if (tight && !(k.wide && k.reason)) FAIL("attention", `${at}; hero and feature shots zoom the active area >= ${L.minMag}x (focus one clause or card, or mark the shot "wide": true with a reason)`);
      else if (tight) WARN("attention", `${at} :: WIDE by intent: ${k.reason}`);
      else if (h.beat === "hook") WARN("attention", `${at}; the hook should read on a phone (>= ${L.minMag}x)`);
    });
    if (mags.length) PASS("attention", `#${h.id} (${h.beat}): page shown at ${Math.min(...mags)}-${Math.max(...mags)}x over ${mags.length} shot${mags.length > 1 ? "s" : ""}`);
    if (tight && !tags(h.html).some((t) => hasClass(t, "kit-spot") || hasClass(t, "kit-ring") || hasClass(t, "kit-ann"))) WARN("attention", `#${h.id} (${h.beat}): no spotlight, ring or annotation: give the scene one focal point (.kit-spot)`);
    // the result rule (kit 2.1): the wait is trimmed, the result stays long enough to read
    if (tight) tags(h.html).filter((t) => t.name === "video" && t.attrs["data-kit-clip"]).forEach((t) => {
      const s = num(t.attrs["data-start"]), d = num(t.attrs["data-duration"]);
      const at = `#${h.id} shot #${t.attrs.id} ${(h.start + s).toFixed(2)}-${(h.start + s + d).toFixed(2)} s`;
      if (t.attrs["data-kit-lands"] == null) return FAIL("attention", `${at}: no data-kit-lands (seconds from the shot's start when the result it waits for is fully on screen; 0 when it is there from the first frame)`);
      const lands = num(t.attrs["data-kit-lands"], NaN), read = num(t.attrs["data-kit-read"], 0);
      if (!Number.isFinite(lands) || lands < 0 || lands > d) return FAIL("attention", `${at}: data-kit-lands="${t.attrs["data-kit-lands"]}" is not inside the shot (0-${d} s)`);
      const need = landHold(read), hold = d - lands;
      if (hold < need - 0.05) FAIL("attention", `${at}: the result lands at ${lands.toFixed(2)} s and is cut ${hold.toFixed(2)} s later; it stays >= ${need.toFixed(2)} s (2.5, or 0.5 + 0.3 x ${read} words to read). Trim the wait before it, not the hold after it`);
      else PASS("attention", `${at}: result on screen ${hold.toFixed(2)} s (needs ${need.toFixed(2)})`);
      if (lands > Math.max(LAND.waitSec, d * LAND.waitShare) + 0.05) WARN("attention", `${at}: ${lands.toFixed(2)} s of waiting before the result (over half the shot): cut the wait or speed it up with a rate label`);
    });
    const clicks = clicksOf(h);
    cues.filter((c) => !c.proof && c.start >= h.start - 0.05 && c.start < h.start + h.duration - 0.05).forEach((c) => {
      const tag = `#${c.id} ${c.start.toFixed(2)}-${c.end.toFixed(2)} s`;
      const moves = p.keyframes.map((k) => h.start + k.t);
      if (!(Math.abs(h.start - c.start) < 0.16 || moves.some((t) => Math.abs(t - c.start) < 0.16))) WARN("attention", `${tag}: the caption does not land on a cut or camera move of #${h.id} (the caption lands with the cut)`);
      moves.filter((t) => t > c.start + 0.16 && t < c.end - 0.05).forEach((t) => FAIL("attention", `${tag}: the camera moves at ${t.toFixed(2)} s under this caption (one camera move per caption, at its start)`));
      const mine = clicks.filter((t) => t >= c.start && t < c.end);
      if (mine.length > 1) WARN("attention", `${tag}: ${mine.length} clicks under one caption (ONE action per scene)`);
      mine.forEach((t) => {
        if (t - c.start < L.still - 0.05) WARN("attention", `${tag}: click ${(t - c.start).toFixed(2)} s after the caption lands (hold still >= ${L.still} s first)`);
        if (c.end - t < L.hold - 0.05) WARN("attention", `${tag}: the result holds ${(c.end - t).toFixed(2)} s after the click (>= ${L.hold} s)`);
      });
    });
  });

  // ---- honesty
  const run = rootTag.attrs["data-kit-run"];
  const chipCues = cues.filter((c) => c.chips.length);
  const chipText = chipCues.flatMap((c) => c.chips).join(" | ");
  if (!run) WARN("honesty", 'root has no data-kit-run ("live" | "example" | "cached" | "mixed"): say what kind of run the footage shows');
  else if (run !== "live" && !/example|recorded|replay|cached/i.test(chipText)) FAIL("honesty", `data-kit-run="${run}" but no label on screen says so (a .kit-chip such as "Example run" or "Recorded live run")`);
  else PASS("honesty", `run: ${run}${run !== "live" ? " (labelled on screen)" : ""}`);
  product.filter((x) => x.still && x.end - x.start > 1.5).forEach((x) => {
    const h = hosts.find((y) => y.id === x.host);
    if (!h || h.role !== "footage") return;
    const ok = chipCues.some((c) => c.start < x.end && c.end > x.start && c.chips.some((t) => /held|still|paused|frozen|freeze/i.test(t)));
    if (!ok) FAIL("honesty", `${x.host}#${x.id}: a still held ${(x.end - x.start).toFixed(2)} s with no "Held frame" label on screen (record a real hold, or add a .kit-chip to the caption)`);
  });
  const bannedRe = /if i join|first (30|60|90) days/i;
  joined.filter(Boolean).forEach((t) => bannedRe.test(t) && FAIL("honesty", `"${Kit.text.plain(t)}": no "If I join" content in a demo film`));
}

// ---------- style ----------
const styleFiles = [path.join(film, "index.html")].concat(fs.existsSync(path.join(film, "compositions")) ? fs.readdirSync(path.join(film, "compositions")).filter((f) => f.endsWith(".html")).map((f) => path.join(film, "compositions", f)) : []);
styleFiles.forEach((f) => {
  const s = stripComments(fs.readFileSync(f, "utf8"));
  const rel = path.relative(film, f);
  if (/backdrop-filter/.test(s)) WARN("style", `${rel}: backdrop-filter (glass)`);
  if (/text-shadow/.test(s)) WARN("style", `${rel}: text-shadow (glow)`);
  if (/drop-shadow\(/.test(s)) WARN("style", `${rel}: drop-shadow (glow)`);
  if (/radial-gradient/.test(s)) WARN("style", `${rel}: radial-gradient`);
  if (/linear-gradient/.test(s)) WARN("style", `${rel}: linear-gradient (only the kit caption band fade is allowed)`);
  const bs = s.match(/box-shadow:\s*[^;]+/g) || [];
  bs.forEach((b) => {
    if (/\b\d+px\s+\d+px\s+[1-9]\d*px/.test(b)) WARN("style", `${rel}: blurred ${b.trim()} (glow)`);
  });
});
// ---------- music bed + no voice (kit 1.1) ----------
const isBed = (x) => x.kind === "audio" && x.where === "main" && (hasClass({ attrs: x.attrs }, "kit-music") || x.attrs["data-kit-music"] != null);
const beds = sounds.filter(isBed);
const others = sounds.filter((x) => !isBed(x));
if (!beds.length) FAIL("music", 'no music bed: run node kit/scripts/music-bed.mjs <film> (one <audio class="kit-music"> under the whole film)');
else if (beds.length > 1) FAIL("music", `${beds.length} music beds (${beds.map((b) => b.id).join(", ")}): exactly one`);
beds.forEach((b) => {
  const r = Kit.music.check(b.attrs, duration);
  const desc = `#${b.id} ${b.attrs["data-kit-music"] || path.basename(b.attrs.src || "")} 0-${(num(b.attrs["data-start"]) + num(b.attrs["data-duration"])).toFixed(2)} s, media from ${num(b.attrs["data-media-start"]).toFixed(2)} s, volume ${b.attrs["data-volume"]}, fades ${b.attrs["data-fade-in"]}/${b.attrs["data-fade-out"]} s`;
  if (r.problems.length) FAIL("music", desc + " :: " + r.problems.join("; "));
  else PASS("music", desc);
  r.warnings.forEach((w) => WARN("music", `#${b.id}: ${w}`));
  const file = path.join(film, b.attrs.src || "");
  if (!b.attrs.src || !fs.existsSync(file)) FAIL("music", `#${b.id}: ${b.attrs.src} is missing in the film (npm run sync -- <slug> vendors it from kit/music/)`);
});
// kit 2: films can outlast a 60 s bed; the bed must cover the film
let bedList = {};
try {
  bedList = JSON.parse(fs.readFileSync(path.join(HERE, "..", "music", "beds.json"), "utf8")).beds || {};
} catch (e) {
  /* no manifest */
}
beds.forEach((b) => {
  const info = bedList[b.attrs["data-kit-music"]];
  if (!info) return;
  const to = num(b.attrs["data-media-start"]) + num(b.attrs["data-duration"]);
  if (to > info.duration + 0.05) FAIL("music", `#${b.id}: plays ${b.attrs["data-kit-music"]} to ${to.toFixed(1)} s but the bed is ${info.duration} s long: pick a bed at least as long as the film (kit/music/beds.json, e.g. --bed ${Object.keys(bedList).filter((k) => bedList[k].duration >= duration)[0] || "a longer one"})`);
});
const hasAudioStream = (src) => {
  const f = path.join(film, src || "");
  if (!src || !fs.existsSync(f)) return false;
  try {
    return execFileSync("ffprobe", ["-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", f], { encoding: "utf8" }).trim().length > 0;
  } catch (e) {
    return false;
  }
};
others.forEach((x) => {
  const reason = x.attrs["data-kit-audio-reason"];
  const at = `${x.where}#${x.id} (<${x.kind}${x.attrs.src ? ` ${x.attrs.src}` : ""}>)`;
  if (reason) WARN("music", `${at} sounds, flagged: ${reason}`);
  else FAIL("music", `${at} adds sound besides the music bed: demo films carry no voice of any kind (remove it, or flag a real need with data-kit-audio-reason="...")`);
});
unmuted.forEach((x) => {
  if (hasAudioStream(x.src)) FAIL("music", `${x.where}#${x.id}: <video ${x.src}> is not muted and its file has sound (add muted)`);
  else WARN("music", `${x.where}#${x.id}: <video> without muted (its file is silent; add muted anyway)`);
});
if (beds.length === 1 && !others.length) PASS("honesty", "no voice: the only sound is the instrumental bed");
const chips = [];
hosts.forEach((h) => tags(h.html).forEach((t) => hasClass(t, "kit-chip") && chips.push(textAfter(h.html, t))));
if (chips.length) PASS("honesty", `labels on screen: ${[...new Set(chips)].join(" | ")}`);

// ---------- frames + contact sheets ----------
let sheet = null, framingSheet = null;
if (WANT_FRAMES) {
  fs.mkdirSync(OUT, { recursive: true });
  const items = [];
  const seen = new Set();
  const push = (t, kind, extra) => {
    t = Math.max(0, Math.min(duration - 0.034, +t.toFixed(3)));
    const key = kind + t.toFixed(2);
    if (seen.has(key)) return;
    seen.add(key);
    items.push(Object.assign({ t, kind }, extra || {}));
  };
  for (let t = Math.min(1, EVERY / 2); t < duration; t += EVERY) push(t, "every");
  const seams = [...new Set(pics.flatMap((h) => [h.start, h.start + h.duration]).filter((s) => s > 0.05 && s < duration - 0.05).map((s) => +s.toFixed(3)))].sort((a, b) => a - b);
  seams.forEach((s) => {
    push(s - 0.2, "seam", { seam: s });
    push(s + 0.2, "seam", { seam: s });
  });
  EXTRA_AT.forEach((t) => push(t, "at"));
  const sheetItems = items.slice().sort((a, b) => a.t - b.t);
  const frameItems = [];
  plans.forEach((p) =>
    p.keyframes.forEach((k) => {
      const a = p.host.start + k.hold[0], b = p.host.start + k.hold[1];
      if (b - a < 0.05) return;
      frameItems.push({ t: +Math.min(b - 0.05, a + Math.min(0.6, (b - a) / 2)).toFixed(3), kind: "shot", k, scene: p.host.id });
    })
  );
  plans.forEach((p) =>
    (p.annotations || []).forEach((a) => {
      if (!a.ring) return;
      const t0 = p.host.start + a.start, t1 = p.host.start + a.end;
      frameItems.push({ t: +Math.min(t1 - 0.05, t0 + Math.min(0.9, (t1 - t0) / 2)).toFixed(3), kind: "ann", a, scene: p.host.id });
    })
  );
  const all = sheetItems.concat(frameItems);
  const times = [...new Set(all.map((x) => x.t.toFixed(3)))];
  const pathFor = {};
  if (VIDEO) {
    const vid = path.resolve(film, VIDEO);
    const fdir = path.join(OUT, "frames");
    fs.rmSync(fdir, { recursive: true, force: true });
    fs.mkdirSync(fdir, { recursive: true });
    times.forEach((t) => {
      const out = path.join(fdir, `at-${t}.jpg`);
      execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", t, "-i", vid, "-frames:v", "1", "-q:v", "3", out]);
      pathFor[t] = out;
    });
  } else {
    const sdir = path.join(OUT, "snap");
    fs.rmSync(sdir, { recursive: true, force: true });
    const r = spawnSync("npx", ["hyperframes", "snapshot", film, "--at", times.join(","), "--no-end", "--keep", "-o", sdir, "--timeout", "120000"], { cwd: film, encoding: "utf8", maxBuffer: 64 << 20 });
    if (r.status !== 0) FAIL("frames", "hyperframes snapshot failed: " + (r.stderr || r.stdout).slice(-400));
    times.forEach((t) => {
      const n = `at-${String(+t)}s.png`;
      pathFor[t] = path.join(sdir, n);
    });
  }
  const sceneAt = (t) => (pics.filter((h) => t >= h.start - 1e-6 && t < h.start + h.duration).pop() || {}).id || "-";
  const cueAt = (t) => (cues.find((c) => t >= c.start && t < c.end) || {}).id || "";
  const spec = {
    out: path.join(OUT, "contact-sheet.jpg"),
    cols: 4,
    thumb: 480,
    title: `${path.basename(film)} · ${duration.toFixed(2)} s · ${sheetItems.length} frames (every ${EVERY} s + seams ±0.2 s)`,
    items: sheetItems.map((x) => ({ path: pathFor[x.t.toFixed(3)], label: `${x.t.toFixed(2)} s  ${sceneAt(x.t)}`, sub: x.kind === "seam" ? `seam ${x.seam.toFixed(2)} s ${x.t < x.seam ? "before" : "after"}` : cueAt(x.t) })),
  };
  fs.writeFileSync(path.join(OUT, "sheet.json"), JSON.stringify(spec));
  execFileSync("python3", [path.join(HERE, "contact_sheet.py"), path.join(OUT, "sheet.json")], { stdio: "ignore" });
  sheet = spec.out;
  if (frameItems.length) {
    const fspec = {
      out: path.join(OUT, "framing-sheet.jpg"),
      cols: 4,
      thumb: 480,
      title: `${path.basename(film)} framing: focus box (cyan) inside safe area (dashed), one frame per shot hold`,
      items: frameItems.map((x) =>
        x.kind === "ann"
          ? {
              path: pathFor[x.t.toFixed(3)],
              label: `${x.t.toFixed(2)} s  ${x.scene} annotation #${x.a.id}`,
              sub: `"${x.a.text}" on ${x.a.focus}${x.a.ok ? "" : " · FAIL"}`,
              fail: !x.a.ok,
              rects: [
                x.a.safe && Object.assign({ color: "#bbbbbb", dash: true }, x.a.safe),
                x.a.focusRect && Object.assign({ color: "#00e5ff", dash: true }, x.a.focusRect),
                x.a.label && Object.assign({ color: "#ffd166" }, x.a.label),
              ].filter(Boolean),
            }
          : {
              path: pathFor[x.t.toFixed(3)],
              label: `${x.t.toFixed(2)} s  ${x.scene} #${x.k.i}${x.k.partial ? " PARTIAL" : ""}`,
              sub: `${x.k.focus} · zoom ${x.k.fit ? x.k.fit.scale : "-"}${x.k.ok ? "" : " · FAIL"}`,
              fail: !x.k.ok,
              rects: [x.k.safe && Object.assign({ color: "#bbbbbb", dash: true }, x.k.safe), x.k.rect && Object.assign({ color: x.k.ok ? "#00e5ff" : "#ff3b3b" }, x.k.rect)].filter(Boolean),
            }
      ),
    };
    fs.writeFileSync(path.join(OUT, "framing.json"), JSON.stringify(fspec));
    execFileSync("python3", [path.join(HERE, "contact_sheet.py"), path.join(OUT, "framing.json")], { stdio: "ignore" });
    framingSheet = fspec.out;
  }
}

// ---------- the render itself (kit 1.1): streams, size, loudness, fades ----------
let loud = null;
if (VIDEO) {
  const vid = path.resolve(film, VIDEO);
  const pr = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height,r_frame_rate:format=duration,size", "-of", "json", vid], { encoding: "utf8" }));
  const v = (pr.streams || []).find((x) => x.codec_type === "video");
  const au = (pr.streams || []).find((x) => x.codec_type === "audio");
  const mb = +pr.format.size / 1e6;
  const fr = v ? v.r_frame_rate.split("/").reduce((a, b) => a / b) : 0;
  const vdesc = v ? `${v.codec_name} ${v.width}x${v.height} ${fr.toFixed(2)} fps, ${(+pr.format.duration).toFixed(2)} s, ${mb.toFixed(1)} MB` : "no video stream";
  if (!v || v.codec_name !== "h264" || v.width !== 1920 || v.height !== 1080 || Math.abs(fr - 30) > 0.01) FAIL("render", `${vdesc} (want H.264 1920x1080 30 fps)`);
  else PASS("render", vdesc);
  if (mb >= 20) FAIL("render", `${mb.toFixed(1)} MB: keep the file under 20 MB (re-encode with ffmpeg -crf 23)`);
  if (Number.isFinite(duration) && Math.abs(+pr.format.duration - duration) > 0.1) WARN("render", `render is ${(+pr.format.duration).toFixed(2)} s, the film is ${duration.toFixed(2)} s`);
  if (!au) FAIL("render", "no audio stream: the music bed is missing from the render");
  else {
    if (au.codec_name !== "aac") WARN("render", `audio codec ${au.codec_name} (want AAC)`);
    const run = (args) => {
      const r = spawnSync("ffmpeg", ["-nostats", "-hide_banner"].concat(args), { encoding: "utf8", maxBuffer: 64 << 20 });
      return (r.stderr || "") + (r.stdout || "");
    };
    const sum = run(["-i", vid, "-map", "0:a:0", "-af", "ebur128=peak=true", "-f", "null", "-"]);
    const tail = sum.slice(sum.lastIndexOf("Summary:"));
    const I = parseFloat((tail.match(/I:\s*(-?[\d.]+) LUFS/) || [])[1]);
    const TP = parseFloat((tail.match(/Peak:\s*(-?[\d.]+) dBFS/) || [])[1]);
    const T = Kit.music.TARGET;
    loud = { I, TP };
    if (!Number.isFinite(I)) FAIL("loudness", "could not measure the render's loudness");
    else if (I < T.min || I > T.max) FAIL("loudness", `integrated ${I.toFixed(1)} LUFS (want ${T.min}..${T.max}, target ${T.lufs}): re-run music-bed.mjs`);
    else PASS("loudness", `integrated ${I.toFixed(1)} LUFS (want ${T.min}..${T.max})`);
    if (!Number.isFinite(TP)) WARN("loudness", "no true-peak reading");
    else if (TP > T.truePeak) FAIL("loudness", `true peak ${TP.toFixed(1)} dBTP > ${T.truePeak} dBTP`);
    else PASS("loudness", `true peak ${TP.toFixed(1)} dBTP (<= ${T.truePeak})`);
    const rms = (args) => {
      const o = run(args.concat(["-map", "0:a:0", "-af", "astats=measure_overall=RMS_level:measure_perchannel=none", "-f", "null", "-"]));
      const m = o.match(/RMS level dB:\s*(-?[\d.]+|-inf)/);
      return m ? (m[1] === "-inf" ? -120 : parseFloat(m[1])) : NaN;
    };
    const vdur = +pr.format.duration;
    const head = rms(["-t", "0.03", "-i", vid]);
    const body = rms(["-ss", "2", "-t", "4", "-i", vid]);
    const end = rms(["-ss", String(Math.max(0, vdur - 0.05)), "-i", vid]);
    if (Number.isFinite(head) && Number.isFinite(body) && head > body - 12) FAIL("fades", `first 30 ms at ${head.toFixed(1)} dB vs ${body.toFixed(1)} dB at 2-6 s: no fade-in`);
    else PASS("fades", `fade-in: first 30 ms ${Number.isFinite(head) ? head.toFixed(1) : "?"} dB vs ${Number.isFinite(body) ? body.toFixed(1) : "?"} dB at 2-6 s`);
    if (Number.isFinite(end) && end > -45) FAIL("fades", `last 50 ms at ${end.toFixed(1)} dB: the fade-out does not land on the last frame`);
    else PASS("fades", `fade-out lands on the last frame (last 50 ms ${Number.isFinite(end) ? end.toFixed(1) : "?"} dB)`);
  }
}

// ---------- report ----------
console.warn = origWarn;
const fails = results.filter((r) => r.level === "FAIL");
const warns = results.filter((r) => r.level === "WARN");
if (JSON_OUT) {
  console.log(JSON.stringify({ film, duration, firstProduct, ok: !fails.length, fails: fails.length, warns: warns.length, loudness: loud, results, sheet, framingSheet }, null, 1));
} else {
  console.log(`QA ${path.relative(process.cwd(), film) || film}  (kit lib: ${path.relative(film, libDir)}${LAUNCH ? ", launch format" : ""})`);
  let area = null;
  for (const r of results) {
    if (r.area !== area) {
      area = r.area;
      console.log(`\n[${area}]`);
    }
    console.log(`  ${r.level.padEnd(4)} ${r.msg}`);
  }
  if (sheet) console.log(`\ncontact sheet: ${sheet}`);
  if (framingSheet) console.log(`framing sheet: ${framingSheet}`);
  console.log(`\nRESULT: ${fails.length ? "FAIL" : "PASS"}  duration ${Number.isFinite(duration) ? duration.toFixed(2) : "?"} s · first product ${Number.isFinite(firstProduct) ? firstProduct.toFixed(2) : "?"} s · ${fails.length} fail · ${warns.length} warn`);
}
process.exit(fails.length ? 1 : 0);

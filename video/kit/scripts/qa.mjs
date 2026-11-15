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
 *   captions        cue >= 1.8 s, <= 90 characters (WARN); captions:false shots with a cue (FAIL)
 *   style           glow / glass / decorative gradients / audio (WARN)
 * With --frames (HyperFrames snapshot) or --video (frames from a render): a contact sheet at every
 * --every seconds (default 3), every scene seam (-0.2 / +0.2 s) and --at times, plus a framing sheet
 * (one frame per keyframe hold, focus rect cyan, safe area dashed). Written to --out (renders/qa).
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
    return { id: t.attrs.id, cid: t.attrs["data-composition-id"], src, file, raw, html, role, start: num(t.attrs["data-start"]), duration: num(t.attrs["data-duration"]), vars, missing: !raw };
  });
hosts.forEach((h) => {
  if (h.missing) FAIL("index", `#${h.id}: ${h.src} not found`);
  if (h.id !== h.cid) FAIL("index", `#${h.id}: host id must equal data-composition-id (${h.cid})`);
});

// ---------- duration ----------
if (!Number.isFinite(duration)) FAIL("duration", "root data-duration missing");
else if (duration >= 60) FAIL("duration", `${duration.toFixed(2)} s: films must be under 60 s`);
else if (duration < 45 || duration > 55) WARN("duration", `${duration.toFixed(2)} s (target 45-55 s, cap < 60 s)`);
else PASS("duration", `${duration.toFixed(2)} s (target 45-55 s, cap < 60 s)`);

// ---------- per-composition elements ----------
const product = [];
const speedClips = [];
const speedTags = [];
const cues = [];
const audio = [];
hosts.forEach((h) => {
  const ts = tags(h.html);
  const capTags = ts.filter((t) => hasClass(t, "kit-cap") && hasClass(t, "clip"));
  ts.forEach((t, i) => {
    const a = t.attrs;
    const isMedia = t.name === "video" || t.name === "img";
    if (isMedia && (a["data-kit-clip"] || /assets\/(footage|stills)\//.test(a.src || ""))) {
      const s = h.start + num(a["data-start"]);
      const d = num(a["data-duration"], t.name === "img" ? 3 : h.duration);
      product.push({ host: h.id, id: a.id, start: s, end: Math.min(h.start + h.duration, s + d) });
      const rate = num(a["data-playback-rate"], 1);
      if (Math.abs(rate - 1) > 1e-3 && t.name === "video") speedClips.push({ host: h.id, id: a.id, rate, start: s, end: Math.min(h.start + h.duration, s + d) });
    }
    if (t.name === "audio" || (t.name === "video" && a["data-has-audio"] === "true")) audio.push(`${h.id}#${a.id || "?"}`);
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
      const mm = body.match(/class="kit-cap-main"[^>]*>([\s\S]*?)<\/div>/);
      const main = (mm ? mm[1] : body).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      cues.push({ id: c.attrs.id, start: s, end: s + d, duration: d, text: main });
    });
});
// root-level sound in index.html (e.g. voice placed by place-audio.mjs) also counts
itags.forEach((t) => {
  if (t.name === "audio" || (t.name === "video" && t.attrs["data-has-audio"] === "true")) audio.push(`main#${t.attrs.id || "?"}`);
});

// ---------- first product frame ----------
const firstProduct = product.length ? Math.min(...product.map((p) => p.start)) : Infinity;
if (!product.length) FAIL("retention", "no product footage found (video/img with data-kit-clip or assets/footage src)");
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
    if (d > 3.0 + 1e-6) FAIL("scenes", tag + ": end card must be <= 3 s");
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
    const rings = tags(h.html)
      .filter((t) => hasClass(t, "kit-ring") && t.attrs["data-kit-focus"])
      .map((t) => {
        let focus = t.attrs["data-kit-focus"];
        if (focus.trim().startsWith("[")) focus = JSON.parse(focus);
        const s = num(t.attrs["data-start"]);
        return { id: t.attrs.id, start: s, end: s + num(t.attrs["data-duration"], 1), focus, pad: t.attrs["data-kit-pad"] != null ? num(t.attrs["data-kit-pad"]) : 6 };
      });
    const localCues = cues.map((c) => ({ id: c.id, start: c.start - h.start, end: c.end - h.start }));
    const p = Kit.scene.plan({ scene: h.id, shots, sceneClips: sceneClipsOf(h), duration: h.duration, rings, cues: localCues });
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
  if (!p.keyframes.length) FAIL("framing", `#${h.id}: no camera keyframes`);
});

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

// ---------- captions ----------
cues.forEach((c) => {
  if (c.duration < 1.8) WARN("captions", `#${c.id} on screen ${c.duration.toFixed(2)} s (< 1.8 s)`);
  const main = c.text;
  if (main.length > 90) WARN("captions", `#${c.id} is ${main.length} characters: "${main.slice(0, 60)}..."`);
});
if (cues.length) PASS("captions", `${cues.length} cues, ${cues[0].start.toFixed(2)}-${cues[cues.length - 1].end.toFixed(2)} s`);

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
if (audio.length) WARN("honesty", `audio on: ${audio.join(", ")} (allowed only for the demo's own recorded sound; no music, no narrator, no cloned voice)`);
else PASS("honesty", "silent: no audio elements");
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
      items: frameItems.map((x) => ({
        path: pathFor[x.t.toFixed(3)],
        label: `${x.t.toFixed(2)} s  ${x.scene} #${x.k.i}${x.k.partial ? " PARTIAL" : ""}`,
        sub: `${x.k.focus} · zoom ${x.k.fit ? x.k.fit.scale : "-"}${x.k.ok ? "" : " · FAIL"}`,
        fail: !x.k.ok,
        rects: [x.k.safe && Object.assign({ color: "#bbbbbb", dash: true }, x.k.safe), x.k.rect && Object.assign({ color: x.k.ok ? "#00e5ff" : "#ff3b3b" }, x.k.rect)].filter(Boolean),
      })),
    };
    fs.writeFileSync(path.join(OUT, "framing.json"), JSON.stringify(fspec));
    execFileSync("python3", [path.join(HERE, "contact_sheet.py"), path.join(OUT, "framing.json")], { stdio: "ignore" });
    framingSheet = fspec.out;
  }
}

// ---------- report ----------
console.warn = origWarn;
const fails = results.filter((r) => r.level === "FAIL");
const warns = results.filter((r) => r.level === "WARN");
if (JSON_OUT) {
  console.log(JSON.stringify({ film, duration, firstProduct, ok: !fails.length, fails: fails.length, warns: warns.length, results, sheet, framingSheet }, null, 1));
} else {
  console.log(`QA ${path.relative(process.cwd(), film) || film}  (kit lib: ${path.relative(film, libDir)})`);
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

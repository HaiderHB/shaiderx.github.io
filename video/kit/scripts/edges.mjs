#!/usr/bin/env node
/*
 * kit/scripts/edges.mjs — advisory edge check: which tracked components does each camera keyframe
 * show only in part at the frame edges? qa.mjs guarantees the component IN FOCUS is whole; this lists
 * the neighbours a push-in slices (a card cut at the top edge, a button cut at the side), which viewers
 * also read as "cut off". Content that runs under the caption band is not reported (the band covers it).
 *
 *   node kit/scripts/edges.mjs <film> [--min 4] [--json]
 *
 * For every keyframe of every footage scene and the cold open (same shot data and kit/lib code as qa.mjs),
 * it takes the frame's visible footage rectangle under the fitted camera, then every tracked component of
 * the clip(s) shown during the hold, and reports the ones that cross the top, left or right edge (or the
 * bottom edge when captions are off) by at least --min footage px (default 4). Components larger than the
 * visible area in that direction (page sections, scroll panes) are skipped. Untracked page text cannot be
 * checked: look at the framing sheet for those, and a component hidden under the page's own sticky header
 * is still reported (check it on the framing sheet). Always exits 0 (advice, not a gate).
 * Fix a hit with the shot's align / margin / pad (Kit.camera.fit) so the edge falls in whitespace, a focus
 * that includes the neighbour, or a recapture with the page scrolled so the neighbour is out of view.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
if (!argv.length || argv[0] === "--help") {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0]);
  process.exit(argv.length ? 0 : 1);
}
const film = path.resolve(argv[0]);
const val = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const MIN = parseFloat(val("--min", "4"));
const JSON_OUT = argv.includes("--json");

const libDir = fs.existsSync(path.join(film, "kit", "lib")) ? path.join(film, "kit", "lib") : path.join(HERE, "..", "lib");
const { libFiles } = await import(path.join(HERE, "sync.mjs"));
globalThis.Kit = undefined;
for (const f of libFiles().filter((f) => fs.existsSync(path.join(libDir, f)))) require(path.join(libDir, f));
const Kit = globalThis.Kit;
console.warn = () => {};
globalThis.KIT_CLIPS = {};
const clipsDir = path.join(film, "data", "clips");
if (fs.existsSync(clipsDir))
  for (const f of fs.readdirSync(clipsDir).filter((f) => f.endsWith(".json"))) {
    const c = JSON.parse(fs.readFileSync(path.join(clipsDir, f), "utf8"));
    globalThis.KIT_CLIPS[c.name] = c;
  }

// minimal HTML reading (same approach as qa.mjs)
const strip = (h) => h.replace(/<!--[\s\S]*?-->/g, (m) => " ".repeat(m.length));
function attrs(s) {
  const out = {};
  const re = /([^\s=>\/"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let m;
  while ((m = re.exec(s))) out[m[1]] = m[2] ?? m[3] ?? m[4] ?? "";
  return out;
}
function tags(html) {
  const out = [];
  const re = /<([a-zA-Z][\w-]*)((?:\s+[^\s=>\/"']+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>/g;
  let m;
  while ((m = re.exec(html))) out.push({ name: m[1].toLowerCase(), attrs: attrs(m[2] || "") });
  return out;
}
const num = (v, d = 0) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : d);

const index = strip(fs.readFileSync(path.join(film, "index.html"), "utf8"));
const hosts = tags(index)
  .filter((t) => t.attrs["data-composition-src"])
  .map((t) => {
    const file = path.join(film, t.attrs["data-composition-src"]);
    const html = fs.existsSync(file) ? strip(fs.readFileSync(file, "utf8")) : "";
    let vars = {};
    try {
      vars = JSON.parse(t.attrs["data-variable-values"] || "{}");
    } catch (e) {
      /* qa.mjs reports it */
    }
    const src = t.attrs["data-composition-src"];
    const role = t.attrs["data-kit-role"] || (/cold-open\.html$/.test(src) ? "cold-open" : /data-kit-clip=/.test(html) ? "footage" : "other");
    return { id: t.attrs.id, role, html, vars, start: num(t.attrs["data-start"]), duration: num(t.attrs["data-duration"]) };
  });

function sceneClipsOf(h) {
  const list = tags(h.html)
    .filter((t) => (t.name === "video" || t.name === "img") && t.attrs["data-kit-clip"])
    .map((t) => Object.assign({ id: t.attrs.id }, t.attrs));
  return Kit.clips.fromAttrs(list).map((c) => Object.assign(c, { end: Math.min(c.end, h.duration) }));
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

const report = [];
for (const h of hosts) {
  let shots = null;
  if (h.role === "cold-open") shots = Kit.blocks.coldOpenShots(Object.assign(blockDefaults(h.html), h.vars), h.duration);
  else if (h.role === "footage") {
    const m = h.html.match(/<script[^>]*class="kit-shots"[^>]*>([\s\S]*?)<\/script>/);
    if (!m) continue;
    try {
      shots = JSON.parse(m[1]);
    } catch (e) {
      continue;
    }
  } else continue;
  const sceneClips = sceneClipsOf(h);
  const plan = Kit.scene.plan({ scene: h.id, shots, sceneClips, duration: h.duration });
  const sorted = shots.slice().sort((a, b) => a.t - b.t);
  plan.keyframes.forEach((k) => {
    if (!k.fit) return;
    // a move that fills its whole slot (the cold-open push-in) has no hold: use its framing window
    const span = k.hold[1] - k.hold[0] >= 0.05 ? k.hold : k.window;
    if (span[1] - span[0] < 0.05) return;
    const s = k.fit.scale;
    const vis = { x0: -k.fit.x / s, y0: -k.fit.y / s, x1: (1920 - k.fit.x) / s, y1: (1080 - k.fit.y) / s };
    const bottom = k.captions ? (Kit.camera.SAFE.bandTop - k.fit.y) / s : vis.y1; // content under the band is covered
    const focusNames = new Set((Array.isArray(sorted[k.i].focus) ? sorted[k.i].focus : [sorted[k.i].focus]).filter((f) => typeof f === "string").map((f) => f.split("@")[0]));
    const hits = [];
    Kit.clips.segments(sceneClips, span[0], span[1]).forEach((seg) => {
      const c = Kit.clips.get(seg.clip);
      if (!c) return;
      for (const name of Object.keys(c.boxes || {})) {
        if (focusNames.has(name)) continue;
        Kit.clips.boxesIn(c, name, Math.min(seg.m0, seg.m1), Math.max(seg.m0, seg.m1)).forEach((b) => {
          if (b.absent) return;
          const bx1 = b.x + b.w, by1 = b.y + b.h;
          // not on screen above the band at all
          if (bx1 <= vis.x0 || b.x >= vis.x1 || by1 <= vis.y0 || b.y >= bottom) return;
          const edges = [];
          if (b.y < vis.y0 - MIN && by1 > vis.y0 + MIN && b.h < bottom - vis.y0) edges.push(`top ${Math.round(vis.y0 - b.y)} px`);
          if (b.x < vis.x0 - MIN && bx1 > vis.x0 + MIN && b.w < vis.x1 - vis.x0) edges.push(`left ${Math.round(vis.x0 - b.x)} px`);
          if (bx1 > vis.x1 + MIN && b.x < vis.x1 - MIN && b.w < vis.x1 - vis.x0) edges.push(`right ${Math.round(bx1 - vis.x1)} px`);
          if (!k.captions && by1 > vis.y1 + MIN && b.y < vis.y1 - MIN && b.h < vis.y1 - vis.y0) edges.push(`bottom ${Math.round(by1 - vis.y1)} px`);
          if (edges.length) hits.push({ component: name, clip: seg.clip, media: b.t, edges });
        });
      }
    });
    // one line per component (worst sample)
    const by = {};
    hits.forEach((x) => (by[x.component] = by[x.component] || x));
    report.push({ scene: h.id, shot: k.i, abs: +(h.start + k.t).toFixed(2), focus: k.focus, zoom: s, visible: Object.fromEntries(Object.entries(vis).map(([a, v]) => [a, Math.round(v)])), cut: Object.values(by) });
  });
}

if (JSON_OUT) console.log(JSON.stringify({ film, min: MIN, report }, null, 1));
else {
  console.log(`edges ${path.basename(film)}: tracked neighbours cut at the frame edges (advisory; untracked text is not checked)`);
  let n = 0;
  report.forEach((r) => {
    const head = `  ${r.scene} shot ${r.shot} @${r.abs}s zoom ${r.zoom} focus=${r.focus}`;
    if (!r.cut.length) console.log(head + "  ok");
    else {
      n += r.cut.length;
      console.log(head);
      r.cut.forEach((c) => console.log(`      ${c.component} (${c.clip} @${c.media.toFixed(2)}s): ${c.edges.join(", ")}`));
    }
  });
  console.log(`\n${n} edge cut(s) in ${report.length} shots`);
}

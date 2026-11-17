#!/usr/bin/env node
/*
 * kit/scripts/build-footage.mjs — turn captures into film media + clip data.
 *
 *   node kit/scripts/build-footage.mjs <film> [clip ...]          build raw/<clip>/ captures (default: all)
 *   node kit/scripts/build-footage.mjs <film> --import s2=/path/s2.mp4 [--marks s2=/path/marks.json]
 *                                         [--boxes s2=/path/boxes.json]   bring in footage recorded earlier
 *   node kit/scripts/build-footage.mjs <film> --still s2@31.2        held frame -> assets/footage/s2_31.20.png
 *   node kit/scripts/build-footage.mjs <film> --only-data            just rewrite data/clips.js
 *
 * Per clip it writes
 *   assets/footage/<clip>.mp4     30 fps CFR H.264 (crf 16), t = 0 at clip.begin()   (git-ignored)
 *   data/clips/<clip>.json        {name, source, width, height, duration, marks, boxes, events}
 *   data/clips.js                 window.KIT_CLIPS = {...}  (index.html loads it; QA reads the JSON)
 * Cuts: capture/cuts.json = [{"name": "hook", "from": "s2", "start": 1.0, "end": 3.4, "rate": 1}]
 *   makes assets/footage/hook.mp4 and data/clips/hook.json with boxes/marks/events remapped
 *   (the cold-open block plays "hook"). A cut with rate != 1 must be labelled in the film.
 * Kit 2: a capture made with deviceScaleFactor 2 and/or a viewport that is not 1920 px wide (e.g. 1360x765 at 2x)
 * keeps its pixels (video up to 3840 px wide, so 1.5-2x camera zooms stay sharp) while boxes, cursor and click
 * positions are scaled to the 1920x1080 stage the camera works in. The clip data then carries
 * {width: 1920, height: 1080, stageScale, viewport, deviceScaleFactor, pixels: {width, height}}.
 * Box files for imported footage use the capture format ({samples: [{name, t, x, y, w, h}]}), e.g. from
 * kit/scripts/measure-boxes.py, which measures card edges in the frames (source "frame").
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
if (!args.length || args[0] === "--help") {
  console.log(fs.readFileSync(new URL(import.meta.url)).toString().split("*/")[0]);
  process.exit(args.length ? 0 : 1);
}
const film = path.resolve(args.shift());
const opt = { imports: {}, marks: {}, boxes: {}, stills: [], clips: [], onlyData: false };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  const kv = () => {
    const [k, v] = args[++i].split("=");
    return [k, path.resolve(v)];
  };
  if (a === "--import") { const [k, v] = kv(); opt.imports[k] = v; }
  else if (a === "--marks") { const [k, v] = kv(); opt.marks[k] = v; }
  else if (a === "--boxes") { const [k, v] = kv(); opt.boxes[k] = v; }
  else if (a === "--still") opt.stills.push(args[++i]);
  else if (a === "--only-data") opt.onlyData = true;
  else opt.clips.push(a);
}

const FOOT = path.join(film, "assets", "footage");
const DATA = path.join(film, "data", "clips");
fs.mkdirSync(FOOT, { recursive: true });
fs.mkdirSync(DATA, { recursive: true });

const ff = (a) => execFileSync("ffmpeg", ["-v", "error", "-y", ...a], { stdio: "inherit" });
const probe = (f) => {
  const out = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", f]).toString();
  const j = JSON.parse(out);
  return { width: j.streams[0].width, height: j.streams[0].height, duration: +(+j.format.duration).toFixed(3) };
};
const readJSON = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const writeJSON = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 1) + "\n");

function groupBoxes(samples, source) {
  const out = {};
  samples
    .slice()
    .sort((a, b) => a.t - b.t)
    .forEach((s) => {
      const rec = s.absent ? { t: +s.t.toFixed(3), absent: true } : { t: +s.t.toFixed(3), x: s.x, y: s.y, w: s.w, h: s.h };
      if (s.clipped) rec.clipped = true;
      if (s.source || source) rec.src = s.source || source;
      (out[s.name] = out[s.name] || []).push(rec);
    });
  return out;
}

function buildCaptured(name) {
  const dir = path.join(film, "raw", name);
  const fj = readJSON(path.join(dir, "frames.json"));
  const frames = fj.frames.slice().sort((a, b) => a.ts - b.ts);
  const t0 = fj.t0;
  let firstIdx = frames.findIndex((f) => f.ts >= t0);
  if (firstIdx < 0) throw new Error(name + ": no frames after begin()");
  if (firstIdx > 0) firstIdx -= 1; // the frame on screen at begin
  const used = frames.slice(firstIdx);
  const end = fj.endWall;
  const lines = ["ffconcat version 1.0"];
  used.forEach((f, i) => {
    const start = Math.max(f.ts, t0);
    const next = i + 1 < used.length ? used[i + 1].ts : end;
    lines.push(`file 'frames/${f.file}'`, `duration ${Math.max(0.001, next - start).toFixed(4)}`);
  });
  lines.push(`file 'frames/${used[used.length - 1].file}'`);
  fs.writeFileSync(path.join(dir, "frames.ffconcat"), lines.join("\n") + "\n");
  const out = path.join(FOOT, name + ".mp4");
  // kit 2: 2x captures keep their pixels up to 3840 px wide (even sizes for H.264)
  const vp = fj.viewport || { width: 1920, height: 1080 };
  const dsf = fj.deviceScaleFactor || 1;
  const hi = dsf !== 1 || vp.width !== 1920;
  const vf = (hi ? "scale='min(3840,iw)':-2:flags=lanczos," : "") + "fps=30,format=yuv420p";
  ff(["-f", "concat", "-safe", "0", "-i", path.join(dir, "frames.ffconcat"), "-vf", vf, "-c:v", "libx264", "-preset", hi ? "medium" : "slow", "-crf", "16", "-g", "30", "-t", (end - t0).toFixed(3), out]);
  const p = probe(out);
  let bx = fs.existsSync(path.join(dir, "boxes.json")) ? readJSON(path.join(dir, "boxes.json")).samples : [];
  let ev = fs.existsSync(path.join(dir, "events.json")) ? readJSON(path.join(dir, "events.json")) : [];
  const clip = { name, source: "dom", width: p.width, height: p.height, duration: p.duration, marks: fj.marks, boxes: null, events: null };
  if (hi) {
    // boxes and pointer positions were sampled in CSS px of the capture viewport: bring them to the 1920x1080 stage
    const k = 1920 / vp.width;
    const r1 = (v) => Math.round(v * k * 10) / 10;
    if (Math.abs(vp.height * k - 1080) > 1) console.warn(`${name}: viewport ${vp.width}x${vp.height} is not 16:9; the stage letterboxes it`);
    bx = bx.map((b) => (b.absent ? b : Object.assign({}, b, { x: r1(b.x), y: r1(b.y), w: r1(b.w), h: r1(b.h) })));
    ev = ev.map((e) => Object.assign({}, e, e.x != null ? { x: r1(e.x), y: r1(e.y) } : {}, e.box ? { box: { x: r1(e.box.x), y: r1(e.box.y), w: r1(e.box.w), h: r1(e.box.h) } } : {}));
    Object.assign(clip, { width: 1920, height: Math.round(vp.height * k), stageScale: +k.toFixed(4), viewport: vp, deviceScaleFactor: dsf, pixels: { width: p.width, height: p.height } });
  }
  clip.boxes = groupBoxes(bx);
  clip.events = ev;
  writeJSON(path.join(DATA, name + ".json"), clip);
  console.log(`built ${name}: ${p.duration}s, ${Object.keys(clip.boxes).length} tracked components, ${ev.length} events`);
}

function buildImport(name, file) {
  const out = path.join(FOOT, name + ".mp4");
  if (path.resolve(file) !== out) fs.copyFileSync(file, out);
  const p = probe(out);
  const prev = fs.existsSync(path.join(DATA, name + ".json")) ? readJSON(path.join(DATA, name + ".json")) : {};
  let marks = prev.marks || [{ label: "begin", t: 0 }];
  if (opt.marks[name]) marks = readJSON(opt.marks[name]);
  let boxes = prev.boxes || {};
  let source = prev.source || "manual";
  if (opt.boxes[name]) {
    const bj = readJSON(opt.boxes[name]);
    boxes = groupBoxes(bj.samples || bj, bj.source || "frame");
    source = bj.source || "frame";
  }
  writeJSON(path.join(DATA, name + ".json"), { name, source, width: p.width, height: p.height, duration: p.duration, marks, boxes, events: prev.events || [] });
  console.log(`imported ${name}: ${p.duration}s, ${Object.keys(boxes).length} components (${source})`);
}

function remapList(list, start, end, rate, key = "t") {
  return list
    .filter((e) => e[key] >= start - 1e-6 && e[key] <= end + 1e-6)
    .map((e) => Object.assign({}, e, { [key]: +((e[key] - start) / rate).toFixed(3) }, e.t1 != null ? { t1: +((e.t1 - start) / rate).toFixed(3) } : {}));
}

function buildCut(c) {
  const rate = c.rate || 1;
  const src = path.join(FOOT, c.from + ".mp4");
  const out = path.join(FOOT, c.name + ".mp4");
  const vf = (rate !== 1 ? `setpts=(PTS-STARTPTS)/${rate},` : "") + "fps=30,format=yuv420p";
  ff(["-ss", String(c.start), "-i", src, "-t", String(c.end - c.start), "-an", "-vf", vf, "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-g", "30", out]);
  const p = probe(out);
  const sc = readJSON(path.join(DATA, c.from + ".json"));
  const boxes = {};
  for (const [k, list] of Object.entries(sc.boxes || {})) {
    let active = null;
    list.forEach((s) => {
      if (s.t <= c.start + 1e-6) active = s;
    });
    const inside = list.filter((s) => s.t > c.start + 1e-6 && s.t <= c.end + 1e-6).map((s) => Object.assign({}, s, { t: +((s.t - c.start) / rate).toFixed(3) }));
    boxes[k] = (active ? [Object.assign({}, active, { t: 0 })] : []).concat(inside);
  }
  const clip = {
    name: c.name,
    source: sc.source,
    // kit 2: a cut of a 2x capture stays in the 1920x1080 stage space of its source
    width: sc.stageScale ? sc.width : p.width,
    height: sc.stageScale ? sc.height : p.height,
    ...(sc.stageScale ? { stageScale: sc.stageScale, viewport: sc.viewport, deviceScaleFactor: sc.deviceScaleFactor, pixels: { width: p.width, height: p.height } } : {}),
    duration: p.duration,
    derivedFrom: { clip: c.from, start: c.start, end: c.end, rate },
    marks: [{ label: "begin", t: 0 }].concat(remapList(sc.marks || [], c.start, c.end, rate).filter((m) => m.label !== "begin")),
    boxes,
    events: remapList(sc.events || [], c.start, c.end, rate),
  };
  writeJSON(path.join(DATA, c.name + ".json"), clip);
  console.log(`cut ${c.name} from ${c.from} ${c.start}-${c.end}s x${rate}: ${p.duration}s`);
}

function buildStill(spec) {
  const [name, t] = spec.split("@");
  const out = path.join(FOOT, `${name}_${(+t).toFixed(2)}.png`);
  ff(["-ss", String(t), "-i", path.join(FOOT, name + ".mp4"), "-frames:v", "1", out]);
  console.log(`still ${path.relative(film, out)}  (use data-kit-clip="${name}" data-kit-media-time="${t}")`);
}

function writeClipsJs() {
  const all = {};
  fs.readdirSync(DATA)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .forEach((f) => {
      const c = readJSON(path.join(DATA, f));
      all[c.name] = c;
    });
  const js = "/* generated by kit/scripts/build-footage.mjs from data/clips/*.json: do not edit */\nwindow.KIT_CLIPS = " + JSON.stringify(all) + ";\n";
  fs.writeFileSync(path.join(film, "data", "clips.js"), js);
  console.log(`data/clips.js: ${Object.keys(all).join(", ") || "(no clips)"}`);
}

if (!opt.onlyData) {
  for (const [k, v] of Object.entries(opt.imports)) buildImport(k, v);
  let names = opt.clips;
  if (!names.length && !Object.keys(opt.imports).length && !opt.stills.length) {
    const raw = path.join(film, "raw");
    names = fs.existsSync(raw) ? fs.readdirSync(raw).filter((d) => fs.existsSync(path.join(raw, d, "frames.json"))) : [];
  }
  names.forEach(buildCaptured);
  const cutsFile = path.join(film, "capture", "cuts.json");
  if (fs.existsSync(cutsFile)) readJSON(cutsFile).forEach(buildCut);
  opt.stills.forEach(buildStill);
}
writeClipsJs();

#!/usr/bin/env node
/*
 * kit/scripts/place-audio.mjs — put a demo's own recorded sound (voice turns) on the film timeline
 * in sync with the footage, and write speech subtitles timed from the same mapping.
 *
 *   node kit/scripts/place-audio.mjs <film> [--write] [--check renders/x.mp4] [--json]
 *
 * Input: <film>/capture/voice.json
 *   { "clip": "take",               capture the sound belongs to (DOM clock of raw/<clip>/)
 *     "lag": 0.05,                  seconds the screencast shows a DOM change late (kit/scripts/frame-lag.py)
 *     "captions": "captions",       id of the captions host (cue times are local to it)
 *     "utterances": [
 *       { "id": "mod2", "src": "assets/audio/mod2.wav", "at": 32.534,   clip seconds when file t=0 played
 *         "use": [[0, 3.84]],         file-second ranges to keep (default: the whole file); cut a long line
 *         "volume": 1,                (optional) data-volume
 *         "cues": [ { "from": 0.17, "to": 3.8, "text": "Got it. Who is involved ...?",
 *                     "label": "AI moderator", "chip": "Fish stock voice", "note": "...", "hold": 0.5 } ] } ] }
 *   `at` comes from raw/<clip>/audio.json (fake-mic: "speaks" for simulated answers, "media" playing
 *   events for the page's own audio). Cue from/to are FILE seconds of the words (silences/transcript).
 *
 * What it does
 *   1. Reads the film's footage: every <video data-kit-clip> in every scene host (cold-open block
 *      included; clips cut with build-footage cuts map back through `derivedFrom`).
 *   2. Maps each kept file range to film time: clip time = at + file t + lag, shown where a 1x footage
 *      segment of that clip shows that media time. A range that crosses a footage cut is split there,
 *      so sound never runs across a jump; a range not on screen at 1x (sped up, a held still, cut out)
 *      is reported and left out.
 *   3. --write: replaces the block between <!-- kit:voice:start --> and <!-- kit:voice:end --> in
 *      index.html with one <audio> per piece, and the block between <!-- kit:voice-cues:start --> and
 *      <!-- kit:voice-cues:end --> in the captions host file with one .kit-cap.kit-voice cue per cue
 *      (start = first word - 0.05 s; end = last word + hold, never past the next cue of the film).
 *      Cues shorter than reading time (0.3 s/word + 0.5 s) are reported.
 *   4. --check <render>: decodes the render's audio and, for every placed piece, finds the speech onset
 *      near where the plan puts it; prints the offset (the "listen check"; |offset| > 0.08 s fails).
 *   Writes capture/voice.placed.json (pieces, cues, film times) every run.
 * Used by: films/great-question.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const argv = process.argv.slice(2);
if (!argv.length || argv[0] === "--help") {
  console.log(fs.readFileSync(new URL(import.meta.url), "utf8").split("*/")[0]);
  process.exit(argv.length ? 0 : 1);
}
const film = path.resolve(argv[0]);
const WRITE = argv.includes("--write");
const JSON_OUT = argv.includes("--json");
const ci = argv.indexOf("--check");
const CHECK = ci >= 0 ? path.resolve(film, argv[ci + 1]) : null;

const cfg = JSON.parse(fs.readFileSync(path.join(film, "capture", "voice.json"), "utf8"));
const LAG = Number(cfg.lag || 0);

// ---------- tiny HTML reader (same approach as qa.mjs) ----------
const stripComments = (h) => h.replace(/<!--[\s\S]*?-->/g, (m) => " ".repeat(m.length));
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
  while ((m = re.exec(html))) out.push({ name: m[1].toLowerCase(), attrs: parseAttrs(m[2] || "") });
  return out;
}
const num = (v, d = 0) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : d);

const indexFile = path.join(film, "index.html");
const indexHtml = fs.readFileSync(indexFile, "utf8");
const hosts = tags(stripComments(indexHtml))
  .filter((t) => t.attrs["data-composition-src"])
  .map((t) => ({ id: t.attrs.id, src: t.attrs["data-composition-src"], start: num(t.attrs["data-start"]), duration: num(t.attrs["data-duration"]) }));

const clipData = {};
const dataDir = path.join(film, "data", "clips");
if (fs.existsSync(dataDir)) for (const f of fs.readdirSync(dataDir).filter((f) => f.endsWith(".json"))) {
  const c = JSON.parse(fs.readFileSync(path.join(dataDir, f), "utf8"));
  clipData[c.name] = c;
}
// media time of `clip` -> time in the capture clip cfg.clip (through build-footage cuts)
function toCapture(clip, m) {
  if (clip === cfg.clip) return m;
  const c = clipData[clip];
  if (c && c.derivedFrom && c.derivedFrom.clip === cfg.clip) return c.derivedFrom.start + m * (c.derivedFrom.rate || 1);
  return null;
}

// footage segments of the whole film
const segs = [];
for (const h of hosts) {
  const file = path.join(film, h.src);
  if (!fs.existsSync(file)) continue;
  for (const t of tags(stripComments(fs.readFileSync(file, "utf8")))) {
    if (t.name !== "video" || !t.attrs["data-kit-clip"]) continue;
    const a = t.attrs;
    const s = h.start + num(a["data-start"]);
    const e = Math.min(h.start + h.duration, s + num(a["data-duration"], h.duration));
    const rate = num(a["data-playback-rate"], 1);
    const m0 = toCapture(a["data-kit-clip"], num(a["data-media-start"], 0));
    if (m0 == null || e <= s) continue;
    const dr = clipData[a["data-kit-clip"]] && clipData[a["data-kit-clip"]].derivedFrom ? clipData[a["data-kit-clip"]].derivedFrom.rate || 1 : 1;
    segs.push({ host: h.id, id: a.id, s, e, m0, rate: rate * dr });
  }
}
segs.sort((a, b) => a.s - b.s);

// capture time c -> [{film, seg}] where it is on screen at 1x
function filmAt(c) {
  return segs.filter((g) => Math.abs(g.rate - 1) < 1e-3 && c >= g.m0 - 1e-4 && c < g.m0 + (g.e - g.s) - 1e-4).map((g) => ({ film: g.s + (c - g.m0), seg: g }));
}

const problems = [];
const pieces = [];
const cues = [];
for (const u of cfg.utterances) {
  const fileDur = +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path.join(film, u.src)]).toString().trim();
  const use = u.use || [[0, fileDur]];
  const mine = [];
  for (const [a0, b0] of use) {
    const a = Math.max(0, a0), b = Math.min(fileDur, b0);
    const c0 = u.at + a + LAG, c1 = u.at + b + LAG;
    let covered = 0;
    for (const g of segs) {
      if (Math.abs(g.rate - 1) > 1e-3) continue;
      const lo = Math.max(c0, g.m0), hi = Math.min(c1, g.m0 + (g.e - g.s));
      if (hi - lo < 0.02) continue;
      covered += hi - lo;
      mine.push({ utt: u.id, src: u.src, film: +(g.s + (lo - g.m0)).toFixed(3), dur: +(hi - lo).toFixed(3), fileStart: +(lo - u.at - LAG).toFixed(3), seg: g.id, volume: u.volume });
    }
    if (covered < b - a - 0.05) problems.push(`${u.id} file ${a.toFixed(2)}-${b.toFixed(2)} s: only ${covered.toFixed(2)} s of ${(b - a).toFixed(2)} s is on screen at 1x (sped up, still or cut): that part is silent`);
  }
  mine.sort((x, y) => x.film - y.film);
  mine.forEach((p, i) => (p.id = `v-${u.id}-${i + 1}`));
  pieces.push(...mine);
  const f2film = (ft) => {
    const p = mine.find((p) => ft >= p.fileStart - 0.02 && ft <= p.fileStart + p.dur + 0.02);
    return p ? p.film + (Math.min(Math.max(ft, p.fileStart), p.fileStart + p.dur) - p.fileStart) : null;
  };
  (u.cues || []).forEach((q, i) => {
    const s = f2film(q.from), e = f2film(q.to);
    if (s == null || e == null) {
      problems.push(`${u.id} cue ${i + 1} "${q.text.slice(0, 30)}": ${s == null ? "from" : "to"} is not in a placed piece`);
      return;
    }
    cues.push(Object.assign({}, q, { utt: u.id, id: `vc-${u.id}-${i + 1}`, speechStart: +s.toFixed(3), speechEnd: +e.toFixed(3) }));
  });
}
// cue on-screen windows: from first word - 0.05 to last word + hold, clipped at the next cue
cues.sort((a, b) => a.speechStart - b.speechStart);
cues.forEach((q, i) => {
  q.start = +(q.speechStart - 0.05).toFixed(3);
  const next = cues[i + 1];
  let end = q.speechEnd + (q.hold != null ? q.hold : 0.5);
  if (next) end = Math.min(end, next.speechStart - 0.05);
  q.end = +end.toFixed(3);
  const words = q.text.split(/\s+/).filter(Boolean).length;
  q.reading = +(0.3 * words + 0.5).toFixed(2);
  if (q.end - q.start < Math.min(q.reading, 1.8) - 0.01) problems.push(`${q.id} on screen ${(q.end - q.start).toFixed(2)} s, reading time ${q.reading} s (${words} words): shorten the text or merge cues`);
  else if (q.end - q.start < q.reading - 0.01) q.short = true;
});

// ---------- report ----------
const capHost = hosts.find((h) => h.id === (cfg.captions || "captions"));
const out = { lag: LAG, pieces, cues, problems };
fs.writeFileSync(path.join(film, "capture", "voice.placed.json"), JSON.stringify(out, null, 1));
if (JSON_OUT) console.log(JSON.stringify(out, null, 1));
else {
  console.log(`place-audio ${path.basename(film)}: ${pieces.length} pieces from ${cfg.utterances.length} utterances, lag ${LAG} s`);
  for (const p of pieces) console.log(`  ${p.id.padEnd(12)} film ${p.film.toFixed(2).padStart(6)}-${(p.film + p.dur).toFixed(2).padStart(6)}  file ${p.fileStart.toFixed(2)}+${p.dur.toFixed(2)}  (${p.seg})`);
  for (const q of cues) console.log(`  ${q.id.padEnd(12)} cue  ${q.start.toFixed(2).padStart(6)}-${q.end.toFixed(2).padStart(6)}  speech ${q.speechStart.toFixed(2)}-${q.speechEnd.toFixed(2)}  ${q.short ? "(short) " : ""}"${q.text.slice(0, 60)}"`);
  for (const p of problems) console.log("  PROBLEM " + p);
}

// ---------- write ----------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function replaceBlock(text, name, body, file) {
  const a = `<!-- kit:${name}:start -->`, b = `<!-- kit:${name}:end -->`;
  const i = text.indexOf(a), j = text.indexOf(b);
  if (i < 0 || j < i) throw new Error(`${file}: add ${a} ... ${b} where the ${name} block goes`);
  const indent = (text.slice(0, i).match(/[ \t]*$/) || [""])[0];
  return text.slice(0, i + a.length) + "\n" + body.map((l) => indent + l).join("\n") + "\n" + indent + text.slice(j);
}
if (WRITE) {
  const audioTags = pieces.map(
    (p) =>
      `<audio id="${p.id}" class="clip" src="${p.src}" data-start="${p.film.toFixed(3)}" data-duration="${p.dur.toFixed(3)}" data-media-start="${p.fileStart.toFixed(3)}" data-volume="${p.volume != null ? p.volume : 1}" data-track-index="${p.utt.startsWith("mod") ? 5 : 6}"></audio>`
  );
  fs.writeFileSync(indexFile, replaceBlock(indexHtml, "voice", audioTags, "index.html"));
  if (capHost) {
    const capFile = path.join(film, capHost.src);
    const capHtml = fs.readFileSync(capFile, "utf8");
    const lines = [];
    for (const q of cues) {
      const s = q.start - capHost.start, d = q.end - q.start;
      lines.push(`<div id="${q.id}" class="clip kit-cap kit-voice" data-start="${s.toFixed(3)}" data-duration="${d.toFixed(3)}" data-track-index="1" data-kit-voice="${q.utt}">`);
      lines.push(`  <div class="kit-cap-label"><span>${esc(q.label || "")}</span>${q.chip ? `<span class="kit-chip">${esc(q.chip)}</span>` : ""}</div>`);
      lines.push(`  <div class="kit-cap-main">${esc(q.text)}</div>`);
      if (q.note) lines.push(`  <div class="kit-cap-note">${esc(q.note)}</div>`);
      lines.push(`</div>`);
    }
    fs.writeFileSync(capFile, replaceBlock(capHtml, "voice-cues", lines, capHost.src));
  }
  console.log(`wrote ${pieces.length} <audio> to index.html${capHost ? ` and ${cues.length} cues to ${capHost.src}` : ""}`);
}

// ---------- listen check ----------
if (CHECK) {
  const SR = 16000;
  const pcm = (file, ss, t) => {
    const a = ["-v", "error"];
    if (ss != null) a.push("-ss", String(ss));
    a.push("-i", file);
    if (t != null) a.push("-t", String(t));
    a.push("-ac", "1", "-ar", String(SR), "-f", "f32le", "-");
    const buf = execFileSync("ffmpeg", a, { maxBuffer: 1 << 30 });
    return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  };
  // 10 ms RMS envelope (dB, floored at -60)
  const env = (x) => {
    const hop = SR / 100, out = [];
    for (let i = 0; i + hop <= x.length; i += hop) {
      let s = 0;
      for (let j = 0; j < hop; j++) s += x[i + j] * x[i + j];
      out.push(Math.max(-60, 10 * Math.log10(s / hop + 1e-12)));
    }
    return out;
  };
  const render = env(pcm(CHECK));
  let bad = 0;
  console.log(`listen check ${path.relative(film, CHECK)}: envelope of each placed piece vs the render, best offset in +-0.3 s`);
  for (const p of pieces) {
    const src = env(pcm(path.join(film, p.src), p.fileStart, Math.min(p.dur, 3)));
    if (src.length < 20 || Math.max(...src) < -40) continue;
    const at = Math.round(p.film * 100);
    let best = null, bestScore = -Infinity;
    // Pearson correlation of the envelopes (gain-independent)
    const corr = (a, b) => {
      const n = a.length, ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n;
      let sab = 0, saa = 0, sbb = 0;
      for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
      return sab / Math.sqrt(saa * sbb + 1e-9);
    };
    for (let k = -30; k <= 30; k++) {
      const win = render.slice(at + k, at + k + src.length);
      if (win.length < src.length) continue;
      const c = corr(src, win);
      if (c > bestScore) { bestScore = c; best = k / 100; }
    }
    const ok = best != null && Math.abs(best) <= 0.08 && bestScore > 0.6;
    if (!ok) bad++;
    console.log(`  ${ok ? "ok  " : "FAIL"} ${p.id.padEnd(12)} placed ${p.film.toFixed(2)} s, heard at ${best == null ? "?" : (best >= 0 ? "+" : "") + best.toFixed(2)} s (envelope correlation ${bestScore.toFixed(2)})`);
  }
  for (const q of cues) {
    const lead = q.start - q.speechStart;
    console.log(`  cue  ${q.id.padEnd(12)} shows ${q.start.toFixed(2)}-${q.end.toFixed(2)} s, words ${q.speechStart.toFixed(2)}-${q.speechEnd.toFixed(2)} s (lead ${lead.toFixed(2)} s, tail ${(q.end - q.speechEnd).toFixed(2)} s)`);
  }
  console.log(bad ? `LISTEN CHECK: ${bad} piece(s) off` : "LISTEN CHECK: every piece lands within 80 ms");
  if (bad) process.exitCode = 1;
}
if (problems.length && !CHECK) process.exitCode = 1;

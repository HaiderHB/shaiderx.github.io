/*
 * kit/scripts/fake-mic.cjs — a simulated participant for voice demos, used with capture.cjs.
 *
 * Replaces navigator.mediaDevices.getUserMedia with a Web Audio stream that plays prepared WAV
 * answers on cue, so the page's REAL path (getUserMedia -> MediaRecorder -> its silence detector and
 * level meter -> upload) runs on them. It also logs every <audio>/<video> playback event (play,
 * playing, pause, ended) and every value of the attributes you `watch`, with wall-clock times, so a
 * film can place the demo's own sound (e.g. TTS replies) where it really played and measure the
 * screencast's frame lag (kit/scripts/frame-lag.py). Nothing on the page is redrawn or changed.
 *
 *   const cap = require("../../../kit/scripts/capture.cjs");
 *   const mic = require("../../../kit/scripts/fake-mic.cjs");
 *   const clip = await cap.startClip({ film, name: "take", url, track,
 *     launch: { args: mic.CHROME_ARGS }, init: mic.init({ watch: { dock: ["[data-phase]", "data-phase"] } }) });
 *   await mic.attach(clip, { dir: "/abs/answers", suffix: ".tight.wav" }); // serves <dir>/<id><suffix>
 *   await mic.load(clip, ["a1", "a2"]);        // decode in the page during pre-roll -> {id: seconds}
 *   await clip.begin();
 *   await clip.click(page.getByRole("button", { name: "Answer" }), { label: "answer1" });
 *   await mic.speak(clip, "a1");               // a1 enters the mic stream now; mark "speak:a1"
 *   ...
 *   await mic.collect(clip);                   // BEFORE clip.finish(): writes raw/<name>/audio.json
 *   await clip.finish();
 *
 * raw/<name>/audio.json (t = clip seconds, the clock of boxes/events/marks; 0 = clip.begin()):
 *   { speaks: [{id, t, dur, file}],                          the simulated answers as they entered the mic
 *     media:  [{type: "play"|"playing"|"pause"|"ended", t, tag, n, dur, currentTime}],   page playback
 *     watch:  [{name, t, value}],                            watched attribute changes (e.g. a dock phase)
 *     gum:    [{t, constraints}] }                           getUserMedia calls the page made
 *
 * The answers are synthetic (e.g. TTS): label them on screen ("Simulated participant") and in REVIEW.md.
 */
const fs = require("fs");
const path = require("path");

// Chromium flags: allow autoplay without a gesture (headless replies), fake UI/device as a backstop.
const CHROME_ARGS = ["--autoplay-policy=no-user-gesture-required", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"];

const ROUTE = "/__kit_mic/";

// Page-side source. `watch` = {name: [selector, attribute]}.
function initSource(opts) {
  const watch = (opts && opts.watch) || {};
  return `(() => {
    const WATCH = ${JSON.stringify(watch)};
    const st = (window.__kitMic = window.__kitMic || { log: [] });
    const log = (type, data) => st.log.push(Object.assign({ type, wall: Date.now() }, data || {}));
    let ctx = null, dest = null;
    const buffers = {};
    async function ensure() {
      if (!ctx) { ctx = new AudioContext({ sampleRate: 48000 }); dest = ctx.createMediaStreamDestination(); }
      if (ctx.state !== 'running') await ctx.resume();
    }
    st.load = async (ids) => {
      await ensure();
      for (const id of ids) {
        const r = await fetch('${ROUTE}' + id + '.wav');
        buffers[id] = await ctx.decodeAudioData(await r.arrayBuffer());
      }
      return Object.fromEntries(Object.entries(buffers).map(([k, b]) => [k, b.duration]));
    };
    // Plays one answer into the mic stream; returns the wall time (ms) its first sample enters it.
    st.speak = (id) => {
      const src = ctx.createBufferSource();
      src.buffer = buffers[id];
      src.connect(dest);
      const ts = ctx.getOutputTimestamp();
      const when = ctx.currentTime + 0.1;
      src.start(when);
      const wall = performance.timeOrigin + ts.performanceTime + (when - ts.contextTime) * 1000;
      log('speak', { id, startWall: wall, dur: buffers[id].duration });
      src.onended = () => log('speakEnd', { id });
      return wall;
    };
    const md = navigator.mediaDevices;
    if (md) {
      md.getUserMedia = async (constraints) => {
        await ensure();
        log('gum', { constraints: JSON.stringify(constraints) });
        return new MediaStream(dest.stream.getAudioTracks().map((t) => t.clone()));
      };
    }
    // observation only: playback events of the page's own media
    const ids = new WeakMap();
    let nextId = 0;
    for (const ev of ['play', 'playing', 'pause', 'ended'])
      document.addEventListener(ev, (e) => {
        const el = e.target;
        if (!el || (el.tagName !== 'AUDIO' && el.tagName !== 'VIDEO')) return;
        if (!ids.has(el)) ids.set(el, ++nextId);
        log('media', { ev, tag: el.tagName.toLowerCase(), n: ids.get(el), dur: isFinite(el.duration) ? el.duration : null, currentTime: el.currentTime });
      }, true);
    const last = {};
    const scan = () => {
      for (const [name, [sel, attr]] of Object.entries(WATCH)) {
        const el = document.querySelector(sel);
        const v = el ? (attr ? el.getAttribute(attr) : el.textContent.trim()) : null;
        if (last[name] !== v) { last[name] = v; log('watch', { name, value: v }); }
      }
    };
    const start = () => { scan(); new MutationObserver(scan).observe(document, { subtree: true, childList: true, characterData: true, attributes: true }); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  })();`;
}

const INIT = initSource({});
const init = (opts) => initSource(opts || {});

const files = new WeakMap();

async function attach(clip, { dir, suffix = ".wav" }) {
  files.set(clip, { dir, suffix });
  await clip.page.route("**" + ROUTE + "*.wav", (route) => {
    const id = path.basename(new URL(route.request().url()).pathname, ".wav");
    const f = path.join(dir, id + suffix);
    if (!fs.existsSync(f)) return route.fulfill({ status: 404, body: "no answer " + id });
    route.fulfill({ status: 200, contentType: "audio/wav", body: fs.readFileSync(f) });
  });
}

async function load(clip, ids) {
  return clip.page.evaluate((ids) => window.__kitMic.load(ids), ids);
}

async function speak(clip, id) {
  const wall = await clip.page.evaluate((id) => window.__kitMic.speak(id), id);
  clip.mark("speak:" + id);
  return wall;
}

// t0 of the clip in epoch seconds (capture.cjs keeps it private; clip.t is "now - t0")
function t0Of(clip) {
  return Date.now() / 1000 - clip.t;
}

async function collect(clip) {
  const t0 = t0Of(clip);
  const raw = await clip.page.evaluate(() => (window.__kitMic ? window.__kitMic.log : []));
  const rel = (ms) => +(ms / 1000 - t0).toFixed(3);
  const f = files.get(clip) || {};
  const out = {
    speaks: raw.filter((e) => e.type === "speak").map((e) => ({ id: e.id, t: rel(e.startWall), dur: +e.dur.toFixed(3), file: f.dir ? path.join(f.dir, e.id + f.suffix) : null })),
    media: raw.filter((e) => e.type === "media").map((e) => ({ type: e.ev, t: rel(e.wall), tag: e.tag, n: e.n, dur: e.dur, currentTime: e.currentTime })),
    watch: raw.filter((e) => e.type === "watch").map((e) => ({ name: e.name, t: rel(e.wall), value: e.value })),
    gum: raw.filter((e) => e.type === "gum").map((e) => ({ t: rel(e.wall), constraints: e.constraints })),
  };
  fs.writeFileSync(path.join(clip.outDir, "audio.json"), JSON.stringify(out, null, 1));
  return out;
}

module.exports = { CHROME_ARGS, INIT, init, attach, load, speak, collect };

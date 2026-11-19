/*
 * kit/lib/music.js — the instrumental bed under every film (kit 1.1). Pure planning and checks,
 * shared by kit/scripts/music-bed.mjs (which writes the <audio>) and kit/scripts/qa.mjs (which checks it).
 * The page needs no script: HyperFrames mixes the <audio> from its attributes (data-volume,
 * data-fade-in, data-fade-out are linear gains at the clip edges), identically in preview and render.
 *
 * Kit.music.TARGET  {lufs: -20, min: -22, max: -18, truePeak: -1, fadeIn: 0.3, fadeOut: 1.5}
 * Kit.music.plan({film, bed, align = "end", mediaStart, fadeIn = 0.3, fadeOut = 1.5})
 *     film   film length (root data-duration), s
 *     bed    {name, duration, end}: end = where the bed's own outro has died away (kit/music/beds.json)
 *     align  "end": the bed's natural ending lands on the film's last frame (media starts at end - film);
 *            "start": the bed plays from its first second and is cut by the fade-out
 *     -> {start: 0, duration: film, mediaStart, fadeIn, fadeOut, problems: []}
 * Kit.music.volume(gainDb) -> data-volume (linear, 3 decimals)
 * Kit.music.check(attrs, film) -> {problems, warnings}: one bed from 0 to the film's end, fade in
 *     <= 0.3 s, fade out 1-2 s landing on the last frame, a level set (data-volume)
 *
 * Markup (written by music-bed.mjs between <!-- kit:music:start --> and <!-- kit:music:end --> in index.html):
 *   <audio id="music" class="clip kit-music" src="assets/music/bright-pluck-112.mp3" data-kit-music="bright-pluck-112"
 *     data-start="0" data-duration="50.2" data-media-start="9.1" data-volume="0.55" data-fade-in="0.3"
 *     data-fade-out="1.5" data-kit-lufs="-20" data-timeline-role="music" data-track-index="9"></audio>
 */
(function (g) {
  const Kit = (g.Kit = g.Kit || {});
  const TARGET = { lufs: -20, min: -22, max: -18, truePeak: -1, fadeIn: 0.3, fadeOut: 1.5 };

  function plan(o) {
    const film = +o.film;
    const bed = o.bed || {};
    const fadeIn = o.fadeIn != null ? +o.fadeIn : TARGET.fadeIn;
    const fadeOut = o.fadeOut != null ? +o.fadeOut : TARGET.fadeOut;
    const end = bed.end || bed.duration || 0;
    const problems = [];
    let mediaStart;
    if (o.mediaStart != null) mediaStart = +o.mediaStart;
    else if ((o.align || "end") === "end") mediaStart = Math.max(0, end - film);
    else mediaStart = 0;
    if (bed.duration && mediaStart + film > bed.duration + 0.01) problems.push(`bed ${bed.name || "?"} (${bed.duration} s) is shorter than the film from ${mediaStart.toFixed(2)} s`);
    if (fadeIn > TARGET.fadeIn + 1e-6) problems.push(`fade-in ${fadeIn} s is longer than ${TARGET.fadeIn} s`);
    return { start: 0, duration: +film.toFixed(3), mediaStart: +mediaStart.toFixed(3), fadeIn, fadeOut, problems };
  }

  function volume(gainDb) {
    return +Math.pow(10, gainDb / 20).toFixed(3);
  }

  function num(v) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }

  function check(a, film) {
    const problems = [];
    const warnings = [];
    const start = num(a["data-start"]);
    const dur = num(a["data-duration"]);
    const fi = num(a["data-fade-in"]);
    const fo = num(a["data-fade-out"]);
    const vol = num(a["data-volume"]);
    if (start == null || Math.abs(start) > 1e-3) problems.push(`starts at ${start} s, not 0 (the bed runs under the whole film)`);
    if (dur == null || Math.abs((start || 0) + dur - film) > 1 / 60) problems.push(`ends at ${((start || 0) + (dur || 0)).toFixed(3)} s, not on the film's end ${film} s (re-run music-bed.mjs after changing the film length)`);
    if (fi == null || fi <= 0) problems.push("no fade-in (data-fade-in, <= 0.3 s)");
    else if (fi > TARGET.fadeIn + 1e-6) problems.push(`fade-in ${fi} s > ${TARGET.fadeIn} s`);
    if (fo == null || fo <= 0) problems.push("no fade-out (data-fade-out, ~1.5 s)");
    else if (fo < 1 || fo > 2) warnings.push(`fade-out ${fo} s (aim for ~1.5 s)`);
    if (vol == null) problems.push("no data-volume (set the level with music-bed.mjs)");
    else if (vol > 1) warnings.push(`data-volume ${vol} boosts the bed above 0 dB`);
    if ("muted" in a) problems.push("the bed is muted");
    if (!/^assets\/music\/[^/]+$/.test(a.src || "")) problems.push(`src "${a.src || ""}" is not under assets/music/ (sync vendors kit/music/<bed> there)`);
    return { problems, warnings };
  }

  Kit.music = { TARGET, plan, volume, check };
  if (typeof module === "object" && module.exports) module.exports = Kit;
})(typeof window !== "undefined" ? window : globalThis);

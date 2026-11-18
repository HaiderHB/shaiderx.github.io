/*
 * kit/lib/core.js — namespace, constants and small timing helpers. Loaded first.
 *
 * Kit.FRAME            {w: 1920, h: 1080, fps: 30}
 * Kit.time.frame(t)    snap seconds to the nearest frame (1/30 s)
 * Kit.time.seq(start, durations[]) -> [{start, end, duration}] laid end to end
 * Kit.time.speed(sourceSeconds, screenSeconds) -> playback rate to pass as data-playback-rate
 * Kit.time.label(rate) -> "2.5x" (the text a speed tag must show for that rate)
 * Kit.warn(msg)        console.warn with a [kit] prefix; also kept in window.__kitWarnings
 *
 * Works in the browser (window.Kit) and in Node (require returns Kit; QA uses that).
 */
(function (g) {
  const Kit = (g.Kit = g.Kit || {});
  Kit.version = "2.1.0";
  Kit.FRAME = { w: 1920, h: 1080, fps: 30 };

  Kit.time = {
    frame(t) {
      return Math.round(t * Kit.FRAME.fps) / Kit.FRAME.fps;
    },
    seq(start, durations) {
      let at = start;
      return durations.map((d) => {
        const item = { start: +at.toFixed(3), end: +(at + d).toFixed(3), duration: d };
        at += d;
        return item;
      });
    },
    speed(sourceSeconds, screenSeconds) {
      return +(sourceSeconds / screenSeconds).toFixed(4);
    },
    label(rate) {
      const r = Math.round(rate * 10) / 10;
      return (Number.isInteger(r) ? String(r) : r.toFixed(1)) + "x";
    },
  };

  g.__kitWarnings = g.__kitWarnings || [];
  Kit.warn = function (msg) {
    g.__kitWarnings.push(String(msg));
    if (typeof console !== "undefined") console.warn("[kit] " + msg);
  };

  if (typeof module === "object" && module.exports) module.exports = Kit;
})(typeof window !== "undefined" ? window : globalThis);

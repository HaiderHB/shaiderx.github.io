/*
 * kit/lib/cursor.js — an overlay cursor that replays the REAL recorded pointer path.
 * The capture already draws a cursor into the page; use this only where the footage cursor is
 * too small after a pull-out, or over a held still. Never invent clicks: it follows events
 * of type "cursor" / "click" recorded by kit/scripts/capture.cjs.
 *
 * Markup, inside .kit-cam so it moves with the footage (footage px):
 *   <svg id="r2-cursor" class="kit-cursor" viewBox="0 0 30 38"><path d="M2 2 L2 31 L9.5 24.5 L14.5 35.5
 *     L19.5 33.3 L14.6 22.4 L24.5 22.4 Z" fill="#fff" stroke="#0b0d10" stroke-width="2.2"/></svg>
 *
 * Kit.cursor.follow(tl, el, {clip, sceneClips, from, to, step = 1/30})
 *   replays the clip's cursor samples shown during scene [from, to); click events squeeze it to 0.86
 */
(function (g) {
  const Kit = (g.Kit = g.Kit || {});

  function follow(tl, el, o) {
    const node = typeof el === "string" ? document.querySelector(el) : el;
    const c = Kit.clips.get(o.clip);
    if (!node || !c) return;
    const pts = (c.events || []).filter((e) => e.type === "cursor" || e.type === "click");
    if (!pts.length) return;
    const segs = Kit.clips.segments(o.sceneClips, o.from, o.to).filter((s) => s.clip === o.clip);
    tl.set(node, { opacity: 1 }, o.from);
    segs.forEach((s) => {
      const k = (s.t1 - s.t0) / Math.max(1e-6, s.m1 - s.m0);
      pts.forEach((p) => {
        if (p.t < s.m0 || p.t >= s.m1) return;
        const at = s.t0 + (p.t - s.m0) * k;
        tl.set(node, { x: p.x - 2, y: p.y - 2 }, at);
        if (p.type === "click") {
          tl.to(node, { scale: 0.86, duration: 0.07, ease: "power2.in" }, at);
          tl.to(node, { scale: 1, duration: 0.14, ease: "power2.out" }, at + 0.09);
        }
      });
    });
    tl.set(node, { opacity: 0 }, o.to);
  }

  Kit.cursor = { follow };
  if (typeof module === "object" && module.exports) module.exports = Kit;
})(typeof window !== "undefined" ? window : globalThis);

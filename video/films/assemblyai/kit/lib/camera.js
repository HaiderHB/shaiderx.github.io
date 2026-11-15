/*
 * kit/lib/camera.js — the framing guarantee.
 *
 * The camera is a transform on .kit-cam (transform-origin 0 0): screen = (x, y) + scale * footagePx.
 * fit() takes the box of the component in focus (footage px, captured from the DOM at record time)
 * and returns the push-in that shows the WHOLE box inside the safe area. When the wanted zoom
 * would crop the box, it lowers the zoom instead. Only `partial: true` (with a reason) may crop.
 *
 * Kit.camera.SAFE                 {margin: 24, bandTop: 840}  (keep bandTop = --kit-band-top)
 * Kit.camera.safeArea({captions = true, margin = 24, bandTop = 840})
 *     -> {x, y, w, h}: the frame minus a 24 px margin, and minus the caption band when captions are on
 * Kit.camera.fit(box, opts) -> {scale, x, y, rect, safe, ok, fitScale, cropped}
 *     box        {x, y, w, h} in footage px (union several with Kit.camera.union)
 *     opts.maxZoom  highest zoom wanted (default 1.8); the result is min(maxZoom, what fits)
 *     opts.zoom     exact zoom wanted; still lowered if it would crop (unless partial)
 *     opts.minZoom  below this, fit() still shows the whole box but sets `small: true`
 *     opts.pad      screen px of air between the box and the safe edge (default 16)
 *     opts.margin   footage px added around the box before fitting (default 8)
 *     opts.safeMargin  frame margin in screen px (default and minimum 24)
 *     opts.align    "center" (default) | "top" | "bottom" | "left" | "right" | "top-left" ...
 *     opts.captions true (default) keeps the box above the caption band; false = full frame
 *     opts.fill     true (default): slide inside the slack so footage edges stay off screen
 *     opts.partial  true = may crop; needs opts.reason; uses opts.zoom and opts.center [cx, cy]
 * Kit.camera.project(t, box) -> screen rect of a footage box under transform t
 * Kit.camera.inside(rect, area, eps = 0.5) -> boolean
 * Kit.camera.union([box, ...]) -> box; Kit.camera.grow(box, px) -> box
 * Kit.camera.toGsap(fitResult) -> {scale, x, y}
 */
(function (g) {
  const Kit = (g.Kit = g.Kit || {});
  const FRAME = { w: 1920, h: 1080 };
  const SAFE = { margin: 24, bandTop: 840 };

  function safeArea(opts) {
    opts = opts || {};
    const m = opts.margin != null ? opts.margin : SAFE.margin;
    const bandTop = opts.bandTop != null ? opts.bandTop : SAFE.bandTop;
    const bottom = opts.captions === false ? FRAME.h - m : bandTop - m;
    return { x: m, y: m, w: FRAME.w - 2 * m, h: bottom - m };
  }

  function union(boxes) {
    const list = boxes.filter(Boolean);
    if (!list.length) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    list.forEach((b) => {
      x0 = Math.min(x0, b.x);
      y0 = Math.min(y0, b.y);
      x1 = Math.max(x1, b.x + b.w);
      y1 = Math.max(y1, b.y + b.h);
    });
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  function grow(b, px) {
    return { x: b.x - px, y: b.y - px, w: b.w + 2 * px, h: b.h + 2 * px };
  }

  function project(t, b) {
    return { x: t.x + t.scale * b.x, y: t.y + t.scale * b.y, w: t.scale * b.w, h: t.scale * b.h };
  }

  function inside(r, a, eps) {
    eps = eps == null ? 0.5 : eps;
    return r.x >= a.x - eps && r.y >= a.y - eps && r.x + r.w <= a.x + a.w + eps && r.y + r.h <= a.y + a.h + eps;
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function fit(box, opts) {
    opts = opts || {};
    // opts.margin is the footage-px air around the box; the frame margin is opts.safeMargin (never < 24)
    const safe = opts.safe || safeArea({ captions: opts.captions, bandTop: opts.bandTop, margin: Math.max(SAFE.margin, opts.safeMargin || 0) });
    const pad = opts.pad != null ? opts.pad : 16;
    const maxZoom = opts.maxZoom != null ? opts.maxZoom : 1.8;
    const b = grow(box, opts.margin != null ? opts.margin : 8);
    const availW = safe.w - 2 * pad;
    const availH = safe.h - 2 * pad;
    const fitScale = Math.min(availW / b.w, availH / b.h);
    const wanted = opts.zoom != null ? opts.zoom : maxZoom;
    const partial = !!opts.partial;
    const scale = partial ? wanted : Math.min(wanted, fitScale);

    // centre of interest: box centre, or an explicit centre for partial shots
    const cx = partial && opts.center ? opts.center[0] : b.x + b.w / 2;
    const cy = partial && opts.center ? opts.center[1] : b.y + b.h / 2;
    let x = safe.x + safe.w / 2 - scale * cx;
    let y = safe.y + safe.h / 2 - scale * cy;

    if (!partial) {
      // slack: how far the box may slide and still sit inside safe - pad
      const r = project({ scale, x, y }, b);
      const dxLo = safe.x + pad - r.x;
      const dxHi = safe.x + safe.w - pad - (r.x + r.w);
      const dyLo = safe.y + pad - r.y;
      const dyHi = safe.y + safe.h - pad - (r.y + r.h);
      const align = opts.align || "center";
      if (/left/.test(align)) x += dxLo;
      if (/right/.test(align)) x += dxHi;
      if (/top/.test(align)) y += dyLo;
      if (/bottom/.test(align)) y += dyHi;
      if (opts.fill !== false && scale >= 1) {
        // keep the footage covering the frame where the slack allows (no visible footage edge)
        const r2 = project({ scale, x, y }, b);
        const loX = safe.x + pad - r2.x, hiX = safe.x + safe.w - pad - (r2.x + r2.w);
        const loY = safe.y + pad - r2.y, hiY = safe.y + safe.h - pad - (r2.y + r2.h);
        const wantX = clamp(x, FRAME.w - FRAME.w * scale, 0) - x;
        const wantY = clamp(y, FRAME.h - FRAME.h * scale, 0) - y;
        x += clamp(wantX, Math.min(0, loX), Math.max(0, hiX));
        y += clamp(wantY, Math.min(0, loY), Math.max(0, hiY));
      }
    }
    const t = { scale: +scale.toFixed(4), x: +x.toFixed(2), y: +y.toFixed(2) };
    const rect = project(t, box);
    const ok = inside(rect, safe);
    return {
      scale: t.scale,
      x: t.x,
      y: t.y,
      rect,
      safe,
      ok: partial ? true : ok,
      cropped: !ok,
      fitScale: +fitScale.toFixed(4),
      lowered: !partial && wanted > fitScale,
      small: opts.minZoom != null && scale < opts.minZoom,
    };
  }

  function toGsap(f) {
    return { scale: f.scale, x: f.x, y: f.y };
  }

  Kit.camera = { FRAME, SAFE, safeArea, fit, project, inside, union, grow, toGsap };
  if (typeof module === "object" && module.exports) module.exports = Kit;
})(typeof window !== "undefined" ? window : globalThis);

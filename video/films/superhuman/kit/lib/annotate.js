/*
 * kit/lib/annotate.js — annotations (kit 1.1): a short label (<= 6 words) next to a recorded component,
 * with a ring on the component. Placed automatically inside the safe area, never over the shot's focus
 * box, the ring itself or the caption band; when there is no room beside the ring, the label goes just
 * outside the focus box with a thin leader line back to the ring.
 *
 * Markup, in a footage scene OUTSIDE .kit-stage (screen space; one camera hold, so it never drifts):
 *   <div id="r2-ann-route" class="clip kit-ann" data-start="11.2" data-duration="3.0"
 *        data-kit-focus="finalRoute" data-kit-pad="6" data-kit-side="auto" data-track-index="3"
 *        data-layout-allow-overlap data-layout-allow-occlusion>
 *     <div class="kit-ann-label">Rules overrule the model</div>
 *   </div>
 *   data-kit-focus  component name / "name@clip" / JSON array (union), from the clip's recorded boxes
 *   data-kit-pad    footage px between component and ring (default 6)
 *   data-kit-side   auto (default: right, left, below, above) | right | left | below | above
 *   class "dim"     also dim the rest of the frame (like a callout ring)
 * Kit.scene.footage() places and animates every .kit-ann of the scene; QA plans the same placement.
 *
 * Kit.annotate.place({ring, focus, safe, size: {w, h}, side = "auto", gap = 16, avoid = []})
 *     -> {rect, side, anchor: "ring" | "focus", leader: [x1, y1, x2, y2] | null} or null (no room)
 * Kit.annotate.overlap(a, b, eps = 0.5) -> true if two rects overlap
 */
(function (g) {
  const Kit = (g.Kit = g.Kit || {});

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function overlap(a, b, eps) {
    eps = eps == null ? 0.5 : eps;
    if (!a || !b) return false;
    return a.x < b.x + b.w - eps && b.x < a.x + a.w - eps && a.y < b.y + b.h - eps && b.y < a.y + a.h - eps;
  }

  function inside(r, s) {
    return r.x >= s.x - 0.5 && r.y >= s.y - 0.5 && r.x + r.w <= s.x + s.w + 0.5 && r.y + r.h <= s.y + s.h + 0.5;
  }

  function leaderFor(R, L, side) {
    // from the ring edge facing the label to the label edge facing the ring
    if (side === "right" || side === "left") {
      const y = clamp(L.y + L.h / 2, R.y + 6, R.y + R.h - 6);
      const ly = clamp(y, L.y + 8, L.y + L.h - 8);
      return side === "right" ? [R.x + R.w, y, L.x, ly] : [R.x, y, L.x + L.w, ly];
    }
    const x = clamp(L.x + Math.min(L.w / 2, 40), R.x + 6, R.x + R.w - 6);
    const lx = clamp(x, L.x + 10, L.x + L.w - 10);
    return side === "below" ? [x, R.y + R.h, lx, L.y] : [x, R.y, lx, L.y + L.h];
  }

  function place(o) {
    const R = o.ring;
    const F = o.focus || null;
    const S = o.safe;
    const w = o.size.w;
    const h = o.size.h;
    const gap = o.gap != null ? o.gap : 16;
    const avoid = (o.avoid || []).filter(Boolean);
    const sides = o.side && o.side !== "auto" ? [o.side] : ["right", "left", "below", "above"];
    const cy = R.y + R.h / 2;
    const cands = [];
    const at = (A, side, anchor) => {
      let x, y;
      if (side === "right") (x = A.x + A.w + gap), (y = clamp(cy - h / 2, S.y, S.y + S.h - h));
      else if (side === "left") (x = A.x - gap - w), (y = clamp(cy - h / 2, S.y, S.y + S.h - h));
      else if (side === "below") (y = A.y + A.h + gap), (x = clamp(R.x, S.x, S.x + S.w - w));
      else (y = A.y - gap - h), (x = clamp(R.x, S.x, S.x + S.w - w));
      cands.push({ rect: { x: Math.round(x), y: Math.round(y), w, h }, side, anchor });
    };
    sides.forEach((s) => at(R, s, "ring"));
    if (F) sides.forEach((s) => at(F, s, "focus"));
    for (const c of cands) {
      const L = c.rect;
      if (!inside(L, S)) continue;
      if (overlap(L, R)) continue;
      if (F && overlap(L, F)) continue;
      if (avoid.some((a) => overlap(L, a))) continue;
      const far = c.anchor === "focus" || Math.max(L.x - (R.x + R.w), R.x - (L.x + L.w), L.y - (R.y + R.h), R.y - (L.y + L.h)) > gap + 2;
      c.leader = far ? leaderFor(R, L, c.side).map((v) => Math.round(v)) : null;
      return c;
    }
    return null;
  }

  // browser: draw and animate one planned annotation (called by Kit.scene.footage)
  function render(tl, el, a) {
    if (!a || !a.ring || !a.label) return;
    const doc = el.ownerDocument;
    let ring = el.querySelector(".kit-ann-ring");
    if (!ring) {
      ring = doc.createElement("div");
      ring.className = "kit-ann-ring";
      el.insertBefore(ring, el.firstChild);
    }
    Object.assign(ring.style, { left: a.ring.x + "px", top: a.ring.y + "px", width: a.ring.w + "px", height: a.ring.h + "px" });
    const label = el.querySelector(".kit-ann-label");
    Object.assign(label.style, { left: a.label.x + "px", top: a.label.y + "px", width: a.label.w + "px", height: a.label.h + "px" });
    let line = null;
    if (a.leader) {
      const NS = "http://www.w3.org/2000/svg";
      let svg = el.querySelector("svg.kit-ann-leader");
      if (!svg) {
        svg = doc.createElementNS(NS, "svg");
        svg.setAttribute("class", "kit-ann-leader");
        svg.setAttribute("viewBox", "0 0 1920 1080");
        svg.setAttribute("width", "1920");
        svg.setAttribute("height", "1080");
        line = doc.createElementNS(NS, "line");
        svg.appendChild(line);
        el.insertBefore(svg, label);
      } else line = svg.querySelector("line");
      line.setAttribute("x1", a.leader[0]);
      line.setAttribute("y1", a.leader[1]);
      line.setAttribute("x2", a.leader[2]);
      line.setAttribute("y2", a.leader[3]);
    }
    tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power2.out" }, a.start);
    tl.fromTo(ring, { scale: 1.06 }, { scale: 1, duration: 0.4, ease: "expo.out" }, a.start);
    tl.fromTo(label, { opacity: 0, filter: "blur(8px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.22, ease: "expo.out" }, a.start + 0.08);
    tl.to(el, { opacity: 0, duration: 0.15, ease: "power2.in" }, Math.max(a.start + 0.3, a.end - 0.17));
  }

  Kit.annotate = { place, overlap, render };
  if (typeof module === "object" && module.exports) module.exports = Kit;
})(typeof window !== "undefined" ? window : globalThis);

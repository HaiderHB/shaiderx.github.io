/*
 * kit/lib/scene.js — a footage scene from shot data: camera keyframes + callout rings,
 * every one framed by Kit.camera.fit so the focused component is never cut off.
 *
 * Shot data sits in the scene file as JSON, so QA reads exactly what renders:
 *   <script type="application/json" class="kit-shots">
 *   [ {"t": 0,   "focus": "email", "maxZoom": 1.6, "cut": true},
 *     {"t": 2.0, "focus": ["email", "runButton"], "dur": 0.8, "ease": "power2.inOut"},
 *     {"t": 9.4, "focus": "trace", "align": "top"},
 *     {"t": 12,  "focus": "reply", "partial": true, "zoom": 2.2, "center": [1180, 300],
 *      "reason": "only the question line matters here; the card is shown whole at 14 s"} ]
 *   </script>
 *
 * Shot fields
 *   t         scene seconds when the move (or cut) starts
 *   focus     component name from the clip's boxes, "name@clip", a literal {x,y,w,h} (manual,
 *             QA warns), or an array of these (union). Boxes are unioned over the whole hold,
 *             so a component that grows or moves while the camera holds stays fully in frame.
 *   dur, ease move length (default 0.8 s, "power2.inOut"); cut: true = hard cut to the framing
 *   maxZoom, zoom, minZoom, pad, margin, align, fill   -> Kit.camera.fit options
 *   captions  true (default): keep the focus above the caption band; false: full frame
 *             (QA fails the shot if a caption cue is on screen during its hold)
 *   partial   true + reason: the shot may crop the component on purpose (zoom, center)
 *   window    [a, b] scene seconds over which to union the focus boxes (default: the hold)
 *   label     free text shown in QA output
 *
 * Rings (callout + dim), in the scene markup inside .kit-cam:
 *   <div id="r2-ring-bars" class="clip kit-ring" data-start="13.2" data-duration="1.6"
 *        data-kit-focus="decisionBars" data-kit-pad="6" data-track-index="2"
 *        data-layout-allow-overlap data-layout-allow-occlusion><div class="kit-ring-box"></div></div>
 *   The ring box is placed from the recorded DOM box; QA checks it is inside the safe area.
 *
 * Kit.scene.footage({id, tl, duration?, shots?, root?, cam?}) -> plan   (call in the scene script)
 * Kit.scene.plan({scene, shots, sceneClips, duration, rings?, cues?})   (pure; QA calls this in Node)
 * window.__kitShots collects every planned keyframe in the page for debugging.
 */
(function (g) {
  const Kit = (g.Kit = g.Kit || {});

  function focusList(f) {
    if (f == null) return [];
    return Array.isArray(f) ? f : [f];
  }

  function describe(f) {
    return focusList(f)
      .map((x) => (typeof x === "string" ? x : "box(" + [x.x, x.y, x.w, x.h].join(",") + ")"))
      .join("+");
  }

  // union of every box sample of the focus shown during scene window [h0, h1)
  function resolve(focus, sceneClips, h0, h1) {
    const problems = [];
    const warnings = [];
    const boxes = [];
    let samples = 0;
    const segs = Kit.clips.segments(sceneClips, h0, Math.max(h1, h0 + 0.001));
    focusList(focus).forEach((f) => {
      if (typeof f === "object") {
        boxes.push(f);
        warnings.push("manual box " + describe(f) + " (not from a capture)");
        return;
      }
      const at = String(f).split("@");
      const name = at[0];
      const only = at[1];
      let found = 0;
      segs.forEach((s) => {
        if (only && s.clip !== only) return;
        const c = Kit.clips.get(s.clip);
        if (!c) {
          problems.push("no clip data for '" + s.clip + "' (run build-footage, load data/clips.js)");
          return;
        }
        const list = Kit.clips.boxesIn(c, name, Math.min(s.m0, s.m1), Math.max(s.m0, s.m1));
        list.forEach((b) => {
          samples++;
          if (b.absent) {
            problems.push("'" + name + "' is not on the page at media " + b.t.toFixed(2) + " s of " + s.clip);
            return;
          }
          found++;
          boxes.push(b);
          if (b.clipped || Kit.clips.outside(b, c))
            problems.push(
              "'" + name + "' extends past the captured viewport at media " + b.t.toFixed(2) + " s of " + s.clip +
                " (cut off in the source footage: recapture with it in view, or mark the shot partial)"
            );
        });
      });
      if (!found && !problems.length) problems.push("no box for '" + name + "' during scene " + h0.toFixed(2) + "-" + h1.toFixed(2) + " s");
    });
    const box = Kit.camera.union(boxes.map((b) => ({ x: b.x, y: b.y, w: b.w, h: b.h })));
    if (boxes.length > 1 && box) {
      const biggest = Math.max.apply(null, boxes.map((b) => b.w * b.h));
      if (box.w * box.h > biggest * 1.6 && focusList(focus).length === 1)
        warnings.push("'" + describe(focus) + "' moves a lot during the hold (union " + Math.round((box.w * box.h) / biggest * 100) + "% of its size): split the shot");
    }
    return { box, problems, warnings, samples };
  }

  function overlaps(a0, a1, b0, b1) {
    return Math.min(a1, b1) - Math.max(a0, b0) > 0.05;
  }

  function plan(o) {
    const shots = (o.shots || []).slice().sort((a, b) => a.t - b.t);
    const sceneClips = o.sceneClips || [];
    const duration = o.duration != null ? o.duration : sceneClips.reduce((m, c) => Math.max(m, c.end), 0);
    const keyframes = [];
    shots.forEach((s, i) => {
      const dur = s.cut ? 0 : s.dur != null ? s.dur : i === 0 ? 0 : 0.8;
      const h0 = s.t + dur;
      const next = shots[i + 1];
      const h1 = next ? next.t : duration;
      const win = s.window || [Math.min(h0, h1), h1];
      const r = resolve(s.focus, sceneClips, win[0], win[1]);
      const k = {
        scene: o.scene,
        i,
        t: s.t,
        dur,
        hold: [+h0.toFixed(3), +h1.toFixed(3)],
        window: [+win[0].toFixed(3), +win[1].toFixed(3)],
        focus: describe(s.focus),
        label: s.label || "",
        partial: !!s.partial,
        reason: s.reason || "",
        captions: s.captions !== false,
        problems: r.problems.slice(),
        warnings: r.warnings.slice(),
        box: r.box,
        samples: r.samples,
      };
      if (next && next.t < h0 - 1e-6) k.warnings.push("next shot starts before this move ends");
      if (s.partial && !s.reason) k.problems.push("partial shot without a reason");
      if (r.box) {
        const f = Kit.camera.fit(r.box, Object.assign({}, s, { captions: s.captions !== false }));
        k.fit = { scale: f.scale, x: f.x, y: f.y };
        k.rect = f.rect;
        k.safe = f.safe;
        k.fitScale = f.fitScale;
        k.lowered = f.lowered;
        if (!s.partial && !f.ok) k.problems.push("focus does not fit the safe area");
        if (f.small) k.warnings.push("zoom " + f.scale + " is below minZoom " + s.minZoom + " (component is large)");
        if (f.scale < 1 && !s.partial) k.warnings.push("zoom " + f.scale + " < 1: footage is shown smaller than captured");
      } else if (!k.problems.length) k.problems.push("no box to frame");
      if (!k.captions && o.cues)
        o.cues.forEach((c) => {
          if (overlaps(h0, h1, c.start, c.end)) k.problems.push("captions:false but caption '" + (c.id || "?") + "' is on screen during the hold");
        });
      k.ok = !k.problems.length;
      keyframes.push(k);
    });

    const rings = (o.rings || []).map((rg) => {
      const r = resolve(rg.focus, sceneClips, rg.start, rg.end);
      const out = { scene: o.scene, id: rg.id, start: rg.start, end: rg.end, focus: describe(rg.focus), problems: r.problems.slice(), warnings: r.warnings.slice() };
      if (!r.box) {
        if (!out.problems.length) out.problems.push("no box for ring");
        out.ok = false;
        return out;
      }
      out.box = Kit.camera.grow(r.box, rg.pad != null ? rg.pad : 6);
      // the camera framing in force when the ring appears
      let k = null;
      keyframes.forEach((kf) => {
        if (kf.t <= rg.start + 1e-6) k = kf;
      });
      if (!k || !k.fit) out.problems.push("no camera keyframe before the ring");
      else {
        if (rg.start < k.hold[0] - 1e-6) out.warnings.push("ring appears while the camera is still moving");
        const rect = Kit.camera.project(k.fit, out.box);
        out.rect = rect;
        if (!Kit.camera.inside(rect, k.safe)) out.problems.push("ring is outside the safe area under shot " + k.i + " (" + k.focus + ")");
      }
      out.ok = !out.problems.length;
      return out;
    });
    return { scene: o.scene, duration, keyframes, rings };
  }

  function hostOf(id) {
    const all = document.querySelectorAll('[data-composition-id="' + id + '"]');
    return all.length ? all[0] : null;
  }

  function readJSON(root, sel) {
    const el = root.querySelector(sel);
    if (!el) return null;
    try {
      return JSON.parse(el.textContent);
    } catch (e) {
      Kit.warn("bad JSON in " + sel + ": " + e.message);
      return null;
    }
  }

  function ringsFromDom(root) {
    return Array.prototype.map.call(root.querySelectorAll(".kit-ring[data-kit-focus]"), (el) => {
      const start = parseFloat(el.getAttribute("data-start")) || 0;
      const dur = parseFloat(el.getAttribute("data-duration")) || 1;
      let focus = el.getAttribute("data-kit-focus");
      if (focus && focus.trim().charAt(0) === "[") focus = JSON.parse(focus);
      return { el, id: el.id, start, end: start + dur, focus, pad: el.hasAttribute("data-kit-pad") ? parseFloat(el.getAttribute("data-kit-pad")) : 6 };
    });
  }

  function footage(o) {
    const tl = o.tl;
    const host = o.root ? (typeof o.root === "string" ? document.querySelector(o.root) : o.root) : hostOf(o.id);
    if (!host) {
      Kit.warn("scene " + o.id + ": root not found");
      return null;
    }
    const cam = o.cam ? (typeof o.cam === "string" ? host.querySelector(o.cam) : o.cam) : host.querySelector(".kit-cam");
    const shots = o.shots || readJSON(host, "script.kit-shots") || [];
    const duration = o.duration != null ? o.duration : parseFloat(host.getAttribute("data-duration")) || undefined;
    const sceneClips = Kit.clips.fromDom(host);
    const rings = ringsFromDom(host);
    const p = plan({ scene: o.id, shots, sceneClips, duration, rings });

    p.keyframes.forEach((k, i) => {
      if (!k.fit) return;
      if (i === 0) tl.set(cam, Object.assign({ transformOrigin: "0 0" }, k.fit), 0);
      if (i === 0 && shots[0].t <= 0) return;
      const s = shots[i];
      if (s.cut || k.dur === 0) tl.set(cam, k.fit, k.t);
      else tl.to(cam, Object.assign({ duration: k.dur, ease: s.ease || "power2.inOut" }, k.fit), k.t);
    });

    rings.forEach((rg, i) => {
      const pr = p.rings[i];
      if (!pr.box) return;
      let box = rg.el.querySelector(".kit-ring-box");
      if (!box) {
        box = document.createElement("div");
        box.className = "kit-ring-box";
        rg.el.appendChild(box);
      }
      box.style.left = pr.box.x + "px";
      box.style.top = pr.box.y + "px";
      box.style.width = pr.box.w + "px";
      box.style.height = pr.box.h + "px";
      tl.fromTo(rg.el, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "power2.out" }, rg.start);
      tl.fromTo(box, { scale: 1.06 }, { scale: 1, duration: 0.4, ease: "expo.out" }, rg.start);
      tl.to(rg.el, { opacity: 0, duration: 0.15, ease: "power2.in" }, Math.max(rg.start + 0.3, rg.end - 0.17));
    });

    g.__kitShots = (g.__kitShots || []).concat(p.keyframes, p.rings);
    p.keyframes.concat(p.rings).forEach((k) => {
      if (!k.ok) Kit.warn(o.id + " " + (k.id || "shot " + k.i) + ": " + k.problems.join("; "));
    });
    return p;
  }

  Kit.scene = { plan, footage, resolve };
  if (typeof module === "object" && module.exports) module.exports = Kit;
})(typeof window !== "undefined" ? window : globalThis);

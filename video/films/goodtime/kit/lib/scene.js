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
 *   maxZoom, zoom, minZoom, pad, margin, align, fill, edge   -> Kit.camera.fit options
 *             (edge, kit 1.1.1: {"left": 859} puts footage x 859, e.g. a column gutter, on the frame edge)
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
 * Spotlight (kit 2, launch format), in the scene markup inside .kit-cam, after the footage:
 *   <div id="hero-spot-form" class="clip kit-spot" data-start="0.3" data-duration="4.2" data-kit-focus="setup"
 *        data-kit-pad="10" data-track-index="2" data-layout-allow-overlap data-layout-allow-occlusion>
 *     <div class="kit-spot-box"></div></div>
 *   Everything outside the component's box (unioned over the spotlight's own window) is dimmed flat; planned
 *   and checked like a ring (it must sit inside the safe area). class "bare" = no outline.
 *   data-kit-window="a,b" (rings too): union the box over these scene seconds instead, e.g. the form as it is
 *   before a click, while the spotlight stays on until the footage shows the change (~0.1-0.3 s after the DOM).
 *
 * Annotations (kit 1.1; see lib/annotate.js), in the scene markup OUTSIDE .kit-stage (screen space):
 *   <div id="r2-ann-route" class="clip kit-ann" data-start="11.2" data-duration="3" data-kit-focus="finalRoute"
 *        data-track-index="3" data-layout-allow-overlap data-layout-allow-occlusion>
 *     <div class="kit-ann-label">Rules overrule the model</div></div>
 *   Ring + label (<= 6 words), placed inside the safe area beside the component, never over the shot's
 *   focus box or the caption band; it must sit inside one camera hold (the camera does not move under it).
 *
 * Kit.scene.footage({id, tl, duration?, shots?, root?, cam?}) -> plan   (call in the scene script)
 * Kit.scene.plan({scene, shots, sceneClips, duration, rings?, cues?, annotations?})   (pure; QA calls this in Node)
 *   annotations: [{id, start, end, focus, pad, side, text}] -> plan.annotations [{ring, label, leader, focusRect, ok, problems}]
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
        focusSpec: s.focus,
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
        if (f.edgeIgnored && f.edgeIgnored.length) k.warnings.push("edge " + f.edgeIgnored.join("/") + " ignored: the focus would leave the safe area (lower the zoom or move the edge)");
        // kit 2: a capture narrower than 1920 px is already magnified on the stage (clip.stageScale)
        const first = sceneClips.length ? Kit.clips.get((Kit.clips.mediaAt(sceneClips, Math.min(h0, h1) + 0.001) || sceneClips[0]).clip) : null;
        k.stageScale = (first && first.stageScale) || 1;
        k.mag = +(f.scale * k.stageScale).toFixed(3);
        k.wide = !!s.wide;
        if (k.mag < 1 && !s.partial) k.warnings.push("zoom " + f.scale + " < 1: footage is shown smaller than captured");
      } else if (!k.problems.length) k.problems.push("no box to frame");
      if (!k.captions && o.cues)
        o.cues.forEach((c) => {
          if (overlaps(h0, h1, c.start, c.end)) k.problems.push("captions:false but caption '" + (c.id || "?") + "' is on screen during the hold");
        });
      k.ok = !k.problems.length;
      keyframes.push(k);
    });

    const rings = (o.rings || []).map((rg) => {
      // rg.window (kit 2, data-kit-window="a,b"): take the box from these scene seconds instead of the whole time
      // on screen, e.g. the state before a click while the spotlight stays on until the footage shows the change
      const r = resolve(rg.focus, sceneClips, rg.window ? rg.window[0] : rg.start, rg.window ? rg.window[1] : rg.end);
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
    const annotations = (o.annotations || []).map((an) => planAnnotation(o, an, keyframes, sceneClips));
    return { scene: o.scene, duration, keyframes, rings, annotations };
  }

  // tracked components in frame during an annotation, other than its target, the shot's focus and
  // anything that contains the ring (sections, cards around it) or fills most of the frame
  function neighbours(an, sceneClips, k, ring) {
    const own = focusList(an.focus).concat(focusList(k.focusSpec)).filter((x) => typeof x === "string").map((x) => x.split("@")[0]);
    const out = [];
    const seen = {};
    const area = k.safe.w * k.safe.h;
    [an.start + 0.001, (an.start + an.end) / 2, an.end - 0.001].forEach((t) => {
      const at = Kit.clips.mediaAt(sceneClips, t);
      const c = at && Kit.clips.get(at.clip);
      if (!c || !c.boxes) return;
      Object.keys(c.boxes).forEach((name) => {
        if (own.indexOf(name) >= 0) return;
        const b = Kit.clips.boxAt(c, name, at.m);
        if (!b) return;
        const r = Kit.camera.project(k.fit, b);
        if (r.x <= ring.x + 1 && r.y <= ring.y + 1 && r.x + r.w >= ring.x + ring.w - 1 && r.y + r.h >= ring.y + ring.h - 1) return;
        if (r.w * r.h > 0.5 * area) return;
        if (r.x > 1920 || r.y > 1080 || r.x + r.w < 0 || r.y + r.h < 0) return;
        const key = name + Math.round(r.x) + "," + Math.round(r.y);
        if (seen[key]) return;
        seen[key] = 1;
        out.push({ name, rect: r });
      });
    });
    return out;
  }

  function planAnnotation(o, an, keyframes, sceneClips) {
    const text = Kit.text ? Kit.text.plain(an.text || "") : String(an.text || "");
    const words = Kit.text ? Kit.text.words(text) : text.split(/\s+/).filter(Boolean).length;
    const out = { scene: o.scene, id: an.id, start: an.start, end: an.end, focus: describe(an.focus), text, words, problems: [], warnings: [] };
    const r = resolve(an.focus, sceneClips, an.start, an.end);
    out.problems.push.apply(out.problems, r.problems);
    out.warnings.push.apply(out.warnings, r.warnings);
    if (!text) out.problems.push("annotation without a label (.kit-ann-label)");
    const maxWords = Kit.text ? Kit.text.ANN.maxWords : 6;
    if (words > maxWords) out.problems.push(`label is ${words} words (max ${maxWords})`);
    if (Kit.text) {
      const need = Kit.text.readingTime(words);
      out.reading = need;
      if (an.end - an.start < need - 1e-6) out.problems.push(`on screen ${(an.end - an.start).toFixed(2)} s, reading time ${need.toFixed(2)} s (0.6 + 0.35 x ${words} words)`);
    }
    if (!r.box) {
      if (!out.problems.length) out.problems.push("no box for the annotation");
      out.ok = false;
      return out;
    }
    let k = null;
    keyframes.forEach((kf) => {
      if (kf.t <= an.start + 1e-6) k = kf;
    });
    if (!k || !k.fit) {
      out.problems.push("no camera keyframe before the annotation");
      out.ok = false;
      return out;
    }
    out.shot = k.i;
    if (an.start < k.hold[0] - 1e-6) out.problems.push(`appears at ${an.start.toFixed(2)} s while the camera still moves (hold starts ${k.hold[0].toFixed(2)} s)`);
    if (an.end > k.hold[1] + 1e-6) out.problems.push(`stays on until ${an.end.toFixed(2)} s but the camera moves at ${k.hold[1].toFixed(2)} s (keep it inside one hold)`);
    const box = Kit.camera.grow(r.box, an.pad != null ? an.pad : 6);
    const ring = Kit.camera.project(k.fit, box);
    out.ring = { x: Math.round(ring.x), y: Math.round(ring.y), w: Math.round(ring.w), h: Math.round(ring.h) };
    out.safe = k.safe;
    out.focusRect = k.rect;
    if (!Kit.camera.inside(ring, k.safe)) out.problems.push(`ring is outside the safe area under shot ${k.i} (${k.focus})`);
    const size = Kit.text ? Kit.text.annSize(text) : { w: 24 * text.length, h: 58 };
    // the label never covers the shot's focus box (nor the ring, nor the band: the safe area ends above it);
    // it prefers whitespace: first try clear of every other tracked component in frame
    const soft = neighbours(an, sceneClips, k, ring);
    let p = Kit.annotate ? Kit.annotate.place({ ring: out.ring, focus: k.rect, safe: k.safe, size, side: an.side, avoid: soft.map((n) => n.rect) }) : null;
    if (!p && Kit.annotate) {
      p = Kit.annotate.place({ ring: out.ring, focus: k.rect, safe: k.safe, size, side: an.side });
      if (p) {
        const hit = soft.filter((n) => Kit.annotate.overlap(p.rect, n.rect)).map((n) => n.name);
        if (hit.length) out.warnings.push(`label covers ${hit.join(", ")} (no clear space): lower the shot's maxZoom or pick data-kit-side`);
      }
    }
    if (!p) out.problems.push(`no room for the label (${size.w}x${size.h}) beside the ring or outside the focus box inside the safe area: lower the shot's maxZoom, pick another side, or shorten it`);
    else {
      out.label = p.rect;
      out.side = p.side;
      out.anchor = p.anchor;
      out.leader = p.leader;
    }
    out.ok = !out.problems.length;
    return out;
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
    // kit 2: a spotlight (.kit-spot) is planned exactly like a ring; only its box class and default pad differ
    return Array.prototype.map.call(root.querySelectorAll(".kit-ring[data-kit-focus], .kit-spot[data-kit-focus]"), (el) => {
      const start = parseFloat(el.getAttribute("data-start")) || 0;
      const dur = parseFloat(el.getAttribute("data-duration")) || 1;
      const spot = el.classList.contains("kit-spot");
      let focus = el.getAttribute("data-kit-focus");
      if (focus && focus.trim().charAt(0) === "[") focus = JSON.parse(focus);
      const win = (el.getAttribute("data-kit-window") || "").split(",").map(Number);
      return { el, id: el.id, start, end: start + dur, focus, spot, window: win.length === 2 && win.every(Number.isFinite) ? win : null, pad: el.hasAttribute("data-kit-pad") ? parseFloat(el.getAttribute("data-kit-pad")) : spot ? 10 : 6 };
    });
  }

  function annotationsFromDom(root) {
    return Array.prototype.map.call(root.querySelectorAll(".kit-ann[data-kit-focus]"), (el) => {
      const start = parseFloat(el.getAttribute("data-start")) || 0;
      const dur = parseFloat(el.getAttribute("data-duration")) || 1;
      let focus = el.getAttribute("data-kit-focus");
      if (focus && focus.trim().charAt(0) === "[") focus = JSON.parse(focus);
      const lab = el.querySelector(".kit-ann-label");
      return {
        el,
        id: el.id,
        start,
        end: start + dur,
        focus,
        pad: el.hasAttribute("data-kit-pad") ? parseFloat(el.getAttribute("data-kit-pad")) : 6,
        side: el.getAttribute("data-kit-side") || "auto",
        text: lab ? lab.textContent : "",
      };
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
    const anns = annotationsFromDom(host);
    const p = plan({ scene: o.id, shots, sceneClips, duration, rings, annotations: anns });

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
      const boxClass = rg.spot ? "kit-spot-box" : "kit-ring-box";
      let box = rg.el.querySelector("." + boxClass);
      if (!box) {
        box = document.createElement("div");
        box.className = boxClass;
        rg.el.appendChild(box);
      }
      box.style.left = pr.box.x + "px";
      box.style.top = pr.box.y + "px";
      box.style.width = pr.box.w + "px";
      box.style.height = pr.box.h + "px";
      if (rg.spot) {
        // a spotlight that starts or ends on a hard cut, the scene edge or another spotlight switches with it
        // (no bright flash between shots); elsewhere it fades
        const cuts = p.keyframes.filter((k) => k.dur === 0).map((k) => k.t).concat([0, p.duration]);
        const near = (t, list) => list.some((x) => Math.abs(x - t) < 0.07);
        const others = rings.filter((o) => o !== rg && o.spot);
        const hardIn = near(rg.start, cuts) || near(rg.start, others.map((o) => o.end));
        const hardOut = near(rg.end, cuts) || near(rg.end, others.map((o) => o.start));
        if (hardIn) tl.set(rg.el, { opacity: 1 }, rg.start);
        else tl.fromTo(rg.el, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power2.out" }, rg.start);
        if (!hardOut) tl.to(rg.el, { opacity: 0, duration: 0.15, ease: "power2.in" }, Math.max(rg.start + 0.3, rg.end - 0.17));
        return;
      }
      tl.fromTo(rg.el, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "power2.out" }, rg.start);
      tl.fromTo(box, { scale: 1.06 }, { scale: 1, duration: 0.4, ease: "expo.out" }, rg.start);
      tl.to(rg.el, { opacity: 0, duration: 0.15, ease: "power2.in" }, Math.max(rg.start + 0.3, rg.end - 0.17));
    });

    anns.forEach((an, i) => {
      const pa = p.annotations[i];
      if (pa && pa.label && Kit.annotate) Kit.annotate.render(tl, an.el, pa);
      else if (an.el) tl.set(an.el, { opacity: 0 }, 0);
    });

    g.__kitShots = (g.__kitShots || []).concat(p.keyframes, p.rings, p.annotations);
    p.keyframes.concat(p.rings, p.annotations).forEach((k) => {
      if (!k.ok) Kit.warn(o.id + " " + (k.id || "shot " + k.i) + ": " + k.problems.join("; "));
    });
    return p;
  }

  Kit.scene = { plan, footage, resolve };
  if (typeof module === "object" && module.exports) module.exports = Kit;
})(typeof window !== "undefined" ? window : globalThis);

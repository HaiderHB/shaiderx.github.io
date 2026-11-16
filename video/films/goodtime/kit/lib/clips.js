/*
 * kit/lib/clips.js — recorded clip data (DOM boxes, marks, events) and scene-time -> media-time.
 *
 * Clip data lives in films/<slug>/data/clips/<clip>.json and, for the page, in data/clips.js
 * (window.KIT_CLIPS = {<clip>: {...}}), both written by kit/scripts/build-footage.mjs:
 *   { name, source: "dom" | "frame" | "manual", width, height, duration,
 *     marks:  [{label, t}],
 *     boxes:  {<component>: [{t, x, y, w, h} | {t, absent: true}]},   // sample-and-hold, media seconds
 *     events: [{type: "click" | "scroll" | "cursor" | ..., t, ...}] }
 *
 * In a scene, every footage element names its clip:
 *   <video class="clip kit-footage" data-kit-clip="s2" data-start data-duration data-media-start data-playback-rate>
 *   <img   class="clip kit-footage" data-kit-clip="s2" data-kit-media-time="31.2" ...>   (a held frame)
 *
 * Kit.clips.get(name)                        clip data from window.KIT_CLIPS (or Kit.clips.registry)
 * Kit.clips.mark(clip, label)                media time of a mark
 * Kit.clips.boxAt(clip, component, m)        box at media time m (null if absent / unknown)
 * Kit.clips.boxesIn(clip, component, m0, m1) every box sample shown during [m0, m1]
 * Kit.clips.fromAttrs(list)                  normalise footage attributes -> [{id, clip, start, end, mediaStart, rate, still}]
 * Kit.clips.fromDom(root)                    the same, read from the elements with data-kit-clip under root
 * Kit.clips.segments(sceneClips, t0, t1)     -> [{clip, m0, m1, id}] media ranges shown during scene [t0, t1)
 * Kit.clips.mediaAt(sceneClips, t)           -> {clip, m} or null
 * Kit.clips.outside(box, clip)               true if the box extends past the captured viewport
 */
(function (g) {
  const Kit = (g.Kit = g.Kit || {});
  const registry = {};

  function get(name) {
    if (registry[name]) return registry[name];
    if (g.KIT_CLIPS && g.KIT_CLIPS[name]) return g.KIT_CLIPS[name];
    return null;
  }

  function mark(clip, label) {
    const c = typeof clip === "string" ? get(clip) : clip;
    const m = c && (c.marks || []).find((x) => x.label === label);
    return m ? m.t : null;
  }

  function series(c, component) {
    if (!c || !c.boxes || !c.boxes[component]) return null;
    return c.boxes[component];
  }

  function boxAt(clip, component, m) {
    const c = typeof clip === "string" ? get(clip) : clip;
    const s = series(c, component);
    if (!s || !s.length) return null;
    let cur = s[0];
    for (let i = 0; i < s.length; i++) {
      if (s[i].t <= m + 1e-6) cur = s[i];
      else break;
    }
    return cur.absent ? null : { x: cur.x, y: cur.y, w: cur.w, h: cur.h };
  }

  function boxesIn(clip, component, m0, m1) {
    const c = typeof clip === "string" ? get(clip) : clip;
    const s = series(c, component);
    if (!s || !s.length) return [];
    const out = [];
    let first = 0;
    for (let i = 0; i < s.length; i++) if (s[i].t <= m0 + 1e-6) first = i;
    for (let i = first; i < s.length; i++) {
      if (i > first && s[i].t >= m1 - 1e-6) break;
      out.push(s[i]);
    }
    return out;
  }

  function num(v, d) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : d;
  }

  function fromAttrs(list) {
    return list
      .filter((a) => a["data-kit-clip"])
      .map((a) => {
        const start = num(a["data-start"], 0);
        const duration = num(a["data-duration"], 3);
        const still = a["data-kit-media-time"] != null ? num(a["data-kit-media-time"], 0) : null;
        return {
          id: a.id || null,
          clip: a["data-kit-clip"],
          start,
          end: start + duration,
          mediaStart: num(a["data-media-start"], 0),
          rate: num(a["data-playback-rate"], 1),
          still,
        };
      });
  }

  function fromDom(root) {
    const els = (root || document).querySelectorAll("[data-kit-clip]");
    return fromAttrs(
      Array.prototype.map.call(els, (el) => {
        const a = { id: el.id };
        Array.prototype.forEach.call(el.attributes, (at) => (a[at.name] = at.value));
        return a;
      })
    );
  }

  function toMedia(sc, t) {
    if (sc.still != null) return sc.still;
    return sc.mediaStart + (t - sc.start) * sc.rate;
  }

  function segments(sceneClips, t0, t1) {
    const out = [];
    sceneClips.forEach((sc) => {
      const a = Math.max(t0, sc.start);
      const b = Math.min(t1, sc.end);
      if (b > a + 1e-6) out.push({ clip: sc.clip, id: sc.id, m0: toMedia(sc, a), m1: toMedia(sc, b), t0: a, t1: b });
    });
    return out;
  }

  function mediaAt(sceneClips, t) {
    let hit = null;
    sceneClips.forEach((sc) => {
      if (t >= sc.start - 1e-6 && t < sc.end - 1e-6) hit = { clip: sc.clip, m: toMedia(sc, t), id: sc.id };
    });
    return hit;
  }

  function outside(box, clip) {
    const c = typeof clip === "string" ? get(clip) : clip;
    const W = (c && c.width) || 1920;
    const H = (c && c.height) || 1080;
    return box.x < -0.5 || box.y < -0.5 || box.x + box.w > W + 0.5 || box.y + box.h > H + 0.5;
  }

  Kit.clips = { registry, get, mark, boxAt, boxesIn, fromAttrs, fromDom, segments, mediaAt, outside, toMedia };
  if (typeof module === "object" && module.exports) module.exports = Kit;
})(typeof window !== "undefined" ? window : globalThis);

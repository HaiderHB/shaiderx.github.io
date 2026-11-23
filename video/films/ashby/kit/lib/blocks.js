/*
 * kit/lib/blocks.js — shared helpers for kit blocks (cold open, title, next steps, end card).
 *
 * Kit.blocks.vars(rootEl, id)    this mount's variables: the runtime's per-composition map
 *                                (declared defaults + host data-variable-values), else getVariables()
 * Kit.blocks.rich(el, text)      set text; *word* becomes <span class="hi">word</span> (the one cyan word)
 * Kit.blocks.parseFocus(str)     "email" | "email,runButton" | "x,y,w,h" -> focus spec for Kit.scene
 * Kit.blocks.coldOpenShots(v, duration) -> shot list used by blocks/cold-open.html AND by QA
 *     v.focus (string, see parseFocus), v.clip (default "hook"), v.zoom (default 1.5),
 *     v.push (default 0.06: the slow push-in, as a fraction of the zoom)
 */
(function (g) {
  const Kit = (g.Kit = g.Kit || {});

  function vars(rootEl, id) {
    id = id || (rootEl && rootEl.getAttribute("data-composition-id"));
    const defaults = {};
    try {
      const decl = JSON.parse((rootEl && rootEl.getAttribute("data-composition-variables")) || "[]");
      decl.forEach((d) => (defaults[d.id] = d.default));
    } catch (e) {
      Kit.warn("bad data-composition-variables: " + e.message);
    }
    // the runtime keeps each mount's {...declared defaults, ...host values} here
    const byComp = g.__hfVariablesByComp || {};
    if (id && byComp[id]) return Object.assign({}, defaults, byComp[id]);
    let mounted = {};
    try {
      if (g.__hyperframes && g.__hyperframes.getVariables) mounted = g.__hyperframes.getVariables() || {};
    } catch (e) {
      mounted = {};
    }
    return Object.assign({}, defaults, mounted);
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  }

  function rich(el, text) {
    if (!el) return;
    el.innerHTML = esc(text == null ? "" : text).replace(/\*([^*]+)\*/g, '<span class="hi">$1</span>');
  }

  function parseFocus(str) {
    const s = String(str || "").trim();
    const nums = s.split(",").map(Number);
    if (nums.length === 4 && nums.every(Number.isFinite)) return { x: nums[0], y: nums[1], w: nums[2], h: nums[3] };
    const names = s.split(",").map((x) => x.trim()).filter(Boolean);
    return names.length === 1 ? names[0] : names;
  }

  function coldOpenShots(v, duration) {
    const zoom = v.zoom != null && v.zoom !== "" ? Number(v.zoom) : 1.5;
    const push = v.push != null && v.push !== "" ? Number(v.push) : 0.06;
    const focus = parseFocus(v.focus);
    const align = v.align || "center";
    return [
      { t: 0, focus, zoom: +(zoom * (1 - push)).toFixed(4), align, cut: true, window: [0, duration], label: "cold open" },
      { t: 0.001, focus, zoom, align, dur: Math.max(0.2, duration - 0.05), ease: "none", window: [0, duration], label: "cold open push-in" },
    ];
  }

  Kit.blocks = { vars, rich, parseFocus, coldOpenShots };
  if (typeof module === "object" && module.exports) module.exports = Kit;
})(typeof window !== "undefined" ? window : globalThis);

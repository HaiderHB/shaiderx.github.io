/*
 * kit/lib/reveal.js — text arrivals in the house style (blur 8 px -> 0, no slide-ups).
 *
 * Kit.reveal.split(el)                         wrap each word of el in <span class="kit-w">, keeping
 *                                              inner markup (e.g. <span class="hi">); idempotent
 * Kit.reveal.words(tl, el, at, {stagger = 0.07, dur = 0.16, blur = 8, firstOpacity = 0})
 *                                              word-by-word blur-in; returns the time the last word lands
 * Kit.reveal.blurIn(tl, targets, at, {dur = 0.2, blur = 8, ease = "expo.out"})
 * Kit.reveal.blurOut(tl, targets, at, {dur = 0.18, blur = 8, stagger = 0.03})
 * Kit.reveal.fadeIn(tl, targets, at, dur = 0.25) / fadeOut(tl, targets, at, dur = 0.15)
 */
(function (g) {
  const Kit = (g.Kit = g.Kit || {});

  function split(el) {
    if (!el || el.getAttribute("data-kit-split") === "1") return el ? el.querySelectorAll(".kit-w") : [];
    const walk = (node) => {
      Array.prototype.slice.call(node.childNodes).forEach((ch) => {
        if (ch.nodeType === 3) {
          const parts = ch.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) frag.appendChild(document.createTextNode(" "));
            else {
              const s = document.createElement("span");
              s.className = "kit-w";
              s.textContent = p;
              frag.appendChild(s);
            }
          });
          node.replaceChild(frag, ch);
        } else if (ch.nodeType === 1 && !ch.classList.contains("kit-w")) walk(ch);
      });
    };
    walk(el);
    el.setAttribute("data-kit-split", "1");
    return el.querySelectorAll(".kit-w");
  }

  function words(tl, el, at, o) {
    o = o || {};
    const ws = split(typeof el === "string" ? document.querySelector(el) : el);
    const stagger = o.stagger != null ? o.stagger : 0.07;
    const dur = o.dur != null ? o.dur : 0.16;
    const blur = o.blur != null ? o.blur : 8;
    Array.prototype.forEach.call(ws, (w, i) => {
      const first = i === 0 && o.firstOpacity ? o.firstOpacity : 0;
      tl.fromTo(
        w,
        { opacity: first, filter: "blur(" + (first ? blur / 2 : blur) + "px)" },
        { opacity: 1, filter: "blur(0px)", duration: dur, ease: "power3.out" },
        at + i * stagger
      );
    });
    return at + Math.max(0, ws.length - 1) * stagger + dur;
  }

  function blurIn(tl, targets, at, o) {
    o = o || {};
    const blur = o.blur != null ? o.blur : 8;
    tl.fromTo(targets, { opacity: 0, filter: "blur(" + blur + "px)" }, { opacity: 1, filter: "blur(0px)", duration: o.dur || 0.2, ease: o.ease || "expo.out", stagger: o.stagger || 0 }, at);
  }

  function blurOut(tl, targets, at, o) {
    o = o || {};
    const blur = o.blur != null ? o.blur : 8;
    tl.to(targets, { opacity: 0, filter: "blur(" + blur + "px)", duration: o.dur || 0.18, ease: "power3.in", stagger: o.stagger != null ? o.stagger : 0.03 }, at);
  }

  function fadeIn(tl, targets, at, dur) {
    tl.fromTo(targets, { opacity: 0 }, { opacity: 1, duration: dur || 0.25, ease: "power2.out" }, at);
  }
  function fadeOut(tl, targets, at, dur) {
    tl.to(targets, { opacity: 0, duration: dur || 0.15, ease: "power2.in" }, at);
  }

  Kit.reveal = { split, words, blurIn, blurOut, fadeIn, fadeOut };
  if (typeof module === "object" && module.exports) module.exports = Kit;
})(typeof window !== "undefined" ? window : globalThis);

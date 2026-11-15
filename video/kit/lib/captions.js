/*
 * kit/lib/captions.js — animates a caption band composition written as plain timed cues.
 * Timing lives only in the HTML (data-start / data-duration), so Studio edits stay the truth.
 *
 * v2 cue (kit 1.1, text-first films: the band carries the whole story; see kit/components/caption-band.html)
 *   <div id="cap-band" class="clip" data-start="0" data-duration="44" data-layout-ignore><div class="kit-band kit-band2"></div></div>
 *   <div id="cap-progress" class="clip kit-progress" data-start="0" data-duration="44"
 *        data-kit-steps="Email,Extract,Check,Decide,Reply,Evals,MCP" data-layout-ignore></div>
 *   <div id="cap-check" class="clip kit-cap kit-cap2" data-start="7.9" data-duration="4.2" data-kit-step="3">
 *     <div class="kit-cap-kicker"><span>Step 3 · Check</span>
 *       <span class="kit-speed" data-rate="6" data-tag-start="7.9" data-tag-end="9.5">6x</span></div>
 *     <div class="kit-cap-head">Seven tools check it against the *ERP*</div>        (<= ~10 words, one line)
 *     <div class="kit-cap-detail">Stock, license, credit and price: code, not the model.</div>  (optional, <= ~14 words)
 *   </div>
 *   kicker blurs in at the cue start, head at +0.06 s, detail at +0.15 s; the cue fades out at end - 0.16 s.
 *   *word* in the head (or detail) becomes the accent word. data-kit-step (1-based) lights that step of
 *   the .kit-progress stepper while the cue is on (past steps ink, current accent, later steps faint).
 *   Reading time (QA, fail): on screen >= 0.6 s + 0.35 s per word of head + detail + honesty chips.
 *
 * v1 cue (kit 1.0, still supported): .kit-cap > .kit-cap-label / .kit-cap-main / .kit-cap-note
 *
 * Kit.captions.animate(tl, rootOrId) -> cues [{id, start, end, step, speeds: [{rate, start, end, text}]}]
 *   tags (.kit-speed / .kit-chip / .kit-tag): shown for the cue, or for [data-tag-start, data-tag-end)
 *   band (.kit-band inside a timed wrapper): fades in at its start, out before its end
 * Kit.captions.accent(el) turns *word* into <span class="hi">word</span> (idempotent)
 * QA rule: every footage clip with data-playback-rate != 1 must be covered by a .kit-speed tag whose
 * text shows that rate ("6x"), in the caption band or in the scene itself.
 */
(function (g) {
  const Kit = (g.Kit = g.Kit || {});

  function rootOf(r) {
    if (typeof r !== "string") return r;
    return document.querySelector('[data-composition-id="' + r + '"]') || document.querySelector(r);
  }

  function accent(el) {
    if (!el || el.getAttribute("data-kit-accented") === "1") return;
    const walk = (node) => {
      Array.prototype.slice.call(node.childNodes).forEach((ch) => {
        if (ch.nodeType === 3 && /\*[^*]+\*/.test(ch.textContent)) {
          const span = document.createElement("span");
          span.innerHTML = ch.textContent
            .replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c])
            .replace(/\*([^*]+)\*/g, '<span class="hi">$1</span>');
          while (span.firstChild) node.insertBefore(span.firstChild, ch);
          node.removeChild(ch);
        } else if (ch.nodeType === 1) walk(ch);
      });
    };
    walk(el);
    el.setAttribute("data-kit-accented", "1");
  }

  function buildProgress(el) {
    const steps = (el.getAttribute("data-kit-steps") || "")
      .split(/[,|]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (el.getAttribute("data-kit-built") !== "1") {
      el.innerHTML = "";
      const count = document.createElement("span");
      count.className = "kit-progress-count";
      steps.forEach((name, i) => {
        const n = document.createElement("span");
        n.className = "kit-progress-n";
        n.setAttribute("data-i", String(i + 1));
        n.textContent = i + 1 + " / " + steps.length;
        count.appendChild(n);
      });
      el.appendChild(count);
      const bar = document.createElement("span");
      bar.className = "kit-progress-bar";
      steps.forEach((name, i) => {
        const s = document.createElement("span");
        s.className = "kit-progress-seg";
        s.setAttribute("data-i", String(i + 1));
        s.setAttribute("data-state", "next");
        s.setAttribute("title", name);
        bar.appendChild(s);
      });
      el.appendChild(bar);
      el.setAttribute("data-kit-built", "1");
    }
    return steps;
  }

  function setStep(tl, el, step, at) {
    Array.prototype.forEach.call(el.querySelectorAll(".kit-progress-seg"), (s) => {
      const i = +s.getAttribute("data-i");
      tl.set(s, { attr: { "data-state": i < step ? "done" : i === step ? "now" : "next" } }, at);
    });
    Array.prototype.forEach.call(el.querySelectorAll(".kit-progress-n"), (n) => {
      tl.set(n, { opacity: +n.getAttribute("data-i") === step ? 1 : 0 }, at);
    });
  }

  function animate(tl, r) {
    const root = rootOf(r);
    const cues = [];
    if (!root) return cues;
    Array.prototype.forEach.call(root.querySelectorAll(".kit-band"), (band) => {
      const w = band.closest(".clip");
      const s = w ? parseFloat(w.getAttribute("data-start")) || 0 : 0;
      const d = w ? parseFloat(w.getAttribute("data-duration")) || 0 : 0;
      tl.fromTo(band, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" }, s + 0.05);
      if (d) tl.to(band, { opacity: 0, duration: 0.25, ease: "power2.in" }, s + d - 0.27);
    });
    Array.prototype.forEach.call(root.querySelectorAll(".kit-cap.clip"), (cap) => {
      const start = parseFloat(cap.getAttribute("data-start")) || 0;
      const end = start + (parseFloat(cap.getAttribute("data-duration")) || 0);
      const v2 = cap.classList.contains("kit-cap2");
      const lab = cap.querySelector(v2 ? ".kit-cap-kicker" : ".kit-cap-label");
      const main = cap.querySelector(v2 ? ".kit-cap-head" : ".kit-cap-main");
      const note = cap.querySelector(v2 ? ".kit-cap-detail" : ".kit-cap-note");
      if (v2) {
        accent(main);
        accent(note);
      }
      if (lab) tl.fromTo(lab, { opacity: 0, filter: "blur(8px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.2, ease: "expo.out" }, start);
      if (main) tl.fromTo(main, { opacity: 0, filter: "blur(8px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.22, ease: "expo.out" }, start + 0.06);
      if (note) {
        if (v2) tl.fromTo(note, { opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.22, ease: "expo.out" }, start + 0.15);
        else tl.fromTo(note, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" }, start + 0.4);
      }
      const speeds = [];
      Array.prototype.forEach.call(cap.querySelectorAll(".kit-speed, .kit-chip, .kit-tag"), (tag) => {
        const ts = tag.hasAttribute("data-tag-start") ? parseFloat(tag.getAttribute("data-tag-start")) : start;
        const te = tag.hasAttribute("data-tag-end") ? parseFloat(tag.getAttribute("data-tag-end")) : end;
        if (ts > start + 0.01) {
          tl.fromTo(tag, { opacity: 0 }, { opacity: 1, duration: 0.15, ease: "power2.out" }, ts);
        }
        if (te < end - 0.01) tl.to(tag, { opacity: 0, duration: 0.12, ease: "power2.in" }, te - 0.12);
        if (tag.classList.contains("kit-speed")) speeds.push({ rate: parseFloat(tag.getAttribute("data-rate")), start: ts, end: te, text: tag.textContent.trim() });
      });
      tl.to(cap, { opacity: 0, duration: 0.14, ease: "power2.in" }, end - 0.16);
      const step = cap.hasAttribute("data-kit-step") ? parseInt(cap.getAttribute("data-kit-step"), 10) : null;
      cues.push({ id: cap.id, start, end, step, speeds });
    });
    // progress stepper: follows data-kit-step of the cues (holds the last step through gaps)
    Array.prototype.forEach.call(root.querySelectorAll(".kit-progress"), (el) => {
      buildProgress(el);
      const w = el.classList.contains("clip") ? el : el.closest(".clip");
      const s = w ? parseFloat(w.getAttribute("data-start")) || 0 : 0;
      const d = w ? parseFloat(w.getAttribute("data-duration")) || 0 : 0;
      const stepped = cues.filter((c) => c.step != null).sort((a, b) => a.start - b.start);
      setStep(tl, el, stepped.length && stepped[0].start <= s + 0.05 ? stepped[0].step : 0, s);
      stepped.forEach((c) => setStep(tl, el, c.step, c.start));
      tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" }, s + 0.05);
      if (d) tl.to(el, { opacity: 0, duration: 0.25, ease: "power2.in" }, s + d - 0.27);
    });
    return cues;
  }

  Kit.captions = { animate, accent };
  if (typeof module === "object" && module.exports) module.exports = Kit;
})(typeof window !== "undefined" ? window : globalThis);

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
 * Launch cue (kit 2, films with data-kit-format="launch"; see kit/components/launch-captions.html)
 *   <div id="cap-review" class="clip kit-cap kit-cap3" data-start="16.4" data-duration="4.7">
 *     <div class="kit-cap-head">Your playbook sets the rules. Press *Review*.</div>      (ONE line, <= 8 words)
 *     <div class="kit-cap-tags"><span class="kit-chip">Example run</span></div>            (optional labels)
 *   </div>
 *   No kicker, no stepper. The headline lands with the cut (blur-in over 0.22 s from the cue start).
 *   .kit-cap3.kit-hook = the hook line (72 px, <= 7 words). .kit-cap3.kit-proof holds the proof beat instead
 *   of a headline: .kit-stats > .kit-stat (.kit-stat-n + .kit-stat-l) x 1-3 and one .kit-hood line.
 *   Reading time (QA, fail): on screen >= max(2.5, 0.5 + 0.6 x words) s and <= 7 s.
 * Chapters (kit 2): 3-4 plain labels over a thin progress bar, on for the whole film up to the end card
 *   <div id="cap-chapters" class="clip kit-chapters" data-start="0" data-duration="64.6"
 *        data-kit-chapters="Why:0|The review:16.4|No guessing:38.4|Word export:48.4" data-layout-ignore></div>
 *   name:start (captions-local seconds). Each chapter's bar fills linearly over its span; the label of the
 *   current chapter is ink, earlier ones dimmer, later ones faint.
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

  // kit 2: "Why:0|The review:16.4|…" -> [{name, start}]
  function parseChapters(str) {
    return String(str || "")
      .split("|")
      .map((part) => {
        const i = part.lastIndexOf(":");
        return i < 0 ? { name: part.trim(), start: NaN } : { name: part.slice(0, i).trim(), start: parseFloat(part.slice(i + 1)) };
      })
      .filter((c) => c.name);
  }

  function buildChapters(tl, el) {
    const w = el.classList.contains("clip") ? el : el.closest(".clip");
    const s = w ? parseFloat(w.getAttribute("data-start")) || 0 : 0;
    const d = w ? parseFloat(w.getAttribute("data-duration")) || 0 : 0;
    const list = parseChapters(el.getAttribute("data-kit-chapters"));
    if (!list.length || !d) return list;
    const GAP = 8;
    const total = (parseFloat(el.getAttribute("data-kit-width")) || 1680) - GAP * (list.length - 1);
    if (el.getAttribute("data-kit-built") !== "1") {
      el.innerHTML = "";
      list.forEach((c, i) => {
        const end = i + 1 < list.length ? list[i + 1].start : s + d;
        const node = document.createElement("span");
        node.className = "kit-chapter";
        node.setAttribute("data-state", "next");
        node.style.width = Math.max(4, (total * (end - c.start)) / d).toFixed(1) + "px";
        const lab = document.createElement("span");
        lab.className = "kit-chapter-label";
        lab.textContent = c.name;
        const track = document.createElement("span");
        track.className = "kit-chapter-track";
        const fill = document.createElement("span");
        fill.className = "kit-chapter-fill";
        track.appendChild(fill);
        node.appendChild(lab);
        node.appendChild(track);
        el.appendChild(node);
      });
      el.setAttribute("data-kit-built", "1");
    }
    const nodes = el.querySelectorAll(".kit-chapter");
    list.forEach((c, i) => {
      const end = i + 1 < list.length ? list[i + 1].start : s + d;
      const node = nodes[i];
      const fill = node.querySelector(".kit-chapter-fill");
      tl.set(node, { attr: { "data-state": c.start <= s + 0.01 ? "now" : "next" } }, s);
      if (c.start > s + 0.01) tl.set(node, { attr: { "data-state": "now" } }, c.start);
      if (i + 1 < list.length) tl.set(node, { attr: { "data-state": "done" } }, end);
      tl.fromTo(fill, { scaleX: 0 }, { scaleX: 1, duration: Math.max(0.05, end - c.start), ease: "none" }, c.start);
    });
    if (s <= 0.02) tl.set(el, { opacity: 1 }, s); // on from the first frame
    else tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" }, s + 0.02);
    return list;
  }

  function animate(tl, r) {
    const root = rootOf(r);
    const cues = [];
    if (!root) return cues;
    // kit 2: launch films cut hard, so the band is there on the first frame of its window (no fade)
    const launch = !!(Kit.launch && Kit.launch.isLaunch());
    Array.prototype.forEach.call(root.querySelectorAll(".kit-band"), (band) => {
      const w = band.closest(".clip");
      const s = w ? parseFloat(w.getAttribute("data-start")) || 0 : 0;
      const d = w ? parseFloat(w.getAttribute("data-duration")) || 0 : 0;
      if (launch) {
        tl.set(band, { opacity: 1 }, s);
        return;
      }
      tl.fromTo(band, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" }, s + 0.05);
      if (d) tl.to(band, { opacity: 0, duration: 0.25, ease: "power2.in" }, s + d - 0.27);
    });
    Array.prototype.forEach.call(root.querySelectorAll(".kit-cap.clip"), (cap) => {
      const start = parseFloat(cap.getAttribute("data-start")) || 0;
      const end = start + (parseFloat(cap.getAttribute("data-duration")) || 0);
      const v3 = cap.classList.contains("kit-cap3"); // kit 2 launch cue: headline only (or the proof stats)
      const v2 = v3 || cap.classList.contains("kit-cap2");
      const lab = cap.querySelector(v2 ? ".kit-cap-kicker" : ".kit-cap-label");
      const main = cap.querySelector(v2 ? ".kit-cap-head" : ".kit-cap-main");
      const note = cap.querySelector(v2 ? ".kit-cap-detail" : ".kit-cap-note");
      if (v2) {
        accent(main);
        accent(note);
      }
      if (lab) tl.fromTo(lab, { opacity: 0, filter: "blur(8px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.2, ease: "expo.out" }, start);
      // the hook line is crisp on frame 0 (the thumbnail); every other headline blurs in as its cut lands
      const hook = v3 && cap.classList.contains("kit-hook") && start <= 0.02;
      if (main && hook) tl.set(main, { opacity: 1, filter: "blur(0px)" }, start);
      else if (main) tl.fromTo(main, { opacity: 0, filter: "blur(8px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.22, ease: "expo.out" }, start + (v3 ? 0 : 0.06));
      if (note) {
        if (v2) tl.fromTo(note, { opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.22, ease: "expo.out" }, start + 0.15);
        else tl.fromTo(note, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" }, start + 0.4);
      }
      if (v3) {
        // proof: the numbers land one by one, then the under-the-hood line; tags row fades in with the headline
        Array.prototype.forEach.call(cap.querySelectorAll(".kit-stat"), (st, i) => {
          tl.fromTo(st, { opacity: 0, filter: "blur(8px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.24, ease: "expo.out" }, start + 0.08 + i * 0.22);
        });
        const hood = cap.querySelector(".kit-hood");
        if (hood) tl.fromTo(hood, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" }, start + 0.9);
        const tags = cap.querySelector(".kit-cap-tags");
        if (tags && hook) tl.set(tags, { opacity: 1 }, start);
        else if (tags) tl.fromTo(tags, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "power2.out" }, start + 0.12);
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
    // kit 2: chapter labels over a thin progress bar
    Array.prototype.forEach.call(root.querySelectorAll(".kit-chapters"), (el) => buildChapters(tl, el));
    return cues;
  }

  Kit.captions = { animate, accent, parseChapters };
  if (typeof module === "object" && module.exports) module.exports = Kit;
})(typeof window !== "undefined" ? window : globalThis);

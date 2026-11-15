/*
 * kit/lib/captions.js — animates a caption band composition written as plain timed cues.
 * Timing lives only in the HTML (data-start / data-duration), so Studio edits stay the truth.
 *
 * Markup (see kit/components/caption-band.html):
 *   <div id="cap-band" class="clip" data-start="0" data-duration="44" data-layout-ignore><div class="kit-band"></div></div>
 *   <div id="cap-run" class="clip kit-cap" data-start="5.7" data-duration="3.2">
 *     <div class="kit-cap-label"><span>Step 1 · Extract</span>
 *       <span class="kit-speed" data-rate="6" data-tag-start="5.75" data-tag-end="8.6">6x</span></div>
 *     <div class="kit-cap-main">DeepSeek turns the email into JSON.</div>
 *     <div class="kit-cap-note">optional small honesty note</div>
 *   </div>
 *
 * Kit.captions.animate(tl, rootOrId) -> cues [{id, start, end, speeds: [{rate, start, end, text}]}]
 *   cue: label + main blur in (0.2 s), note fades in at +0.4 s, whole cue fades out at end - 0.16 s
 *   tags (.kit-speed / .kit-chip / .kit-tag): shown for the cue, or for [data-tag-start, data-tag-end)
 *   band (.kit-band inside a timed wrapper): fades in at its start, out before its end
 * QA rule: every footage clip with data-playback-rate != 1 must be covered by a .kit-speed tag whose
 * text shows that rate ("6x"), in the caption band or in the scene itself.
 */
(function (g) {
  const Kit = (g.Kit = g.Kit || {});

  function rootOf(r) {
    if (typeof r !== "string") return r;
    return document.querySelector('[data-composition-id="' + r + '"]') || document.querySelector(r);
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
      const lab = cap.querySelector(".kit-cap-label");
      const main = cap.querySelector(".kit-cap-main");
      const note = cap.querySelector(".kit-cap-note");
      if (lab) tl.fromTo(lab, { opacity: 0, filter: "blur(8px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.2, ease: "expo.out" }, start);
      if (main) tl.fromTo(main, { opacity: 0, filter: "blur(8px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.22, ease: "expo.out" }, start + 0.06);
      if (note) tl.fromTo(note, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" }, start + 0.4);
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
      cues.push({ id: cap.id, start, end, speeds });
    });
    return cues;
  }

  Kit.captions = { animate };
  if (typeof module === "object" && module.exports) module.exports = Kit;
})(typeof window !== "undefined" ? window : globalThis);

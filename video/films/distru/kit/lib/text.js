/*
 * kit/lib/text.js — text measures shared by the page and QA (kit 1.1): word counts, reading time,
 * and widths of Inter text from its glyph advances, so a check in Node agrees with what renders.
 *
 * Kit.text.READ                      {perWord: 0.35, base: 0.6}: reading time = 0.6 s + 0.35 s per word
 * Kit.text.CAP2                      the v2 caption band geometry (keep in sync with tokens.css --kit-cap2-*)
 * Kit.text.ANN                       the annotation label geometry (keep in sync with kit.css .kit-ann-label)
 * Kit.text.plain(htmlOrText)         strip tags, *accent* stars and entities -> plain text
 * Kit.text.words(text)               words a viewer reads (tokens with a letter or digit; "·" / "—" don't count)
 * Kit.text.readingTime(words)        0.6 + 0.35 * words (seconds)
 * Kit.text.width(text, size, weight = 700, tracking = 0)   px width of Inter text (tracking in em);
 *                                    advances measured from Inter 4 (Bold / Regular) without kerning,
 *                                    so it errs ~0.5% wide; unknown glyphs count as a wide letter
 * Kit.text.lines(text, size, weight, tracking, maxWidth)   greedy word-wrap line count
 * Kit.text.annSize(label)            {w, h} of an annotation label box (what kit.css draws)
 */
(function (g) {
  const Kit = (g.Kit = g.Kit || {});

  const CHARS = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~·’‘“”–—…×→✓€";
  const ADV700 = [237, 338, 552, 649, 655, 1016, 672, 339, 377, 377, 559, 679, 334, 468, 334, 388, 674, 431, 630, 646, 676, 639, 649, 582, 651, 649, 334, 343, 679, 679, 679, 560, 1016, 747, 662, 740, 722, 607, 587, 750, 747, 281, 584, 719, 565, 932, 762, 771, 648, 777, 657, 655, 667, 732, 747, 1038, 738, 731, 664, 377, 388, 377, 487, 476, 365, 581, 630, 588, 630, 596, 398, 632, 623, 271, 271, 580, 271, 913, 623, 613, 630, 630, 407, 560, 366, 623, 600, 850, 580, 602, 573, 469, 372, 469, 679, 334, 311, 311, 540, 532, 500, 1000, 1002, 679, 954, 882, 685];
  const ADV400 = [281, 288, 466, 633, 642, 982, 644, 300, 365, 365, 501, 662, 288, 460, 288, 360, 631, 407, 610, 618, 646, 608, 620, 566, 619, 620, 288, 302, 662, 662, 662, 511, 966, 690, 654, 730, 722, 601, 590, 746, 743, 269, 571, 672, 565, 903, 753, 765, 639, 765, 644, 642, 646, 744, 690, 985, 682, 679, 629, 365, 360, 365, 471, 456, 323, 562, 612, 571, 612, 583, 370, 613, 591, 242, 242, 549, 242, 876, 591, 600, 612, 612, 376, 528, 327, 591, 562, 818, 546, 562, 552, 426, 333, 426, 662, 288, 261, 261, 440, 440, 500, 1000, 864, 662, 954, 884, 666];
  const ADV = { 700: {}, 400: {} };
  for (let i = 0; i < CHARS.length; i++) {
    ADV[700][CHARS[i]] = ADV700[i];
    ADV[400][CHARS[i]] = ADV400[i];
  }

  const READ = { perWord: 0.35, base: 0.6 };
  // v2 caption band (px at 1080p): left/right gutter, kicker / head / detail sizes and tracking
  const CAP2 = { gutter: 120, width: 1920 - 2 * 120, top: 864, kicker: 28, head: 58, headTracking: -0.02, detail: 32, detailTracking: 0, minHead: 52, maxHeadWords: 10, maxDetailWords: 14 };
  // annotation label box: Inter 700 at 32 px, line 40 px, padding 9 / 18, 2 px slack each side
  const ANN = { size: 32, line: 40, padX: 18, padY: 9, slack: 4, maxWords: 6 };

  function decode(s) {
    return String(s)
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&rsquo;/g, "’")
      .replace(/&middot;/g, "·");
  }

  function plain(s) {
    return decode(String(s == null ? "" : s).replace(/<[^>]+>/g, " ").replace(/\*([^*]+)\*/g, "$1"))
      .replace(/\s+/g, " ")
      .trim();
  }

  function words(s) {
    return plain(s)
      .split(" ")
      .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  }

  function readingTime(n) {
    return +(READ.base + READ.perWord * n).toFixed(2);
  }

  function width(s, size, weight, tracking) {
    const table = ADV[weight === 400 || weight === "400" ? 400 : 700];
    const t = plain(s);
    let u = 0;
    for (const ch of t) u += table[ch] != null ? table[ch] : 760;
    return (u / 1000) * size + (tracking || 0) * size * t.length;
  }

  function lines(s, size, weight, tracking, maxWidth) {
    const ws = plain(s).split(" ").filter(Boolean);
    if (!ws.length) return 0;
    let n = 1;
    let cur = "";
    ws.forEach((w) => {
      const next = cur ? cur + " " + w : w;
      if (cur && width(next, size, weight, tracking) > maxWidth) {
        n++;
        cur = w;
      } else cur = next;
    });
    return n;
  }

  function annSize(label) {
    return {
      w: Math.ceil(width(label, ANN.size, 700, 0) + 2 * ANN.padX + ANN.slack),
      h: ANN.line + 2 * ANN.padY,
    };
  }

  Kit.text = { READ, CAP2, ANN, plain, words, readingTime, width, lines, annSize };
  if (typeof module === "object" && module.exports) module.exports = Kit;
})(typeof window !== "undefined" ? window : globalThis);

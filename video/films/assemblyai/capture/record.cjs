// AssemblyAI capture script (v3, demo UI revamp d0c6407). Run from video/:
//   node films/assemblyai/capture/record.cjs <clip>
// Then: node kit/scripts/build-footage.mjs films/assemblyai   (assets/footage/*.mp4 + data/clips/*.json)
//
// The demo runs from a COPY of the demos repo (never `next` inside /home/claude/demos-all: parallel
// agents share its .next): copy without node_modules/.next/video, link node_modules, copy .env.local,
// `next build && next start -p 3170`. The page needs a demo key: DEMO_KEY_FILE points at a file holding
// the full demo URL (?k=...); its host is swapped for localhost:3170. The key is never printed.
//
// Clips (all 1920x1080, dsf 1; "First try" is the page's default sample):
//   top      free   hero (cold open), the task prompt, scroll to the checker, Run again, point at L9, click L43
//   explain  LIVE   "Explain failures" on First try: one uncached DeepSeek V3.2 call via fal (costs money;
//                   a server restart clears the in-memory cache, so the first click after a restart is live)
//   fix      free   Reference fix sample (every check that applies passes), then 8 verified gaps (01-02)
//   prop     free   section 04: the two proposed MCP tools, then the one-line README fix
//   probe    free   no recording: prints every tracked box at the scroll positions the clips use
//
// New UI notes: the sticky header is a floating pill (y 12-68, x 340-1580), so a component that the
// film focuses must sit below y ~80 while recording. Page width 1240 (x 340-1580).
const fs = require("fs");
const path = require("path");
const cap = require("../../../kit/scripts/capture.cjs");

const FILM = path.join(__dirname, "..");
function demoUrl() {
  const file = process.env.DEMO_KEY_FILE;
  if (!file) return "http://localhost:3170/demo/assemblyai/";
  const u = new URL(fs.readFileSync(file, "utf8").trim());
  return "http://localhost:3170" + u.pathname + u.search;
}
const BASE = demoUrl();
const redact = (s) => String(s).replace(/([?&]k=)[^&\s"']+/g, "$1<redacted>");

// scroll positions (document y at the top of the viewport)
const Y_CHECKER = 940; // sample chips at ~89, code + results 141-819, Run again ~766, Explain panel 835-950
const Y_EXPLAIN = 1691; // Explain panel top at ~84; the full reply (~670 px) stays inside the viewport
const Y_GAPS_PAD = 90; // gaps section head this far below the viewport top
const Y_PROPOSAL_PAD = 90; // section 04 head this far below the viewport top: tool cards ~235-849

// component name -> CSS selector, (document) => Element, or {sel|fn, clip: true}
const cls = (name) => `[class*=AssemblyAI_${name}__]`;
const fn = (body) => new Function("d", body);
const byText = (sel, text) =>
  fn(`return [...d.querySelectorAll(${JSON.stringify(sel)})].find((e) => e.textContent.trim().startsWith(${JSON.stringify(text)})) || null;`);
const nth = (sel, i) => fn(`return d.querySelectorAll(${JSON.stringify(sel)})[${i}] || null;`);
const codeLine = (n) => `[class*=checkedCode] [data-line="${n}"]`;
// code rows are wider than their scroll pane: record only the visible part
const row = (n) => ({ sel: codeLine(n), clip: true });
const gapNo = (no) =>
  fn(`return [...d.querySelectorAll(${JSON.stringify(cls("gap"))})].find((e) => { const n = e.querySelector(${JSON.stringify(cls("gapNo"))}); return n && n.textContent.trim() === ${JSON.stringify(no)}; }) || null;`);
const inGap = (no, sel) =>
  fn(`const g = [...d.querySelectorAll(${JSON.stringify(cls("gap"))})].find((e) => { const n = e.querySelector(${JSON.stringify(cls("gapNo"))}); return n && n.textContent.trim() === ${JSON.stringify(no)}; }); return (g && g.querySelector(${JSON.stringify(sel)})) || null;`);
const result = (text) => ({
  fn: fn(`return [...d.querySelectorAll(${JSON.stringify(cls("resultsPane") + " li")})].find((e) => e.textContent.includes(${JSON.stringify(text)})) || null;`),
  clip: true,
});

const TRACK = {
  // hero
  hero: cls("verdictCard"),
  heroScore: cls("verdictScore"),
  heroFails: cls("verdictFails"),
  heroLink: cls("verdictLink"),
  heroTitle: "h1",
  task: cls("task"),
  taskPrompt: cls("taskPrompt"),
  taskNote: cls("taskNote"),
  jumps: cls("jumps"),
  bar: "header[class*=DemoLayout_bar]",
  // checker
  checkerHead: "#checker > header",
  samples: cls("checkerBar"),
  refButton: byText(cls("checkerBar") + " button", "Reference fix"),
  codePane: cls("codePane"),
  code: "[class*=checkedCode]",
  editorBar: cls("editorBar"),
  runAgain: byText("button", "Run again"),
  resultsPane: cls("resultsPane"),
  verdict: cls("resultsPane") + " > " + cls("verdict"),
  tally: cls("resultsPane") + " " + cls("tally"),
  failTerminate: result("Stop sends Terminate"),
  failAudio: result("Audio is PCM16"),
  failSyntax: result("Doc snippets compile"),
  firstGroup: { fn: nth(cls("resultsPane") + " " + cls("resultGroup"), 0), clip: true },
  // Explain and fix (the panel itself has no module class: the head's parent)
  llmPanel: fn(`const h = d.querySelector(${JSON.stringify(cls("llmHead"))}); return (h && h.parentElement) || null;`),
  llmHead: cls("llmHead"),
  explainBtn: cls("llmHead") + " button",
  reply: cls("reply"),
  // gaps
  gapsHead: "#gaps > header",
  gap1: gapNo("01"),
  gap2: gapNo("02"),
  gap3: gapNo("03"),
  gap4: gapNo("04"),
  gap2Head: inGap("02", cls("gapHead")),
  gap2Evidence: inGap("02", cls("evidence")),
  gap2Fix: inGap("02", cls("gapFix")),
  // fix section
  fixCard: cls("fixCard"),
  // proposal
  proposalHead: "#proposal > header",
  toolGrid: cls("toolGrid"),
  tool0: nth(cls("tool"), 0),
  tool1: nth(cls("tool"), 1),
  toolHead0: nth(cls("toolHead"), 0),
  toolHead1: nth(cls("toolHead"), 1),
  toolName0: nth(cls("toolName"), 0),
  toolName1: nth(cls("toolName"), 1),
  readmeFix: cls("readmeFix"),
  readmeText: cls("readmeText"),
  readmeDelta: cls("readmeDelta"),
  readmeCode: fn(`const c = d.querySelector(${JSON.stringify(cls("readmeFix"))}); return (c && c.children[1]) || null;`),
  evalBox: cls("evalBox"),
};
for (const n of [1, 5, 7, 8, 9, 10, 12, 24, 28, 31, 42, 43, 44, 45]) TRACK["l" + n] = row(n);
// reply paragraphs: one per finding (bold title line, what breaks, Fix line): rp0 .. rp9; titles rt0 .. rt9
for (let i = 0; i < 10; i++) {
  TRACK["rp" + i] = nth(cls("reply") + " > p", i);
  TRACK["rt" + i] = nth(cls("reply") + " > p > strong", i);
}

// each take tracks only what its shots use (the in-page sampler runs every animation frame)
const pick = (re) => Object.fromEntries(Object.entries(TRACK).filter(([k]) => re.test(k)));
const T_TOP = pick(/^(hero|heroScore|heroFails|heroLink|heroTitle|task|taskPrompt|taskNote|jumps|bar|checkerHead|samples|codePane|code|editorBar|runAgain|resultsPane|verdict|tally|fail[A-Z]\w*|firstGroup|llmPanel|llmHead|l\d+)$/);
const T_EXPLAIN = pick(/^(bar|editorBar|llmPanel|llmHead|explainBtn|reply|rp\d|rt\d|gapsHead)$/);
const T_FIX = pick(/^(bar|checkerHead|samples|refButton|codePane|code|editorBar|runAgain|resultsPane|verdict|tally|firstGroup|llmPanel|llmHead|gapsHead|gap\d|gap2\w+|l\d+)$/);
const T_PROP = pick(/^(bar|fixCard|proposalHead|toolGrid|tool\d|toolHead\d|toolName\d|readme\w+|evalBox)$/);

async function parkCursor(clip) {
  await clip.page.mouse.move(1990, 1120);
  clip.setCursor(1990, 1120);
}

async function settle(page, y) {
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await page.waitForTimeout(800);
}

async function top() {
  const clip = await cap.startClip({ film: FILM, name: "top", url: BASE, track: T_TOP });
  const { page } = clip;
  await page.waitForTimeout(1500);
  await parkCursor(clip);
  await clip.begin();
  await clip.wait(200);
  // into the verdict card, right of the first failure line (covers no text)
  await clip.moveTo(1500, 318, 1100);
  clip.mark("hero");
  await clip.wait(1150); // the cold open (hook = 0-2.5 s) ends as the pointer leaves the card
  // to the task prompt's caret (end of "AssemblyAI streaming.")
  await clip.moveTo(720, 650, 900);
  clip.mark("task");
  await clip.wait(3000);
  await clip.scrollTo(Y_CHECKER, 1100);
  clip.mark("checker");
  await clip.wait(1300);
  await clip.click(page.getByRole("button", { name: "Run again" }), { label: "run-again", move: 700 });
  await clip.wait(2900); // results rise in, staggered
  // point at L9: the SDK README's snippet with `expires_in_seconds = 60` (SyntaxError)
  const l9 = await page.locator(codeLine(9)).boundingBox();
  await clip.moveTo(l9.x + 300, l9.y + l9.height / 2 + 2, 800);
  clip.mark("l9");
  await clip.wait(3000);
  const l43 = page.locator(cls("resultsPane") + " li", { hasText: "Stop sends Terminate" }).getByRole("button", { name: "L43" });
  await clip.click(l43, { label: "l43", move: 800 });
  await clip.wait(4200);
  await clip.finish();
}

async function explain() {
  const clip = await cap.startClip({ film: FILM, name: "explain", url: BASE, track: T_EXPLAIN });
  const { page } = clip;
  await page.waitForTimeout(1200);
  await settle(page, Y_EXPLAIN);
  await parkCursor(clip);
  await clip.begin();
  await clip.wait(300);
  await clip.click(page.getByRole("button", { name: "Explain failures" }), { label: "explain-click", move: 1000 });
  await page.waitForFunction(() => !!document.querySelector("[class*=AssemblyAI_reply__]"), null, { timeout: 120000, polling: 30 });
  clip.mark("first-text");
  await page.waitForFunction(
    () => [...document.querySelectorAll("[class*=AssemblyAI_llmHead__] button")].some((b) => b.textContent.trim() === "Explain failures"),
    null,
    { timeout: 120000, polling: 30 }
  );
  clip.mark("reply-done");
  const reply = await page.locator(cls("reply")).innerText();
  fs.writeFileSync(path.join(clip.outDir, "reply.txt"), reply);
  await clip.wait(1000);
  // point at the L9 finding (the README snippet), right of its Fix line, then hold
  const paras = page.locator(cls("reply") + " > p");
  const n = await paras.count();
  clip.mark("findings-" + n);
  let target = null;
  for (let i = 0; i < n; i++) {
    const t = await paras.nth(i).innerText();
    if (/^L9\b/.test(t.trim())) target = paras.nth(i);
  }
  if (target) {
    const b = await target.boundingBox();
    await clip.moveTo(b.x + Math.min(b.width - 40, 900), b.y + b.height - 10, 900);
    clip.mark("fix-l9");
  }
  await clip.wait(3600);
  await clip.finish();
}

async function fix() {
  const clip = await cap.startClip({ film: FILM, name: "fix", url: BASE, track: T_FIX });
  const { page } = clip;
  await page.waitForTimeout(1200);
  await settle(page, Y_CHECKER);
  await parkCursor(clip);
  await clip.begin();
  await clip.wait(300);
  await clip.click(page.getByRole("button", { name: "Reference fix" }), { label: "ref", move: 1000 });
  await clip.wait(2800);
  await clip.moveTo(1450, 300, 700); // into the green verdict, right of the text
  await clip.wait(1400);
  const head = await clip.docY(page.locator("#gaps > header"));
  await clip.scrollTo(Math.round(head - Y_GAPS_PAD), 1100);
  clip.mark("gaps");
  await clip.wait(700);
  // onto gap 02's evidence: the SDK README snippet with `expires_in_seconds = 60`
  const g2 = page.locator(cls("gap"), { has: page.locator(cls("gapNo"), { hasText: "02" }) });
  const ev = await g2.locator(cls("evidence")).first().boundingBox();
  await clip.moveTo(ev.x + 330, ev.y + 40, 900);
  clip.mark("evidence");
  await clip.wait(3800);
  await clip.finish();
}

async function prop() {
  const clip = await cap.startClip({ film: FILM, name: "prop", url: BASE, track: T_PROP });
  const { page } = clip;
  await page.waitForTimeout(1200);
  const head = await page.locator("#proposal > header").evaluate((e) => e.getBoundingClientRect().top + window.scrollY);
  await settle(page, Math.round(head - Y_PROPOSAL_PAD));
  await parkCursor(clip);
  await clip.begin();
  await clip.wait(300);
  const n0 = await page.locator(cls("toolName")).nth(0).boundingBox();
  await clip.moveTo(n0.x + n0.width + 30, n0.y + n0.height / 2, 1100); // just right of create_streaming_token
  clip.mark("tool0");
  await clip.wait(1500);
  const n1 = await page.locator(cls("toolName")).nth(1).boundingBox();
  await clip.moveTo(n1.x + n1.width + 30, n1.y + n1.height / 2, 900); // just right of check_streaming_config
  clip.mark("tool1");
  await clip.wait(1800);
  // lift the README fix near the top of the viewport (the tool cards above it scroll out)
  const rh = await clip.docY(page.locator(cls("readmeFix")));
  await clip.scrollTo(Math.round(rh - 300), 900);
  clip.mark("readme-scrolled");
  await clip.wait(300);
  const code = await page.locator(cls("readmeFix")).locator("xpath=./*[2]").boundingBox();
  await clip.moveTo(code.x + 420, code.y + 112, 900); // right of the "+ expires_in_seconds: 60," line
  clip.mark("readme");
  await clip.wait(3600);
  await clip.finish();
}

// no recording: print the tracked boxes at each scroll position (or at the ys given as argv[3], comma-separated)
async function probe() {
  const { chromium } = require(process.env.PLAYWRIGHT_PATH || "/opt/npm-tools/node_modules/playwright");
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })).newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const defs = Object.fromEntries(
    Object.entries(TRACK).map(([k, v]) => [
      k,
      typeof v === "function"
        ? { fn: v.toString() }
        : typeof v === "object"
        ? typeof v.fn === "function"
          ? { fn: v.fn.toString(), clip: !!v.clip }
          : { sel: v.sel, clip: !!v.clip }
        : { sel: v },
    ])
  );
  const docY = (sel) => page.locator(sel).first().evaluate((e) => e.getBoundingClientRect().top + window.scrollY);
  const gaps = await docY("#gaps > header");
  const propY = await docY("#proposal > header");
  const rh = await docY(cls("readmeFix"));
  const ys = process.argv[3]
    ? process.argv[3].split(",").map(Number)
    : [0, Y_CHECKER, Y_EXPLAIN, Math.round(gaps - Y_GAPS_PAD), Math.round(propY - Y_PROPOSAL_PAD), Math.round(rh - 300)];
  for (const y of ys) {
    await settle(page, y);
    const out = await page.evaluate((defs) => {
      const r = {};
      for (const [k, d] of Object.entries(defs)) {
        let el = null;
        try {
          el = d.sel ? document.querySelector(d.sel) : new Function("document", "return (" + d.fn + ")(document)")(document);
        } catch (e) {
          el = null;
        }
        if (!el) continue;
        let bb = el.getBoundingClientRect();
        if (d.clip) {
          let L = bb.left, T = bb.top, R = bb.right, B = bb.bottom;
          for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
            const s = getComputedStyle(a);
            if (s.overflowX === "visible" && s.overflowY === "visible") continue;
            const ar = a.getBoundingClientRect();
            if (s.overflowX !== "visible") { L = Math.max(L, ar.left); R = Math.min(R, ar.right); }
            if (s.overflowY !== "visible") { T = Math.max(T, ar.top); B = Math.min(B, ar.bottom); }
          }
          bb = { left: L, top: T, width: R - L, height: B - T };
        }
        if (bb.width <= 0 || bb.height <= 0 || bb.top > 1080 || bb.top + bb.height < 0) continue;
        r[k] = [bb.left, bb.top, bb.width, bb.height].map(Math.round).join(",");
      }
      return r;
    }, defs);
    console.log("scrollY", y, JSON.stringify(out));
  }
  await b.close();
}

const clips = { top, explain, fix, prop, probe };
(async () => {
  const which = process.argv[2] || "top";
  if (!clips[which]) throw new Error("unknown clip " + which);
  await clips[which]();
})().catch((e) => {
  console.error(redact(e && e.stack ? e.stack : e));
  process.exit(1);
});

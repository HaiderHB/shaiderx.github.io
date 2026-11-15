// AssemblyAI capture script. Run from video/: node films/assemblyai/capture/record.cjs <clip>
// Then: npm run footage -- films/assemblyai   (builds assets/footage/*.mp4 + data/clips/*.json)
//
// The demo runs locally from the portfolio worktree: `npx next dev -p 3170` (.env.local there).
// The page needs a demo key: DEMO_KEY_FILE points at a file holding the full demo URL (?k=...);
// its host is swapped for localhost:3170. The key is never printed or written into the film.
//
// Clips (all 1920x1080, dsf 1; "First try" is the page's default sample):
//   top      free   page top (hook), scroll to the checker, Run again, point at L9, click L43
//   explain  LIVE   "Explain failures" on First try: one uncached DeepSeek V3.2 call via fal (costs money;
//                   a server restart clears the in-memory cache, so the first click after a restart is live)
//   fix      free   Reference fix sample: 0 fail 0 warn 14 pass, then the 8 verified gaps (row 1, pointer on gap 02)
//   prop     free   the two proposed MCP tool definitions, then the one-line README fix (section 04)
//   probe    free   no recording: prints every tracked box at the scroll positions the clips use
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

// scroll positions (document y at the top of the 1920x1080 viewport; the site header is sticky, 0-46 px)
const Y_CHECKER = 600; // sample buttons at ~136, code + results 222-853, Run again ~794, llm panel ~869
const Y_EXPLAIN = 1409; // llm panel top at ~60, so the full reply (~870 px) stays inside the viewport
const Y_PROPOSAL = 5480; // the two MCP tool cards at ~149-693

// component name -> CSS selector or (document) => Element (serialised by capture.cjs: no closures)
const byText = (sel, text) =>
  new Function("d", `return [...d.querySelectorAll(${JSON.stringify(sel)})].find((e) => e.textContent.trim().startsWith(${JSON.stringify(text)})) || null;`);
const nth = (sel, i) => new Function("d", `return d.querySelectorAll(${JSON.stringify(sel)})[${i}] || null;`);
const codeLine = (n) => `[class*=checkedCode] [data-line="${n}"]`;
// code rows are wider than their scroll pane: record only the visible part (capture.cjs clip option)
const row = (n) => ({ sel: codeLine(n), clip: true });

const TRACK = {
  hero: "section[class*=hero]",
  heroTask: nth("section[class*=hero] > *", 0),
  heroTry: nth("section[class*=hero] > *", 1),
  samples: "[class*=samples]",
  refButton: byText("button[class*=sampleButton]", "Reference fix"),
  code: "[class*=checkedCode]",
  l1: row(1),
  l7: row(7),
  l8: row(8),
  l9: row(9),
  l12: row(12),
  l42: row(42),
  l43: row(43),
  l44: row(44),
  l45: row(45),
  runAgain: byText("button", "Run again"),
  verdict: "[class*=resultsPane] > [class*=verdict]",
  results: "[class*=resultsPane] [class*=AssemblyAI_results__]",
  resultsPane: "[class*=resultsPane]",
  failTerminate: new Function("d", `return [...d.querySelectorAll("[class*=resultsPane] li")].find((e) => e.textContent.includes("Stop sends Terminate")) || null;`),
  firstGroup: nth("[class*=resultsPane] [class*=resultGroup]", 0),
  llmPanel: "[class*=llmPanel]",
  llmHead: "[class*=llmHead]",
  explainBtn: "[class*=llmHead] button",
  reply: "[class*=AssemblyAI_reply__]",
  gapsHead: "#gaps header",
  gap1: nth("[class*=AssemblyAI_gap__]", 0),
  gap2: nth("[class*=AssemblyAI_gap__]", 1),
  gap3: nth("[class*=AssemblyAI_gap__]", 2),
  gap4: nth("[class*=AssemblyAI_gap__]", 3),
  tool0: nth("[class*=AssemblyAI_tool__]", 0),
  tool1: nth("[class*=AssemblyAI_tool__]", 1),
  toolName0: nth("[class*=toolName]", 0),
  toolName1: nth("[class*=toolName]", 1),
  toolDesc0: new Function("d", `const h = d.querySelectorAll("[class*=toolName]")[0]; return (h && h.nextElementSibling) || null;`),
  toolDesc1: new Function("d", `const h = d.querySelectorAll("[class*=toolName]")[1]; return (h && h.nextElementSibling) || null;`),
  readmeHead: byText("h3", "The README fix"),
  readmeCode: new Function("d", `const h = [...d.querySelectorAll("h3")].find((e) => e.textContent.trim() === "The README fix"); return (h && h.nextElementSibling) || null;`),
};
// reply paragraphs (each finding = title line, what breaks, Fix line): rp0 .. rp29
for (let i = 0; i < 30; i++) TRACK["rp" + i] = nth("[class*=AssemblyAI_reply__] > *", i);

async function parkCursor(clip) {
  await clip.page.mouse.move(1990, 1120);
  clip.setCursor(1990, 1120);
}

async function settle(page, y) {
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await page.waitForTimeout(700);
}

async function top() {
  const clip = await cap.startClip({ film: FILM, name: "top", url: BASE, track: TRACK });
  const { page } = clip;
  await page.waitForTimeout(1200);
  await parkCursor(clip);
  await clip.begin();
  await clip.wait(250);
  await clip.moveTo(1380, 298, 1100); // into the hero, just right of "3 failures · 5 warnings · 4 pass" (covers no text)
  clip.mark("hero");
  await clip.wait(500);
  await clip.moveTo(1378, 494, 700); // onto "See every line" (the link down to the checker)
  await clip.wait(700);
  await clip.scrollTo(Y_CHECKER, 1100);
  clip.mark("checker");
  await clip.wait(600);
  await clip.click(page.getByRole("button", { name: "Run again" }), { label: "run-again", move: 700 });
  await clip.wait(2200); // results rise in, staggered
  // point at L9: the SDK README's snippet with `expires_in_seconds = 60` (SyntaxError)
  const l9 = await page.locator(codeLine(9)).boundingBox();
  await clip.moveTo(l9.x + 250, l9.y + l9.height / 2 + 2, 800);
  clip.mark("l9");
  await clip.wait(2600);
  const l43 = page.locator("[class*=resultsPane] li", { hasText: "Stop sends Terminate" }).getByRole("button", { name: "L43" });
  await clip.click(l43, { label: "l43", move: 800 });
  await clip.wait(3000);
  await clip.finish();
}

async function explain() {
  const clip = await cap.startClip({ film: FILM, name: "explain", url: BASE, track: TRACK });
  const { page } = clip;
  await page.waitForTimeout(1000);
  await settle(page, Y_EXPLAIN);
  await parkCursor(clip);
  await clip.begin();
  await clip.wait(300);
  await clip.click(page.getByRole("button", { name: "Explain failures" }), { label: "explain-click", move: 1000 });
  await page.waitForFunction(() => !!document.querySelector("[class*=AssemblyAI_reply__]"), null, { timeout: 120000, polling: 30 });
  clip.mark("first-text");
  await page.waitForFunction(
    () => [...document.querySelectorAll("[class*=llmHead] button")].some((b) => b.textContent.trim() === "Explain failures"),
    null,
    { timeout: 120000, polling: 30 }
  );
  clip.mark("reply-done");
  const reply = await page.locator("[class*=AssemblyAI_reply__]").innerText();
  fs.writeFileSync(path.join(clip.outDir, "reply.txt"), reply);
  await clip.wait(1200);
  // point at the first finding's Fix line
  const fixes = page.locator("[class*=AssemblyAI_reply__] > *", { hasText: /^Fix:/ });
  const n = await fixes.count();
  clip.mark("fixes-" + n);
  if (n) {
    const b = await fixes.nth(0).boundingBox();
    await clip.moveTo(b.x + 40, b.y + 10, 800);
    clip.mark("fix-first");
    await clip.wait(2400);
  }
  await clip.wait(1000);
  await clip.finish();
}

async function fix() {
  const clip = await cap.startClip({ film: FILM, name: "fix", url: BASE, track: TRACK });
  const { page } = clip;
  await page.waitForTimeout(1000);
  await settle(page, Y_CHECKER);
  await parkCursor(clip);
  await clip.begin();
  await clip.wait(300);
  await clip.click(page.getByRole("button", { name: "Reference fix" }), { label: "ref", move: 1000 });
  await clip.wait(2600);
  await clip.moveTo(1300, 300, 700);
  await clip.wait(900);
  const gaps = page.locator("[class*=AssemblyAI_gap__]");
  const g1 = await clip.docY(gaps.nth(0));
  await clip.scrollTo(Math.round(g1 - 150), 1100);
  clip.mark("gaps1");
  await clip.wait(900);
  // onto gap 02's evidence: the SDK README snippet with `expires_in_seconds = 60`
  const ev = await gaps.nth(1).locator("pre, code").first().boundingBox();
  await clip.moveTo(ev.x + 300, ev.y + 58, 900);
  clip.mark("evidence");
  await clip.wait(3800);
  await clip.finish();
}

async function prop() {
  const clip = await cap.startClip({ film: FILM, name: "prop", url: BASE, track: TRACK });
  const { page } = clip;
  await page.waitForTimeout(1000);
  await settle(page, Y_PROPOSAL);
  await parkCursor(clip);
  await clip.begin();
  await clip.wait(300);
  await clip.moveTo(1090, 168, 1100); // onto check_streaming_config
  clip.mark("tool");
  await clip.wait(800);
  await clip.moveTo(1240, 200, 900); // along its description
  await clip.wait(1800);
  // lift the README fix near the top of the viewport (tool cards above it scroll out), then point at the + line
  const rh = await clip.docY(page.locator("h3", { hasText: "The README fix" }));
  await clip.scrollTo(Math.round(rh - 150), 800);
  clip.mark("readme-scrolled");
  await clip.wait(200);
  const plus = await page.locator("h3", { hasText: "The README fix" }).locator("xpath=following-sibling::*[1]").boundingBox();
  await clip.moveTo(plus.x + 250, plus.y + 106, 900); // onto the "+ expires_in_seconds: 60," line
  clip.mark("readme");
  await clip.wait(3400);
  await clip.finish();
}

// no recording: print the tracked boxes at each scroll position
async function probe() {
  const { chromium } = require("/opt/npm-tools/node_modules/playwright");
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })).newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const defs = Object.fromEntries(Object.entries(TRACK).map(([k, v]) => [k, typeof v === "function" ? { fn: v.toString() } : typeof v === "object" ? { sel: v.sel, clip: !!v.clip } : { sel: v }]));
  for (const y of [0, Y_CHECKER, Y_EXPLAIN]) {
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

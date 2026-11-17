// GC AI capture script (launch format, kit 2). Run from video/: node films/gc-ai/capture/record.cjs <take>
// Then: npm run footage -- films/gc-ai   (builds assets/footage/*.mp4 + data/clips/*.json)
//
// The demo runs from an isolated copy of the worktree (next build && next start -p 3167), with no demo key:
// the page is in preview mode and Review replays the recorded live run of the playbook (example.js, the exact
// event stream of a live run on the Vercel preview, 22.9 s), which the page itself replays at 2x and labels
// "Example run". No live calls. The film labels it.
//
// Kit 2 capture settings: viewport 1360x765 CSS px at deviceScaleFactor 2 (frames 2720x1530), so the UI is
// 1.41x larger on the 1920 stage and 1.4-2x camera zooms stay sharp; cursor about 1.5x a system arrow, hidden
// when idle, resting 450 ms before every click.
//
// Takes
//   before  the vendor's original contract: every suggestion rejected in the pre-roll (the page then shows
//           the original text), the document scrolled slowly. Backdrop of the "problem" statement.
//   review  one continuous take of the whole task. Right after pressing Review the reader "takes over" the
//           scrolling (one wheel tick, as the page allows), so the script decides what each pane shows:
//           Review -> clauses 3-5 while their changes land -> clause 11 while its changes land -> a change
//           card and its clause decision -> a tracked change in clause 12 -> the refused edits -> Accept one
//           -> the Word download -> the finished review, wide. Every hold is real footage (no freeze frames).
const fs = require("fs");
const path = require("path");
const cap = require("../../../kit/scripts/capture.cjs");

const FILM = path.join(__dirname, "..");
const BASE = process.env.DEMO_URL || "http://localhost:3167/demo/gc-ai/";
const VIEW = { viewport: { width: 1360, height: 765 }, deviceScaleFactor: 2, cursor: { scale: 0.75, idleHide: 1200 }, clickPause: 450, quality: 92 };

// tracked functions are serialised into the page, so values are baked into the source
const inGroup = (n, sel) => ({
  fn: new Function(
    "d",
    `const li = [...d.querySelectorAll('li[class*="GcAi_group"]')].find((li) => li.querySelector('[class*="GcAi_clauseNo"]')?.textContent === '§${n}'); return li && ${sel ? `li.querySelector(${JSON.stringify(sel)})` : "li"}`
  ),
  clip: true,
});
const clipped = (sel) => ({ sel, clip: true });

// component name -> CSS selector or (document) => Element. Track every component a shot or a spotlight uses.
const TRACK = {
  window: '[class*="GcAi_window__"]',
  docPane: '[class*="GcAi_docPane"]',
  taskPane: 'aside[aria-label="Redline assistant"]',
  taskBody: '[class*="GcAi_taskBody"]',
  taskFoot: '[class*="GcAi_taskFoot"]',
  setup: clipped('form[class*="GcAi_setup"]'),
  playbooks: clipped('[class*="GcAi_playbooks"]'),
  runRow: clipped('[class*="GcAi_runRow"]'),
  progress: clipped('[class*="GcAi_progress"]'),
  c3: clipped('[data-clause="3"]'),
  c4: clipped('[data-clause="4"]'),
  c5: clipped('[data-clause="5"]'),
  c11: clipped('[data-clause="11"]'),
  c12: clipped('[data-clause="12"]'),
  chg16: clipped('[data-change-id="C16"]'),
  g4: inGroup(4),
  head4: inGroup(4, '[class*="GcAi_groupHead"]'),
  jev4: inGroup(4, '[class*="GcAi_jev__"]'),
  cardC4: clipped('[data-card-id="C4"]'),
  cardC13: clipped('[data-card-id="C13"]'),
  refused: clipped('[class*="GcAi_refused"]'),
  refused2: clipped('[class*="GcAi_refused"] li:nth-child(2)'),
  docxBtn: '[class*="GcAi_download"]',
};

const scrollToReview = (page) =>
  page.evaluate(() => {
    const top = document.querySelector("#review").getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top - 78);
  });

// Scrolls a pane (not the page) so `target` sits `offset` px below the pane's top; ms = 0 jumps.
const scrollPane = (page, pane, target, offset = 12, ms = 700, linear = false) =>
  page.evaluate(
    ([pane, target, offset, ms, linear]) =>
      new Promise((res) => {
        const el = document.querySelector(pane);
        let to = target;
        if (typeof target === "string") {
          const node = target.startsWith("fn:") ? new Function("d", target.slice(3))(document) : document.querySelector(target);
          to = el.scrollTop + node.getBoundingClientRect().top - el.getBoundingClientRect().top - offset;
        }
        to = Math.max(0, Math.min(el.scrollHeight - el.clientHeight, to));
        if (!ms) {
          el.scrollTop = to;
          return res();
        }
        const from = el.scrollTop, s = performance.now();
        const ease = (t) => (linear ? t : t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
        const step = (now) => {
          const p = Math.min(1, (now - s) / ms);
          el.scrollTop = from + (to - from) * ease(p);
          if (p < 1) requestAnimationFrame(step);
          else res();
        };
        requestAnimationFrame(step);
      }),
    [pane, target, offset, ms, linear]
  );
const DOC = '[class*="GcAi_docPane"]';
const TASK = '[class*="GcAi_taskBody"]';
const groupFn = (n) => `fn:return [...d.querySelectorAll('li[class*="GcAi_group"]')].find((li) => li.querySelector('[class*="GcAi_clauseNo"]')?.textContent === '§${n}')`;

async function open(name) {
  const clip = await cap.startClip(Object.assign({ film: FILM, name, url: BASE, track: TRACK }, VIEW));
  const { page } = clip;
  await scrollToReview(page);
  // the page auto-plays the example when the document comes into view; let it finish (pre-roll)
  await page.waitForFunction(() => document.body.innerText.includes("Reviewed 13 clauses"), null, { timeout: 60000 });
  await page.evaluate(() => {
    document.querySelector('[class*="GcAi_taskBody"]').scrollTop = 0;
    document.querySelector('[class*="GcAi_docPane"]').scrollTop = 0;
  });
  await page.mouse.move(1346, 420);
  clip.setCursor(1346, 420);
  return clip;
}

// before: the vendor's own text (all suggestions rejected in the pre-roll), scrolled slowly
async function before() {
  const clip = await open("before");
  const { page } = clip;
  await page.getByRole("button", { name: "Reject all" }).click();
  await page.mouse.move(1346, 420);
  await page.waitForTimeout(1600);
  await clip.begin();
  clip.mark("scroll");
  await scrollPane(page, DOC, 420, 0, 8000, true);
  await clip.wait(300);
  await clip.finish();
}

async function review() {
  const clip = await open("review");
  const { page } = clip;
  page.on("download", async (d) => {
    const to = path.join(FILM, "raw", "review-download.docx");
    await d.saveAs(to).catch(() => {});
    console.log("[review] saved the downloaded file ->", to);
  });
  await page.waitForTimeout(700);
  await clip.begin();

  // H1: still, then ONE action: press Review
  await clip.wait(1400);
  await clip.click(page.getByRole("button", { name: "Review", exact: true }), { label: "review", move: 900 });
  // the reader takes over the scrolling (the page stops following the newest redline): one wheel tick,
  // then clauses 3-5 go to the top of the document pane
  await page.mouse.wheel(0, 1);
  await scrollPane(page, DOC, '[data-clause="3"]', 22, 0);
  await page.waitForFunction(() => !document.body.innerText.includes("Reviewed 13 clauses"), null, { polling: 50 });
  // changes land in clauses 3, 4 and 5 (about 1.1-6.2 s after Review at the page's 2x replay)
  await clip.wait(7700);
  clip.mark("to-11");
  await scrollPane(page, DOC, '[data-clause="11"]', 120, 650);
  clip.mark("at-11");
  await clip.waitText("Reviewed 13 clauses", { label: "done", timeout: 60000 });
  await clip.wait(2800);

  // H3 / H4: one change card and its clause's decision
  clip.mark("to-g4");
  await scrollPane(page, TASK, groupFn(4), 10, 650);
  clip.mark("at-g4");
  await clip.wait(1500);
  await clip.click(page.locator('[data-card-id="C4"] button[class*="GcAi_changeMain"]'), { label: "select-C4", move: 850 });
  await clip.wait(3200);
  clip.mark("decision-hold");
  await clip.wait(6200);

  // F2a: a tracked change in clause 12, pinned to its words
  clip.mark("to-12");
  await scrollPane(page, DOC, '[data-clause="11"]', 120, 650);
  clip.mark("at-12");
  await clip.wait(1500);
  await clip.click(page.locator('[data-change-id="C16"]').first(), { label: "select-C16", move: 900 });
  await clip.wait(3600);

  // F2b: the edits the code refused
  clip.mark("to-refused");
  await scrollPane(page, TASK, 1e6, 0, 700);
  clip.mark("at-refused");
  await clip.wait(6200);

  // F3a: accept one change
  clip.mark("to-g11");
  await scrollPane(page, TASK, groupFn(11), 10, 700);
  clip.mark("at-g11");
  await clip.wait(1400);
  await clip.click(page.locator('[data-card-id="C13"]').getByRole("button", { name: "Accept" }), { label: "accept-C13", move: 850 });
  await clip.wait(3000);

  // F3b: download the Word file (13 changes still pending, so they are exported as tracked changes)
  clip.mark("docx-still");
  await clip.wait(1300);
  await clip.click(page.getByRole("button", { name: ".docx" }), { label: "docx", move: 850 });
  await clip.wait(3800);

  // proof: the finished review, wide (document at clauses 3-5, task pane at the top)
  clip.mark("to-wide");
  await scrollPane(page, TASK, 0, 0, 600);
  await scrollPane(page, DOC, '[data-clause="3"]', 22, 600);
  await page.mouse.move(1346, 420);
  clip.mark("wide");
  await clip.wait(8500);
  await clip.finish();
}

const takes = { before, review };
(async () => {
  const which = process.argv[2] || "review";
  if (!takes[which]) throw new Error("unknown take " + which + " (" + Object.keys(takes).join(", ") + ")");
  fs.mkdirSync(path.join(FILM, "raw"), { recursive: true });
  await takes[which]();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

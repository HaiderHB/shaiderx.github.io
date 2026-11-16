// GC AI capture script. Run from video/: node films/gc-ai/capture/record.cjs <clip>
// Then: npm run footage -- films/gc-ai   (builds assets/footage/*.mp4 + data/clips/*.json)
// The demo runs from an isolated copy of the worktree (next build && next start -p 3167), with no
// demo key: the page is in preview mode and Review replays the recorded live run of the playbook
// (example.js, recorded on the Vercel preview), replayed faster by the page. The film labels it.
const path = require("path");
const cap = require("../../../kit/scripts/capture.cjs");

const FILM = path.join(__dirname, "..");
const BASE = process.env.DEMO_URL || "http://localhost:3167/demo/gc-ai/";

const group = (n) => ({
  fn: new Function(
    "d",
    `return [...d.querySelectorAll('li[class*="GcAi_group"]')].find((li) => li.querySelector('[class*="GcAi_clauseNo"]')?.textContent === '§${n}')`
  ),
  clip: true,
});
// tracked functions are serialised into the page, so the title is baked into the source
const card = (title) =>
  new Function(
    "d",
    `return [...d.querySelectorAll("h3")].find((h) => h.textContent.trim() === ${JSON.stringify(title)})?.closest('[class*="Panel_card__"]')`
  );

// component name -> CSS selector or (document) => Element. Track every component a shot will focus on.
const TRACK = {
  page: "main",
  window: '[class*="GcAi_window__"]',
  windowBar: '[class*="GcAi_windowBar"]',
  docPane: '[class*="GcAi_docPane"]',
  paper: { sel: '[class*="GcAi_paper"]', clip: true },
  taskPane: 'aside[aria-label="Redline assistant"]',
  taskHead: '[class*="GcAi_taskHead"]',
  taskBody: '[class*="GcAi_taskBody"]',
  setup: { sel: 'form[class*="GcAi_setup"]', clip: true },
  progress: { sel: '[class*="GcAi_progress"]', clip: true },
  taskFoot: '[class*="GcAi_taskFoot"]',
  refused: { sel: '[class*="GcAi_refused"]', clip: true },
  g4: group(4),
  g5: group(5),
  g6: group(6),
  g7: group(7),
  g11: group(11),
  g12: group(12),
  c4: { sel: '[data-clause="4"]', clip: true },
  c5: { sel: '[data-clause="5"]', clip: true },
  c7: { sel: '[data-clause="7"]', clip: true },
  c11: { sel: '[data-clause="11"]', clip: true },
  c12: { sel: '[data-clause="12"]', clip: true },
  glance: '[class*="GcAi_glance__"]',
  anchoring: "#anchoring",
  flow: '#anchoring [class*="Timeline_flow"]',
  checks: card("Anchoring checks"),
  rawEdit: card("One edit, as the model sent it"),
};

const scrollToReview = (page) =>
  page.evaluate(() => {
    const top = document.querySelector("#review").getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top - 78);
  });

// Smoothly scrolls the task pane so a clause group sits near its top (inside the pane, not the page)
const scrollTaskTo = (page, n, ms = 700) =>
  page.evaluate(
    ([n, ms]) =>
      new Promise((res) => {
        const pane = document.querySelector('[class*="GcAi_taskBody"]');
        const li = [...pane.querySelectorAll('li[class*="GcAi_group"]')].find(
          (el) => el.querySelector('[class*="GcAi_clauseNo"]')?.textContent === "§" + n
        );
        const to = pane.scrollTop + li.getBoundingClientRect().top - pane.getBoundingClientRect().top - 8;
        const from = pane.scrollTop, s = performance.now();
        const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
        const step = (now) => {
          const p = Math.min(1, (now - s) / ms);
          pane.scrollTop = from + (to - from) * ease(p);
          if (p < 1) requestAnimationFrame(step);
          else res();
        };
        requestAnimationFrame(step);
      }),
    [n, ms]
  );

// s1: Review the Customer-side SaaS playbook (recorded live run, replayed by the page), then
// select a change, accept one, Accept all, No markup, download the .docx
async function s1() {
  const clip = await cap.startClip({ film: FILM, name: "s1", url: BASE, track: TRACK });
  const { page } = clip;
  await scrollToReview(page);
  // the page auto-plays the example when the document comes into view; let it finish (pre-roll)
  await page.waitForFunction(() => document.body.innerText.includes("Reviewed 13 clauses"), null, { timeout: 60000 });
  // both panes back to the top, so the playbook picker and the start of the contract show
  await page.evaluate(() => {
    document.querySelector('[class*="GcAi_taskBody"]').scrollTop = 0;
    document.querySelector('[class*="GcAi_docPane"]').scrollTop = 0;
  });
  await page.waitForTimeout(600);
  await page.mouse.move(1990, 1120);
  clip.setCursor(1990, 1120);
  await clip.begin();
  await clip.wait(500);
  await clip.click(page.getByRole("button", { name: "Review", exact: true }), { label: "review", move: 900 });
  // the previous run's "Reviewed 13 clauses" goes away first, then the replay finishes
  await page.waitForFunction(() => !document.body.innerText.includes("Reviewed 13 clauses"), null, { polling: 50 });
  await clip.waitText("Reviewed 13 clauses", { label: "done", timeout: 60000 });
  await clip.wait(900);
  await scrollTaskTo(page, 11);
  clip.mark("task-at-11");
  await clip.wait(600);
  const g11 = page.locator('li[class*="GcAi_group"]').filter({ hasText: "Limitation of Liability" });
  await clip.click(g11.locator('button[class*="GcAi_changeMain"]').first(), { label: "select", move: 800 });
  await clip.wait(1600);
  await clip.click(g11.getByRole("button", { name: "Accept" }).first(), { label: "accept1", move: 600 });
  await clip.wait(1400);
  await clip.click(page.getByRole("button", { name: "Accept all" }), { label: "acceptAll", move: 700 });
  await clip.wait(1600);
  await clip.click(page.getByRole("button", { name: "No markup" }), { label: "clean", move: 900 });
  await clip.wait(2600);
  await clip.click(page.getByRole("button", { name: ".docx" }), { label: "docx", move: 900 });
  await clip.wait(1800);
  await clip.finish();
}

// s2: the anchoring section: pipeline, the six checks (run in the browser) and one raw edit
async function s2() {
  const clip = await cap.startClip({ film: FILM, name: "s2", url: BASE, track: TRACK });
  const { page } = clip;
  await scrollToReview(page);
  await page.waitForFunction(() => document.body.innerText.includes("Reviewed 13 clauses"), null, { timeout: 60000 });
  await page.evaluate(() => {
    const top = document.querySelector("#anchoring").getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top - 84);
  });
  await page.waitForTimeout(800);
  await page.mouse.move(1990, 1120);
  clip.setCursor(1990, 1120);
  await clip.begin();
  await clip.wait(800);
  await clip.moveTo(700, 640, 1200);
  await clip.wait(1500);
  await clip.moveTo(760, 840, 1000);
  await clip.wait(2600);
  await clip.finish();
}

const clips = { s1, s2 };
(async () => {
  const which = process.argv[2] || "s1";
  if (!clips[which]) throw new Error("unknown clip " + which);
  await clips[which]();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

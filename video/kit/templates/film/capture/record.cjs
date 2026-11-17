// {{COMPANY}} capture script (kit 2, launch format). Run from video/: node films/{{SLUG}}/capture/record.cjs <take>
// Then: npm run footage -- films/{{SLUG}}   (builds assets/footage/*.mp4 + data/clips/*.json)
// The demo runs from an ISOLATED copy of the worktree (see video/README.md: never run `next` in the shared
// worktree): next build && next start -p 3160. Prefer the page's example run / same-day cached runs; a live
// run costs money. Label what you use (data-kit-run on the film root + a chip on screen).
//
// Launch-format capture: 2x device pixels at a 1360x765 viewport, so the page is already 1.41x on the 1920
// stage and 1.4-2x camera zooms stay sharp; the cursor is about 1.5x a system arrow, hides when idle and rests
// 450 ms before every click. Record real holds: ~1.3 s still before each action, >= 2.5 s after it.
const path = require("path");
const cap = require("../../../kit/scripts/capture.cjs");

const FILM = path.join(__dirname, "..");
const BASE = process.env.DEMO_URL || "http://localhost:3160/demo/{{SLUG}}/";
const VIEW = { viewport: { width: 1360, height: 765 }, deviceScaleFactor: 2, cursor: { scale: 0.75, idleHide: 1200 }, clickPause: 450, quality: 92 };

// component name -> CSS selector, (document) => Element, or {sel | fn, clip: true} for things inside scroll panes.
// Track every component a shot or a spotlight focuses on: ONE card, ONE clause, ONE button, not whole panes.
const TRACK = {
  window: "main",
  // input: "#email-card",
  // runButton: (d) => [...d.querySelectorAll("button")].find((b) => b.textContent.trim() === "Run agent"),
  // card: { sel: '[data-card-id="C4"]', clip: true },
};

async function demo() {
  const clip = await cap.startClip(Object.assign({ film: FILM, name: "demo", url: BASE, track: TRACK }, VIEW));
  const { page } = clip;
  await page.waitForTimeout(800); // pre-roll: set the page up here (not in the footage)
  await page.mouse.move(1346, 420); // park the cursor in a gutter; it fades out after 1.2 s
  clip.setCursor(1346, 420);
  await page.waitForTimeout(1500);
  await clip.begin();
  await clip.wait(1400); // still
  // await clip.click(page.getByRole("button", { name: "Run agent" }), { label: "run", move: 900 }); // ONE action
  // await clip.waitText("Reply drafted", { label: "done" });
  await clip.wait(2800); // the result holds
  // scroll panes yourself between shots (page.evaluate + requestAnimationFrame), mark each step: clip.mark("at-card")
  await clip.finish();
}

const takes = { demo };
(async () => {
  const which = process.argv[2] || "demo";
  if (!takes[which]) throw new Error("unknown take " + which);
  await takes[which]();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

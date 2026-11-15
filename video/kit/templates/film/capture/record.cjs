// {{COMPANY}} capture script. Run from video/: node films/{{SLUG}}/capture/record.cjs <clip>
// Then: npm run footage -- films/{{SLUG}}   (builds assets/footage/*.mp4 + data/clips/*.json)
// The demo runs locally from the portfolio worktree (npm run dev -- -p 3160, .env.local there).
// Prefer the page's example run / same-day cached runs; a live run costs money. Label what you use.
const path = require("path");
const cap = require("../../../kit/scripts/capture.cjs");

const FILM = path.join(__dirname, "..");
const BASE = process.env.DEMO_URL || "http://localhost:3160/demo/{{SLUG}}/";

// component name -> CSS selector or (document) => Element. Track every component a shot will focus on.
const TRACK = {
  page: "main",
  // email: "#email-card",
  // runButton: (d) => [...d.querySelectorAll("button")].find((b) => b.textContent.trim() === "Run agent"),
};

async function s1() {
  const clip = await cap.startClip({ film: FILM, name: "s1", url: BASE, track: TRACK });
  const { page } = clip;
  await page.waitForTimeout(800); // pre-roll: set the page up here (not in the footage)
  await page.mouse.move(1990, 1120);
  clip.setCursor(1990, 1120);
  await clip.begin();
  await clip.wait(800);
  // await clip.click(page.getByRole("button", { name: "Run agent" }), { label: "run" });
  // await clip.waitText("Reply drafted", { label: "done" });
  await clip.wait(2000);
  await clip.finish();
}

const clips = { s1 };
(async () => {
  const which = process.argv[2] || "s1";
  if (!clips[which]) throw new Error("unknown clip " + which);
  await clips[which]();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

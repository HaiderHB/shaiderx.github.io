// Great Question capture (v3, on the "demo UI revamp" page): ONE live voice interview take, then the
// Trace view, findings and an MCP get_quote call.
// Run from video/:  KEYFILE=/path/key-great-question.txt node films/great-question/capture/record.cjs take3a
//   KEYFILE holds the private demo URL (?k=...); only its path and query are used, the host becomes
//   DEMO_ORIGIN (default http://localhost:3180). The key is never printed.
//   node films/great-question/capture/record.cjs check3   the guide's static example check (no API call)
// Then: node kit/scripts/build-footage.mjs films/great-question take3a check3
//
// The demo runs locally (next start -p 3180, .env.local, from an isolated copy of the repo). Each take is a
// live run: the opening line (Fish TTS, cached after the first call), up to 4 voice turns (Fish ASR ->
// DeepSeek V3.2 via fal -> Fish TTS at 1.15x), one Jev guardrail check per moderator line, one DeepSeek
// findings call. The MCP call is free (runs in the browser).
// The participant is SIMULATED: Fish stock voice "Selene" at 1.15x (capture/gen-answers.mjs,
// capture/tighten.py -> raw/answers3/*.tight.wav), played into the page's getUserMedia stream by
// kit/scripts/fake-mic.cjs, so the page's real MediaRecorder + silence detector + upload path runs.
// v3 is text-first: none of this audio goes into the film; it only drives the live interview.
// Answers are picked by keyword to fit the moderator's live question (pick()); when no prepared answer
// fits, the script writes raw/<clip>/need-<k>.json with the question and waits (up to 8 min) for a
// hand-written answer raw/answers3/m<k>.tight.wav (gen-answers.mjs m<k>="..." + tighten.py).
// Saved next to the frames (raw/<clip>/): mod<N>.mp3 + turn<N>.json, mic-take<N>.webm, guardrail.ndjson,
// findings.ndjson, audio.json (fake-mic: answer + playback times + dock phases), net.json, transcript.txt.
const fs = require("fs");
const path = require("path");
const cap = require("../../../kit/scripts/capture.cjs");
const mic = require("../../../kit/scripts/fake-mic.cjs");

const FILM = path.join(__dirname, "..");
const ANSWERS = path.join(FILM, "raw", "answers3");
const ORIGIN = process.env.DEMO_ORIGIN || "http://localhost:3180";
const keyUrl = new URL(fs.readFileSync(process.env.KEYFILE, "utf8").trim());
const URL_LIVE = `${ORIGIN}${keyUrl.pathname}${keyUrl.search}`;
const CARD_TOP = 86; // viewport y of the interview card: below the sticky site bar (0-68 px), card bottom ~1053
const SEC_TOP = 92; // viewport y of a section head after scrolling to it

const q = (cls) => `[class*="GreatQuestion_${cls}__"]`;
const nth = (sel, i) => new Function("d", `return d.querySelectorAll(${JSON.stringify(sel)})[${i}] || null`);
const inLi = (liSel, i, inner) =>
  new Function("d", `const li = d.querySelectorAll(${JSON.stringify(liSel)})[${i}]; return li ? li.querySelector(${JSON.stringify(inner)}) : null`);
const modLi = `ol${q("transcript")} > li[data-role="moderator"]`;
const partLi = `ol${q("transcript")} > li[data-role="participant"]`;
const FIND = 'section[aria-label="Findings"]';
const MCP = 'section[aria-label="MCP tools"]';

// component name -> selector / (document) => Element / {sel|fn, clip: true}. Every shot focus and
// annotation box comes from these. Transcript items live in a scroll pane: clip: true.
const TRACK = {
  card: q("interviewCard"),
  cardHead: `${q("interviewCard")} > [class*="Panel_head"]`,
  dock: q("stage"),
  meter: q("voiceMeter"),
  dockState: q("voiceState"),
  answerBtn: { fn: (d) => [...d.querySelectorAll('[class*="GreatQuestion_stage"] button')].find((b) => /Answer|Done|Play reply/.test(b.textContent)) || null },
  endBtn: { fn: (d) => [...d.querySelectorAll('[class*="GreatQuestion_stage"] button')].find((b) => /End interview/.test(b.textContent)) || null },
  conversation: q("conversation"),
  status: q("statusRow"),
  miniGuide: q("miniGuide"),
  transcript: `ol${q("transcript")}`,
  guide: 'section[aria-label="Discussion guide"]',
  coverage: q("coverage"),
  questions: `ol${q("questions")}`,
  currentQ: `ol${q("questions")} > li[data-state="current"]`,
  guardrail: 'section[aria-label="Guardrail"]',
  trace: q("trace"),
  traceHead: `${q("trace")} > [class*="Panel_cardHead"]`,
  traceGrid: q("traceGrid"),
  tracePlot1: nth(q("tracePlot"), 0),
  tracePlot2: nth(q("tracePlot"), 1),
  tracePlot3: nth(q("tracePlot"), 2),
  traceLegend: q("traceLegend"),
  exampleCheck: q("exampleCheck"),
  exampleBad: nth(q("exampleItem"), 0),
  findingsSec: FIND,
  findingsHead: `${FIND} > [class*="Panel_head"]`,
  genButton: `${FIND} [class*="Panel_head"] button`,
  findingsSummary: `${FIND} ${q("findingsSummary")}`,
  findingsGrid: `${FIND} ${q("findings")}`,
  mcpSec: MCP,
  mcpHead: `${MCP} > [class*="Panel_head"]`,
  mcpCol1: nth(q("mcpCol"), 0),
  mcpCol2: nth(q("mcpCol"), 1),
  toolPicker: '[role="group"][aria-label="Tool"]',
  toolDef: q("toolDef"),
  callBox: q("callBox"),
  runBtn: q("runButton"),
};
for (let i = 0; i < 6; i++) {
  TRACK[`mod${i + 1}`] = { fn: nth(modLi, i), clip: true };
  TRACK[`modText${i + 1}`] = { fn: inLi(modLi, i, q("turnText")), clip: true };
  TRACK[`badges${i + 1}`] = { fn: inLi(modLi, i, '[class*="Badges_badgeRow"]'), clip: true };
  TRACK[`timing${i + 1}`] = { fn: inLi(modLi, i, q("turnTiming")), clip: true };
  TRACK[`part${i + 1}`] = { fn: nth(partLi, i), clip: true };
  TRACK[`partText${i + 1}`] = { fn: inLi(partLi, i, q("turnText")), clip: true };
  TRACK[`lead${i + 1}`] = { fn: inLi(modLi, i, '[class*="Badges_badgeRow"] > [class*="Badges_score"]'), clip: true };
}
for (let i = 0; i < 5; i++) {
  TRACK[`finding${i + 1}`] = nth(`${FIND} article${q("finding")}`, i);
  TRACK[`fquote${i + 1}`] = nth(`${FIND} blockquote${q("quote")}`, i);
  TRACK[`ftitle${i + 1}`] = nth(`${FIND} ${q("findingTitle")}`, i);
}
TRACK.traceLeadVal = new Function("d", `const p = d.querySelectorAll(${JSON.stringify(q("tracePlot"))})[0]; return p ? p.querySelector("strong") : null`);
TRACK.traceLeadSpark = new Function("d", `const p = d.querySelectorAll(${JSON.stringify(q("tracePlot"))})[0]; return p ? p.querySelector("svg") : null`);
for (let i = 0; i < 3; i++) TRACK[`mcpPre${i + 1}`] = new Function("d", `const c = d.querySelectorAll(${JSON.stringify(q("mcpCol"))})[1]; return c ? c.querySelectorAll("pre")[${i}] || null : null`);
// get_quote result fields: the value span after the LAST key of that name in the result JSON (structuredContent)
for (const [name, key] of [["mcpQuote", '"text"'], ["mcpTurn", '"turn"'], ["mcpTime", '"timestamp"'], ["mcpFinding", '"finding_id"']])
  TRACK[name] = new Function("d", `const c = d.querySelectorAll(${JSON.stringify(q("mcpCol"))})[1]; const pre = c && c.querySelectorAll("pre")[1]; if (!pre) return null; const ks = [...pre.querySelectorAll('[class*="JsonView_key"]')].filter((k) => k.textContent === ${JSON.stringify(key)}); const k = ks.at(-1); return k ? k.nextElementSibling : null`);

// Which prepared answer fits the moderator's last question (the moderator is a live LLM).
const RULES = {
  2: [
    [/last time|most recent|an example|a time when|specific time|walk me through (the|that) last/, "a2_story"],
    [/mean by|what do you mean|what makes|\bwhy\b/, "a2_mean"],
    [/tell me (more )?about|stall|stuck|nightmare/, "a2_story"],
    [/\bwho\b/, "a2_who"],
    [/\bdone\b|counts? as|finished|complete/, "a2_done"],
    [/hand(s|ed)? (it |the account )?(off|over)|handoff|hand-off|from sales|\bsales\b/, "a2_handoff"],
    [/what happens (next|then|after)|after that|and then|next step/, "a2_next"],
  ],
  3: [
    [/find out|found out|notice|realiz|discover|how did you know|catch|come up|came up|learn|aware|nobody told|hear about/, "a3_found"],
    [/how long/, "a3_long"],
    [/what did you do|handle|did you try|tried|resolve|fix|unblock|happened (next|after|then)|get it (moving|unstuck|going)|what next/, "a3_next"],
    [/\bwhy\b|what caused|reason/, "a3_why"],
    [/outside|on track|tools?\b|workaround|spreadsheet|keep track/, "a3_tools"],
    [/last time|tell me about|an example/, "a2_story"],
    [/\bwho\b/, "a2_who"],
    [/\bdone\b|counts? as/, "a2_done"],
  ],
  4: [
    [/spreadsheet|what (else )?do you track|what's in it|what is in it|tell me more about/, "a4_sheet"],
    [/outside|on track|tools?\b|workaround|keep track/, "a3_tools"],
    [/find out|found out|notice|realiz|discover|how did you know/, "a3_found"],
    [/slack|reminder/, "a4_slack"],
    [/\bwhy\b/, "a4_why"],
    [/what did you do|handle|happened (next|after)|resolve/, "a3_next"],
    [/how long/, "a3_long"],
    [/\bwho\b/, "a2_who"],
  ],
};
function pick(k, text, used) {
  const t = text.toLowerCase();
  for (const [re, id] of RULES[k] || []) if (re.test(t) && !used.has(id)) return id;
  return null;
}

async function take(name) {
  const clip = await cap.startClip({
    film: FILM,
    name,
    url: URL_LIVE,
    track: TRACK,
    launch: { args: mic.CHROME_ARGS },
    init: mic.init({ watch: { dock: [q("stage"), "data-phase"] } }),
  });
  const { page } = clip;
  const OUT = clip.outDir;
  const net = [];
  const log = (type, data = {}) => {
    const e = Object.assign({ type, t: clip.t }, data);
    net.push(e);
    console.log(`${e.t.toFixed(2).padStart(7)} ${type} ${JSON.stringify(data).slice(0, 200)}`);
  };
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  let modN = 0, recN = 0;
  page.on("request", (req) => {
    const u = req.url();
    if (!u.includes("/api/demo/great-question/")) return;
    const route = u.split("/great-question/")[1].replace(/\/.*/, "");
    if (route === "turn") {
      try {
        const body = JSON.parse(req.postData() || "{}");
        if (body.audio) {
          recN++;
          fs.writeFileSync(path.join(OUT, `mic-take${recN}.webm`), Buffer.from(body.audio, "base64"));
          log("req-turn", { take: recN, mime: body.mimeType, history: (body.turns || []).length });
        } else log("req-turn", { opening: true });
      } catch (e) {
        log("req-turn-parse-error", { e: String(e) });
      }
    } else log("req-" + route);
  });
  page.on("response", async (res) => {
    const u = res.url();
    if (!u.includes("/api/demo/great-question/")) return;
    const route = u.split("/great-question/")[1].replace(/\/.*/, "");
    let text = "";
    try {
      text = (await res.body()).toString("utf8");
    } catch (e) {
      log("res-body-error", { route, e: String(e) });
      return;
    }
    if (route === "turn") {
      let data = null;
      try {
        data = JSON.parse(text);
      } catch {
        const lines = text.trim().split("\n").map((l) => JSON.parse(l));
        data = lines.find((l) => l.type === "result") || lines.find((l) => l.type === "error");
      }
      if (data && data.moderator && data.moderator.audio) {
        modN++;
        fs.writeFileSync(path.join(OUT, `mod${modN}.mp3`), Buffer.from(data.moderator.audio, "base64"));
        const copy = Object.assign({}, data, { moderator: Object.assign({}, data.moderator, { audio: `[mod${modN}.mp3]` }) });
        fs.writeFileSync(path.join(OUT, `turn${modN}.json`), JSON.stringify(copy, null, 2));
        log("res-turn", { mod: modN, status: res.status(), text: data.moderator.text, participant: data.participant && data.participant.text, timing: data.timing, done: data.done });
      } else log("res-turn", { status: res.status(), body: text.slice(0, 300) });
    } else {
      fs.appendFileSync(path.join(OUT, `${route}.ndjson`), JSON.stringify({ t: clip.t, status: res.status(), body: text }) + "\n");
      log("res-" + route, { status: res.status(), body: text.slice(0, 200) });
    }
  });

  await mic.attach(clip, { dir: ANSWERS, suffix: ".tight.wav" });
  const ids = fs.readdirSync(ANSWERS).filter((f) => f.endsWith(".tight.wav") && /^a\d/.test(f)).map((f) => f.replace(".tight.wav", ""));
  console.log("answers", JSON.stringify(await mic.load(clip, ids)));
  // pre-roll (not in the footage): interview card just below the sticky bar, cursor parked right of it
  const cardY = await clip.docY(q("interviewCard"));
  await page.evaluate((y) => window.scrollTo(0, y), cardY - CARD_TOP);
  await page.mouse.move(1720, 640);
  clip.setCursor(1720, 640);
  await page.waitForTimeout(800);

  const phase = () => page.evaluate((sel) => document.querySelector(sel)?.getAttribute("data-phase") ?? null, q("stage"));
  async function waitPhase(states, ms) {
    const end = Date.now() + ms;
    let s;
    while (Date.now() < end) {
      s = await phase();
      if (states.includes(s)) return s;
      await page.waitForTimeout(40);
    }
    throw new Error(`timeout waiting for ${states} (last ${s})`);
  }
  const rest = () => clip.moveTo(1720, 640, 700); // park the cursor right of the card, off the text

  await clip.begin();
  if (process.env.DRY) {
    await mic.speak(clip, "a1");
    await clip.wait(1500);
    await mic.collect(clip);
    await clip.finish();
    return;
  }
  await clip.wait(700);
  await clip.click(page.getByRole("button", { name: "Start voice interview" }), { label: "start", move: 750 });
  await rest();
  let s = await waitPhase(["speaking", "blocked"], 40000);
  if (s === "blocked") await clip.click(page.getByRole("button", { name: "Play reply" }), { label: "play" });
  clip.mark("mod1-speaking");
  await waitPhase(["ready"], 60000);
  clip.mark("ready1");
  const used = new Set();
  const MAX_K = +(process.env.ANSWERS || 4);
  let closed = false;
  for (let k = 1; k <= MAX_K; k++) {
    const lastMod = await page.evaluate((sel) => {
      const li = [...document.querySelectorAll(sel)].at(-1);
      const p = li && li.querySelector('[class*="GreatQuestion_turnText"]');
      return p ? p.innerText : "";
    }, modLi);
    let id = k === 1 ? "a1" : pick(k, lastMod, used);
    if (!id) {
      // manual fallback: a hand-written answer for this exact question
      id = `m${k}`;
      const need = path.join(OUT, `need-${k}.json`);
      fs.writeFileSync(need, JSON.stringify({ k, question: lastMod, used: [...used] }, null, 1));
      log("need-answer", { k, question: lastMod });
      const f = path.join(ANSWERS, `${id}.tight.wav`);
      const end = Date.now() + 8 * 60000;
      while (!fs.existsSync(f) && Date.now() < end) await clip.wait(1000);
      if (!fs.existsSync(f)) throw new Error("no manual answer for k=" + k);
      await clip.wait(500);
      console.log("loaded", JSON.stringify(await mic.load(clip, [id])));
    }
    used.add(id);
    log("pick", { k, id, question: lastMod });
    await clip.wait(500);
    await clip.click(page.getByRole("button", { name: "Answer" }), { label: `answer${k}`, move: 650 });
    await clip.wait(350);
    await mic.speak(clip, id);
    await rest();
    await waitPhase(["transcribing"], 45000);
    clip.mark(`transcribing${k}`);
    s = await waitPhase(["thinking", "speaking", "closing", "blocked", "ready"], 40000);
    s = await waitPhase(["speaking", "closing", "blocked", "ready", null], 40000);
    if (s === "ready" || s === null) throw new Error(`turn ${k} failed (phase ${s})`);
    if (s === "blocked") await clip.click(page.getByRole("button", { name: "Play reply" }), { label: "play" });
    clip.mark(`mod${k + 1}-speaking`);
    s = await waitPhase(["ready", null], 60000);
    clip.mark(`ready${k + 1}`);
    if (s === null) {
      closed = true;
      break;
    }
  }
  await clip.wait(1200);
  if (!closed) {
    const endBtn = page.getByRole("button", { name: "End interview" });
    if (await endBtn.isVisible().catch(() => false)) await clip.click(endBtn, { label: "end", move: 800 });
  }
  clip.mark("ended");
  await clip.wait(1500);

  // Trace view: wording risk across the moderator turns of this interview
  const gy = await clip.docY('section[aria-label="Guardrail"]');
  await clip.scrollTo(gy - 300, 1100);
  clip.mark("at-trace");
  await clip.wait(3200);

  // findings
  const fy = await clip.docY(FIND);
  await clip.scrollTo(fy - SEC_TOP, 1000);
  clip.mark("at-findings");
  await clip.wait(500);
  await clip.click(page.getByRole("button", { name: "Generate findings" }), { label: "findings", move: 750 });
  await clip.moveTo(1720, 520, 600);
  await page.waitForSelector(`${FIND} article${q("finding")}`, { timeout: 90000 });
  clip.mark("findings-shown");
  await clip.wait(2200);
  const gridY = await clip.docY(`${FIND} ${q("findingsSummary")}`);
  await clip.scrollTo(gridY - SEC_TOP, 1000);
  clip.mark("findings-grid");
  await clip.wait(2600);

  // MCP: get_quote
  const my = await clip.docY(MCP);
  await clip.scrollTo(my - SEC_TOP, 1000);
  clip.mark("at-mcp");
  await clip.wait(800);
  await clip.click(page.getByRole("button", { name: "get_quote" }), { label: "tool-get_quote", move: 750 });
  await clip.wait(700);
  await clip.click(page.getByRole("button", { name: "Run tool" }), { label: "run-get_quote", move: 700 });
  clip.mark("quote-shown");
  await clip.moveTo(1720, 600, 700);
  await clip.wait(1400);
  // v3: bring the whole result (structuredContent: quote, turn, timestamp, finding) into view
  const ry = await page.evaluate((sel) => {
    const c = document.querySelectorAll(sel)[1];
    const pre = c && c.querySelectorAll("pre")[1];
    return pre ? pre.getBoundingClientRect().top + window.scrollY : null;
  }, q("mcpCol"));
  if (ry != null) {
    await clip.scrollTo(ry - 150, 1000);
    clip.mark("at-result");
    await clip.wait(3600);
  }

  const transcript = await page.evaluate((sel) => [...document.querySelectorAll(sel)].map((li) => li.innerText).join("\n\n"), `ol${q("transcript")} > li`);
  fs.writeFileSync(path.join(OUT, "transcript.txt"), transcript);
  await page.screenshot({ path: path.join(OUT, "final-full.png"), fullPage: true });
  await mic.collect(clip);
  fs.writeFileSync(path.join(OUT, "net.json"), JSON.stringify({ net, errors }, null, 1));
  console.log("errors", JSON.stringify(errors));
  await clip.finish();
}

// The guide's static "Guardrail, example check" (real Jev scores the page ships with; no API call).
async function check(name) {
  const track = {
    guardrail: 'section[aria-label="Guardrail"]',
    trace: q("trace"),
    exampleCheck: q("exampleCheck"),
    exampleBad: nth(q("exampleItem"), 0),
    exampleGood: nth(q("exampleItem"), 1),
    badBadges: new Function("d", `const it = d.querySelectorAll(${JSON.stringify(q("exampleItem"))})[0]; return it ? it.querySelector('[class*="Badges_badgeRow"]') : null`),
  };
  const clip = await cap.startClip({ film: FILM, name, url: URL_LIVE, track });
  const { page } = clip;
  const gy = await clip.docY('section[aria-label="Guardrail"]');
  await page.evaluate((y) => window.scrollTo(0, y), gy - 520);
  await page.mouse.move(1720, 640);
  clip.setCursor(1720, 640);
  await page.waitForTimeout(800);
  await clip.begin();
  await clip.wait(300);
  await clip.scrollTo(gy - 300, 900);
  clip.mark("check-in-view");
  await clip.wait(3500);
  await clip.finish();
}

const which = process.argv[2] || "take3a";
(which.startsWith("check") ? check(which) : take(which)).catch((e) => {
  console.error(e);
  process.exit(1);
});

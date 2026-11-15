// Run from video/: (set -a; . ../.env.local; set +a; node films/great-question/capture/gen-answers.mjs [id ...] [id=text ...])
// Simulated participant answers (v3): Fish TTS stock voice "Selene" at 1.15x (same speed as the demo's
// moderator). Keys from env (never printed). Writes raw/answers3/<id>.mp3, .txt, .wav (48 kHz mono s16);
// then run capture/tighten.py. `id=text` makes an extra answer (the record script's manual fallback).
// The voice never reaches the film (v3 is text-first, no voice audio): it only drives the page's real
// mic -> Fish ASR path, so the transcript and the moderator's follow-ups are live.
//
// The answers are written for the moderator's likely follow-ups (record.cjs picks by keyword):
//   a1        Q1 (walk me through ...). Names a problem in strong words ("a nightmare") so the moderator
//             may echo it: a real chance for Jev to flag a leading probe (never faked).
//   a2_*      the probe after a1 (last time / what do you mean / who / done / handoff / next)
//   a3_*      Q3-ish (how did you find out / what did you do / why / how long / tools)
//   a4_*      Q4-ish (the spreadsheet / why / Slack)
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
const dir = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'raw', 'answers3');
const SELENE = 'b347db033a6549378b48d00acb0d06cd';
const SPEED = 1.15;
export const ANSWERS = {
  a1: "Sales hands the account to my team. We run a kickoff call, then their admin sets up single sign-on. Honestly, single sign-on is a nightmare. That's where accounts stall.",
  a2_story: 'Last month. Their IT person went on leave, so single sign-on sat untouched for nine days, and nobody told us.',
  a2_mean: 'It needs their IT team, and IT never treats it as urgent. Last month one account sat there for nine days.',
  a2_who: 'Me and one onboarding specialist. On their side, the admin, plus their IT person for single sign-on.',
  a2_done: 'Done means they run their first study on their own. The accounts that never get there stall at single sign-on.',
  a2_handoff: 'Sales posts the deal in a Slack channel. We book the kickoff call from there, usually within two days.',
  a2_next: "After single sign-on, their admin invites the team and runs a first study. That's when we call it done.",
  a3_found: "Honestly, by accident. I check a spreadsheet of every account in setup on Fridays. There's no alert for it.",
  a3_next: 'I emailed their admin and got their IT person on a call. It went live two days later.',
  a3_why: 'Their IT person was out, and nobody else had admin rights. We only had one contact on their side.',
  a3_long: 'Nine days. It only came up in my Friday spreadsheet check.',
  a3_tools: 'A spreadsheet of every account in setup, plus a Slack reminder to ping anyone who goes quiet for a week.',
  a4_sheet: "Kickoff date, the admin's name, and whether single sign-on is done. I update it by hand every Friday.",
  a4_why: "Because the product has no alert for a stalled setup. If I'm out, nobody checks.",
  a4_slack: 'It pings me when an account has been quiet for a week. Then I email their admin myself.',
};
async function speak(text) {
  const r = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.FISH_AUDIO_API_KEY}`, 'content-type': 'application/json', model: 's2.1-pro' },
    body: JSON.stringify({ text, reference_id: SELENE, format: 'mp3', mp3_bitrate: 128, temperature: 0.7, top_p: 0.7,
      prosody: { speed: SPEED, volume: 0, normalize_loudness: true }, normalize: true, latency: 'normal' }),
  });
  if (!r.ok) throw new Error(`tts ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return Buffer.from(await r.arrayBuffer());
}
if (process.argv[1] && process.argv[1].endsWith('gen-answers.mjs')) {
  fs.mkdirSync(dir, { recursive: true });
  const args = process.argv.slice(2);
  const extra = Object.fromEntries(args.filter((a) => a.includes('=')).map((a) => [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)]));
  const only = args.filter((a) => !a.includes('='));
  const todo = Object.keys(extra).length ? extra : Object.fromEntries(Object.entries(ANSWERS).filter(([id]) => !only.length || only.includes(id)));
  for (const [id, text] of Object.entries(todo)) {
    const mp3 = await speak(text);
    const base = path.join(dir, id);
    fs.writeFileSync(`${base}.mp3`, mp3);
    fs.writeFileSync(`${base}.txt`, text);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', `${base}.mp3`, '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', `${base}.wav`]);
    const d = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', `${base}.wav`]).toString().trim();
    console.log(id, d, 's');
  }
}

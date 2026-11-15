// Run from video/: (set -a; . ../.env.local; set +a; node films/great-question/capture/gen-answers.mjs [id ...])
// Simulated participant answers: Fish TTS stock voice "Selene" at 1.15x (same speed as the demo's
// moderator). Keys from env (never printed). Writes answers/<id>.mp3, .txt, .wav (48 kHz mono s16).
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
const dir = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'raw', 'answers');
const SELENE = 'b347db033a6549378b48d00acb0d06cd';
const SPEED = 1.15;
const ANSWERS = {
  a1: "My team runs a kickoff call, then their admin sets up single sign-on. That's usually where it stalls.",
  a2_story: "Two weeks ago. Their IT person was on leave, so single sign-on sat there for nine days before we noticed.",
  a2_who: "Me and one onboarding specialist. On their side, the admin, and their IT person for single sign-on.",
  a2_done: "Done means three weeks of use without a call from us. The ones that stall, stall at single sign-on.",
  a2_mean: "Their admin needs IT to set up single sign-on. Two weeks ago, one account sat there for nine days.",
  a3_found: "Honestly, by accident. I check a spreadsheet on Fridays. There's no alert for it.",
  a3_next: "I emailed the admin and got their IT person on a call. It went live two days later.",
  a3_tools: "A spreadsheet of every account in setup, checked on Fridays. There's no alert in the product.",
  a3_long: "Nine days. It only came up in my Friday spreadsheet check.",
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
fs.mkdirSync(dir, { recursive: true });
const only = process.argv.slice(2);
for (const [id, text] of Object.entries(ANSWERS)) {
  if (only.length && !only.includes(id)) continue;
  const mp3 = await speak(text);
  const base = path.join(dir, id);
  fs.writeFileSync(`${base}.mp3`, mp3);
  fs.writeFileSync(`${base}.txt`, text);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', `${base}.mp3`, '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', `${base}.wav`]);
  const d = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', `${base}.wav`]).toString().trim();
  console.log(id, d, 's');
}

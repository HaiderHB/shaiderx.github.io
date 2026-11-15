// POST /api/demo/great-question/turn/
//   {}                                          -> the opening line (text + speech)
//   { audio: base64, mimeType, turns: [...] }   -> one voice turn
// A voice turn is Fish Audio ASR (participant audio to text), DeepSeek via fal (the next
// moderator line, same prompt and model as typed mode), then Fish Audio TTS (line to MP3).
// Reply: { participant: { text }, moderator: { text, audio: base64 mp3 }, done, timing }.
// With stream: true the reply is NDJSON instead: a `participant` event as soon as ASR is done
// (so the page can show the transcript while the moderator thinks), then a `result` event
// carrying the same object, or an `error` event.
import crypto from 'crypto';
import { COST, clampText, demoApi } from 'demos/api';
import { FISH_VOICES, chat, fishSpeak, fishTranscribe } from 'demos/models';
import { cached, getJSON, setJSON } from 'demos/store';
import { MAX_ANSWERS, OPENING_LINE } from 'pages/demo/great-question/study';
import {
  cleanLine,
  countAnswers,
  isClosingLine,
  moderatorRequest,
  readTurns,
} from './moderator';

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } };

// Fish Audio stock library voice ("a steady and reliable narrator"): even and unhurried,
// which suits a moderator who should not sound like they favor an answer.
const VOICE = FISH_VOICES.adrian;
// Spoken a little faster than Fish's default pace: at 1.0 the moderator drags between turns.
const SPEED = 1.15;
const MAX_AUDIO_BYTES = 1_200_000; // 45 s of opus or AAC is a few hundred KB
const LINE_TTL = 7 * 86_400;
const OPENING_TTL = 30 * 86_400;
const OPENING_FLAG = `gq:opening:${VOICE}:${SPEED}`;

// MediaRecorder types: Chromium and Firefox record webm/opus, Safari records mp4 (AAC).
const EXTENSIONS = {
  'audio/webm': 'webm',
  'audio/mp4': 'mp4',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
};

const hash = text => crypto.createHash('sha256').update(text).digest('hex').slice(0, 32);

/** Moderator speech as base64 MP3, cached by voice and exact text. */
const speak = (text, ttl = LINE_TTL) =>
  cached(`gq:tts:${VOICE}:${SPEED}:${hash(text)}`, ttl, async () =>
    (await fishSpeak({ text, voice: VOICE, speed: SPEED, bitrate: 64 })).toString('base64')
  );

// A turn is ASR + LLM + TTS. The opening is one TTS call the first time, then free.
async function cost(req) {
  if (req.body?.audio) return COST.voice + COST.llm;
  return (await getJSON(OPENING_FLAG)) ? COST.free : COST.voice;
}

const fail = (res, status, error, code) => res.status(status).json({ error, code });

export default demoApi(
  async (req, res) => {
    const body = req.body || {};

    if (!body.audio) {
      const audio = await speak(OPENING_LINE, OPENING_TTL);
      await setJSON(OPENING_FLAG, true, OPENING_TTL);
      return res.status(200).json({
        participant: null,
        moderator: { text: OPENING_LINE, audio },
        done: false,
      });
    }

    const turns = readTurns(body);
    const answered = countAnswers(turns);
    if (answered >= MAX_ANSWERS) {
      return fail(res, 400, 'This interview has reached its length limit.', 'input');
    }

    const mimeType = String(body.mimeType || '')
      .split(';')[0]
      .trim()
      .toLowerCase();
    const extension = EXTENSIONS[mimeType];
    if (!extension || typeof body.audio !== 'string') {
      return fail(
        res,
        400,
        'This browser recorded an audio format I cannot read.',
        'input'
      );
    }
    const audio = Buffer.from(body.audio, 'base64');
    if (audio.length > MAX_AUDIO_BYTES) {
      return fail(
        res,
        413,
        'That answer is too long. Keep it under 45 seconds.',
        'input'
      );
    }

    const timing = {};
    let started = Date.now();
    const heard =
      audio.length < 800
        ? { text: '' }
        : await fishTranscribe(audio, { mimeType, fileName: `answer.${extension}` });
    timing.asr = Date.now() - started;
    // Fish tags non-speech sounds ("[beep]", "[music]"); an answer needs actual words.
    const text = clampText(heard.text, 1200)
      .replace(/\[[^\]]*\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!/\p{L}/u.test(text)) {
      return fail(res, 422, "I didn't catch that. Tap Answer and try again.", 'silence');
    }
    const participant = { text, duration: heard.duration ?? null };

    const stream = body.stream === true;
    const send = event => res.write(`${JSON.stringify(event)}\n`);
    if (stream) {
      res.writeHead(200, {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      });
      send({ type: 'participant', ...participant });
    }

    try {
      started = Date.now();
      const reply = await chat(
        moderatorRequest([...turns, { role: 'participant', text }], {
          mode: 'voice',
          maxTokens: 160,
        })
      );
      timing.llm = Date.now() - started;
      const line = cleanLine(reply);
      if (!line) throw new Error('Empty moderator reply');

      started = Date.now();
      const speech = await speak(line);
      timing.tts = Date.now() - started;

      const result = {
        participant,
        moderator: { text: line, audio: speech },
        done: isClosingLine(line) || answered + 1 >= MAX_ANSWERS,
        timing,
      };
      if (!stream) return res.status(200).json(result);
      send({ type: 'result', ...result });
      return res.end();
    } catch (error) {
      console.error('[great-question/turn]', error);
      const message = 'The moderator did not answer. Tap Answer to try again.';
      if (!stream) return fail(res, 502, message, 'upstream');
      send({ type: 'error', error: message, code: 'upstream' });
      return res.end();
    }
  },
  { cost, requireKey: true }
);

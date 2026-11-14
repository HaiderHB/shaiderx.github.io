// Shared by the typed (moderate.api.js) and voice (turn.api.js) routes: one moderator prompt,
// one model (DeepSeek through fal, DEMO_LLM), one history format. Not a route itself.
import { clampText } from 'demos/api';
import { DEMO_LLM } from 'demos/models';
import {
  CLOSING_LINE,
  MAX_ANSWERS,
  moderatorInstructions,
} from 'pages/demo/great-question/study';

const plain = text =>
  String(text).toLowerCase().replace(/[‘’]/g, "'").replace(/[.!]/g, '').trim();

/** True when a moderator line contains the closing line from the prompt. */
export const isClosingLine = text => plain(text).includes(plain(CLOSING_LINE));

/** Prior turns from the request body: [{ role, text }], clamped and trimmed to recent ones. */
export function readTurns(body) {
  const raw = Array.isArray(body?.turns) ? body.turns.slice(-(MAX_ANSWERS * 3)) : [];
  return raw
    .map(turn => ({
      role: turn?.role === 'moderator' ? 'moderator' : 'participant',
      text: clampText(turn?.text, 700).replace(/\s+/g, ' ').trim(),
    }))
    .filter(turn => turn.text);
}

export const countAnswers = turns =>
  turns.filter(turn => turn.role === 'participant').length;

/**
 * chat() / chatStream() options for the next moderator line. The participant "joins" with a
 * short first message so the history always starts with a user turn. On the last allowed
 * answer, the prompt gets the same time check the instructions tell the moderator to expect.
 */
export function moderatorRequest(turns, { mode, maxTokens }) {
  const messages = [{ role: 'user', content: "Hi, I'm ready to start." }];
  for (const turn of turns) {
    messages.push({
      role: turn.role === 'moderator' ? 'assistant' : 'user',
      content: turn.text,
    });
  }
  const last = countAnswers(turns) >= MAX_ANSWERS;
  return {
    provider: DEMO_LLM.provider,
    model: DEMO_LLM.model(),
    system: `${moderatorInstructions(mode)}${
      last ? "\n\nTime check: that was the participant's last answer. Wrap up now." : ''
    }`,
    messages,
    maxTokens,
    temperature: 0.6,
  };
}

/** Cleans a model reply for display and speech: no markdown, quotes or speaker labels. */
export function cleanLine(text) {
  return clampText(text, 600)
    .replace(/^\s*(moderator|ai moderator)\s*:\s*/i, '')
    .replace(/[*_#`]+/g, '')
    .replace(/^["“]+|["”]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

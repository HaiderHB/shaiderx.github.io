// POST /api/demo/great-question/moderate/  { turns: [{ role: 'moderator' | 'participant', text }] }
// Text-mode fallback: the same moderator as the voice session, streamed as plain text.
import { COST, clampText, demoApi, startStream } from 'demos/api';
import { chatStream } from 'demos/models';
import { MAX_TEXT_ANSWERS, moderatorInstructions } from 'pages/demo/great-question/study';

export const config = { api: { bodyParser: { sizeLimit: '40kb' } } };

export default demoApi(
  async (req, res) => {
    const turns = Array.isArray(req.body?.turns)
      ? req.body.turns.slice(-(MAX_TEXT_ANSWERS * 3))
      : [];
    const answers = turns.filter(turn => turn?.role === 'participant').length;
    if (answers > MAX_TEXT_ANSWERS) {
      return res
        .status(400)
        .json({ error: 'This interview has reached its length limit.', code: 'input' });
    }

    const messages = [{ role: 'user', content: "Hi, I'm ready to start." }];
    for (const turn of turns) {
      const content = clampText(turn?.text, 700).trim();
      if (!content) continue;
      messages.push({ role: turn.role === 'moderator' ? 'assistant' : 'user', content });
    }

    const model = process.env.DEMO_CHAT_MODEL || 'gpt-6-luna';
    // Reasoning off by default for a fast conversational turn; set DEMO_CHAT_REASONING
    // when overriding the model with another reasoning model.
    const reasoningEffort = process.env.DEMO_CHAT_MODEL
      ? process.env.DEMO_CHAT_REASONING
      : 'none';

    const stream = startStream(res);
    for await (const text of chatStream({
      model,
      system: moderatorInstructions('text'),
      messages,
      maxTokens: 220,
      reasoningEffort,
    })) {
      stream.write(text);
    }
    stream.end();
  },
  { cost: COST.llm }
);

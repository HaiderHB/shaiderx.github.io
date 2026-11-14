// POST /api/demo/great-question/moderate/  { turns: [{ role: 'moderator' | 'participant', text }] }
// Typed mode: the same moderator prompt and model as the voice route, streamed as plain text.
import { COST, demoApi, startStream } from 'demos/api';
import { chatStream } from 'demos/models';
import { MAX_ANSWERS } from 'pages/demo/great-question/study';
import { countAnswers, moderatorRequest, readTurns } from './moderator';

export const config = { api: { bodyParser: { sizeLimit: '40kb' } } };

export default demoApi(
  async (req, res) => {
    const turns = readTurns(req.body);
    if (countAnswers(turns) > MAX_ANSWERS) {
      return res
        .status(400)
        .json({ error: 'This interview has reached its length limit.', code: 'input' });
    }

    const stream = startStream(res);
    for await (const text of chatStream(
      moderatorRequest(turns, { mode: 'text', maxTokens: 220 })
    )) {
      stream.write(text);
    }
    stream.end();
  },
  { cost: COST.llm }
);

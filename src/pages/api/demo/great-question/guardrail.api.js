// POST /api/demo/great-question/guardrail/  { question, previousAnswer }
// Checks one moderator turn with Jev: four typed questions in a single call, answered as
// probabilities (leading, double-barreled, off-guide, and where it sits in the guide).
import crypto from 'crypto';
import { COST, clampText, demoApi } from 'demos/api';
import { askJev, jevQuestion } from 'demos/models';
import { cached } from 'demos/store';
import { GUIDE } from 'pages/demo/great-question/study';

export const config = { api: { bodyParser: { sizeLimit: '8kb' } } };

const QUESTIONS = {
  leading: jevQuestion.noul(
    'The moderator_turn is a leading question: it suggests an answer, assumes how the participant feels, or invites them to agree.',
    {
      true: 'Suggests, presumes or rewards a particular answer',
      false: 'Open and neutral; any answer is equally easy to give',
    }
  ),
  double_barreled: jevQuestion.noul(
    'The moderator_turn asks about two or more different things at once, so one answer cannot address each of them.',
    {
      true: 'Two or more separate questions or topics in one ask',
      false: 'A single question about a single thing',
    }
  ),
  off_guide: jevQuestion.noul(
    'The moderator_turn is off-guide: it is not a discussion_guide question, not a follow-up on participant_previous_answer, and not an opening or closing of the interview.',
    {
      true: 'Unrelated to the guide and to what the participant just said',
      false: 'A guide question, a follow-up on the last answer, or an opening or closing',
    }
  ),
  guide_position: jevQuestion.choice(
    'Which discussion_guide question is the moderator_turn asking or following up on?',
    {
      ...Object.fromEntries(GUIDE.map(q => [q.id, q.text])),
      wrapup: 'Thanks the participant and ends the interview without asking anything new',
      other: 'None of the guide questions',
    }
  ),
};

export default demoApi(
  async (req, res) => {
    const question = clampText(req.body?.question, 600).trim();
    const previousAnswer = clampText(req.body?.previousAnswer, 800).trim();
    if (!question)
      return res.status(400).json({ error: 'Nothing to check.', code: 'input' });

    const state = {
      discussion_guide: GUIDE.map(q => ({ id: q.id, question: q.text })),
      participant_previous_answer: previousAnswer || '(none: this is the opening turn)',
      moderator_turn: question,
    };
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(state))
      .digest('hex')
      .slice(0, 32);

    const started = Date.now();
    let fresh = false;
    const result = await cached(`gq:guard:${hash}`, 7 * 86_400, async () => {
      fresh = true;
      const { answers } = await askJev(state, QUESTIONS);
      const position = answers.guide_position || {};
      const choice = position.choice || 'other';
      return {
        leading: answers.leading?.noul ?? null,
        doubleBarreled: answers.double_barreled?.noul ?? null,
        offGuide: answers.off_guide?.noul ?? null,
        position: {
          choice,
          p: position.probabilities?.[choice] ?? position.confidence ?? null,
        },
      };
    });

    return res
      .status(200)
      .json({ ...result, ms: fresh ? Date.now() - started : null, cached: !fresh });
  },
  { cost: COST.decision }
);

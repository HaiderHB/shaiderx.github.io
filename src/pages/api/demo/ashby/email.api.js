// POST /api/demo/ashby/email/  { jd, candidateId } -> { subject, body, callback, checks }
// The LLM drafts a short re-engagement note that refers back to the last conversation; code
// checks that the part it refers back to is really in the interview notes, word for word, and
// that the draft stays short and skips pay unless pay was the reason. Cached per role and person.
import { COST, clampText, demoApi } from 'demos/api';
import { cached, getJSON } from 'demos/store';
import { titleOf } from 'pages/demo/ashby/agent';
import { candidateById, formatMonth, lastApplication, monthsBetween } from 'pages/demo/ashby/data';
import { checkEmail } from 'pages/demo/ashby/rank';
import { hash, llm, MODEL, VERSION } from './live';

export const config = { api: { bodyParser: { sizeLimit: '16kb' } }, maxDuration: 60 };

const SYSTEM = `You write a short, warm note from a recruiter to a past candidate about a new role. Return JSON only:
{"subject": "...", "body": "...", "callback": "..."}
- body: 60 to 95 words, plain text, first name greeting, signed "Alex, Recruiting". No buzzwords, no exclamation marks, no em dashes, never a placeholder in brackets. Say "our team" or describe the company from the job description; it has no name here.
- Refer back to one specific thing the candidate did or said last time. The notes are the interviewers' private notes: never repeat their verdicts or praise back as if the candidate said it (not "you mentioned your work was a match"). Use the time since last time exactly as given; do not guess it. callback: 5 to 15 words copied exactly from inside the one quoted note your reference is based on, without the label before it.
- Mention what is different now (the role, or what they have done since) in one sentence. Never restate why they were turned down in a way that stings.
- Mention pay only if pay was the reason last time.
- End with one easy ask: a 20-minute call.`;

function prompt(jd, candidate) {
  const application = lastApplication(candidate);
  const fresh = candidate.roles.filter(role => application && role.start > application.date);
  return [
    `Role now: ${titleOf(jd)}`,
    `Job description:\n${jd}`,
    `Candidate first name: ${candidate.name.split(' ')[0]}`,
    `Current role: ${candidate.roles[0].title}`,
    application &&
      `Last time: applied for ${application.job} in ${formatMonth(application.date)} (${monthsBetween(application.date)} months ago), reached ${application.stage}. Reason we did not move forward: ${application.detail}`,
    `Interview notes from last time:\n${candidate.applications
      .flatMap(app => app.notes)
      .map(note => `- ${note.kind} (${note.by}, ${note.rating}): "${note.text}"`)
      .join('\n')}`,
    fresh.length ? `Since then: ${fresh.map(role => `${role.title}: ${role.lines.join(' ')}`).join(' ')}` : 'No new roles on file since then.',
  ]
    .filter(Boolean)
    .join('\n\n');
}

const read = req => ({ jd: clampText(req.body?.jd, 4000).trim(), candidate: candidateById(clampText(req.body?.candidateId, 8)) });
const keyOf = (jd, id) => `ashby:email:${hash(VERSION, MODEL, jd, id)}`;

export default demoApi(
  async (req, res) => {
    const { jd, candidate } = read(req);
    if (!candidate || jd.length < 80) return res.status(400).json({ error: 'Unknown candidate or role.', code: 'input' });
    const draft = await cached(keyOf(jd, candidate.id), 24 * 3600, async () => {
      const text = await llm({ system: SYSTEM, user: prompt(jd, candidate), maxTokens: 450, json: true });
      let parsed = {};
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = JSON.parse(String(text).match(/\{[\s\S]*\}/)?.[0] || '{}');
      }
      return {
        subject: String(parsed.subject || '').slice(0, 120),
        body: String(parsed.body || '').slice(0, 1400),
        callback: String(parsed.callback || '').slice(0, 200),
      };
    });
    res.status(200).json({ ...draft, checks: checkEmail(draft, candidate) });
  },
  {
    cost: async req => {
      const { jd, candidate } = read(req);
      if (!candidate || jd.length < 80) return COST.free;
      return (await getJSON(`cache:${keyOf(jd, candidate.id)}`).catch(() => null)) ? COST.free : COST.llm;
    },
    requireKey: true,
  }
);

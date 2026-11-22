// POST /api/demo/honeycomb/run/  { scenario, skills } -> NDJSON stream of investigation events
// The alert, triage and every tool result are computed in code over the sample spans; the LLM
// picks the tools and writes the findings; a decision model re-ranks the hypotheses after each
// finding. An identical scenario and skill set replays from cache, free.
import { COST, clampText, demoApi, startStream } from 'demos/api';
import { cleanSkills } from 'pages/demo/honeycomb/agent';
import { scenarioById } from 'pages/demo/honeycomb/data';
import { cachedRun, runInvestigation, runKey } from './live';

export const config = { api: { bodyParser: { sizeLimit: '8kb' } }, maxDuration: 120 };

// About 13 short LLM turns and 5 decision calls: roughly one cent
const RUN_COST = COST.llm + COST.decision;

function readRun(req) {
  const scenario = scenarioById(clampText(req.body?.scenario, 40));
  return { scenario, skills: cleanSkills(req.body?.skills) };
}

export default demoApi(
  async (req, res) => {
    const { scenario, skills } = readRun(req);
    if (!scenario) return res.status(400).json({ error: 'Unknown scenario.', code: 'input' });
    const stream = startStream(res);
    const send = event => stream.write(`${JSON.stringify(event)}\n`);
    try {
      let announced = false;
      await runInvestigation({ scenarioId: scenario.id, skills }, (event, cached) => {
        if (!announced) {
          announced = true;
          send({ t: 'meta', cached });
        }
        send(event);
      });
    } catch (error) {
      console.error('[honeycomb] run failed', error);
      send({ t: 'error', message: 'The investigation hit an error partway through. Try again in a moment.' });
    }
    stream.end();
  },
  {
    cost: async req => {
      const { scenario, skills } = readRun(req);
      if (!scenario) return COST.free;
      return (await cachedRun(runKey(scenario.id, skills))) ? COST.free : RUN_COST;
    },
    requireKey: true,
  }
);

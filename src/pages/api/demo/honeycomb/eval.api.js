// POST /api/demo/honeycomb/eval/  { scenario, skills, trial } -> one eval row (JSON)
// Runs the same investigator on one planted incident with the skill set the page sends, and
// grades the answer in code against the planted cause. The page calls this once per scenario
// and config (with the skills, and with none), two at a time. Cached per scenario, skills, trial.
import { COST, clampText, demoApi } from 'demos/api';
import { cleanSkills } from 'pages/demo/honeycomb/agent';
import { scenarioById } from 'pages/demo/honeycomb/data';
import { evalRow } from 'pages/demo/honeycomb/evalRow';
import { cachedRun, runInvestigation, runKey } from './live';

export const config = { api: { bodyParser: { sizeLimit: '8kb' } }, maxDuration: 120 };

const RUN_COST = COST.llm + COST.decision;

function readEval(req) {
  return {
    scenario: scenarioById(clampText(req.body?.scenario, 40)),
    skills: cleanSkills(req.body?.skills),
    trial: Math.min(3, Math.max(1, Math.floor(Number(req.body?.trial)) || 1)),
  };
}

export default demoApi(
  async (req, res) => {
    const { scenario, skills, trial } = readEval(req);
    if (!scenario) return res.status(400).json({ error: 'Unknown scenario.', code: 'input' });
    try {
      const { events, cached } = await runInvestigation({ scenarioId: scenario.id, skills, trial });
      return res.status(200).json({ ...evalRow(scenario.id, events), cached });
    } catch (error) {
      console.error('[honeycomb] eval run failed', scenario.id, error);
      return res.status(502).json({ error: 'This investigation hit an error. Run the eval again to retry it.', code: 'model' });
    }
  },
  {
    cost: async req => {
      const { scenario, skills, trial } = readEval(req);
      if (!scenario) return COST.free;
      return (await cachedRun(runKey(scenario.id, skills, trial))) ? COST.free : RUN_COST;
    },
    requireKey: true,
  }
);

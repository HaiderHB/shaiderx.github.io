// POST /api/demo/superhuman/run/  { task, grant } -> NDJSON stream of agent events
// The agent works the sample inbox through the MCP-style tool server under the grant the page
// picked (read / draft / full): up to 10 DeepSeek tool-calling turns, every call through the
// server's gate, then one Jev call per draft (grounded? answers the ask?). Sends never leave:
// they wait at the page's approval gate. An identical task and grant replays from cache, free.
import { COST, clampText, demoApi } from 'demos/api';
import { MAX_TASK } from 'pages/demo/superhuman/agent';
import { GRANT_IDS } from 'pages/demo/superhuman/mcp';
import { MODEL, VERSION, cachedEvents, hash, streamAgent } from './live';

export const config = { api: { bodyParser: { sizeLimit: '4kb' } }, maxDuration: 120 };

// Up to 10 short DeepSeek turns (about 2 cents at most) and the judge's Jev calls (input only)
const RUN_COST = COST.llm * 2 + COST.decision;

function readRun(req) {
  const task = clampText(req.body?.task, MAX_TASK).replace(/\s+/g, ' ').trim();
  const grant = GRANT_IDS.includes(req.body?.grant) ? req.body.grant : null;
  return { task, grant };
}

const runKey = ({ task, grant }) => `superhuman:run:${hash(VERSION, MODEL, grant, task)}`;

export default demoApi(
  async (req, res) => {
    const run = readRun(req);
    if (!run.task)
      return res.status(400).json({ error: 'Type a task first.', code: 'input' });
    if (!run.grant)
      return res.status(400).json({ error: 'Pick a permission level.', code: 'input' });
    return streamAgent(res, runKey(run), {
      task: run.task,
      grant: run.grant,
      judgeMode: 'drafts',
    });
  },
  {
    cost: async req => {
      const run = readRun(req);
      if (!run.task || !run.grant) return COST.free;
      return (await cachedEvents(runKey(run))) ? COST.free : RUN_COST;
    },
    requireKey: true,
  }
);

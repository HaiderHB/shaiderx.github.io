// POST /api/demo/superhuman/eval/  { taskId } -> NDJSON stream of agent events for one eval task
// The same agent and tool server as /run/, on one of the eight fixed eval tasks with that task's
// grant, then the task's judge questions (Jev). The page scores the run with the task's
// deterministic checks (agent.js scoreEval). Cached per task, so re-running the suite is free
// until the cache expires.
import { COST, clampText, demoApi } from 'demos/api';
import { evalById } from 'pages/demo/superhuman/agent';
import { MODEL, VERSION, cachedEvents, hash, streamAgent } from './live';

export const config = { api: { bodyParser: { sizeLimit: '1kb' } }, maxDuration: 120 };

const TASK_COST = COST.llm * 2 + COST.decision;

const readTask = req => evalById(clampText(req.body?.taskId, 8));
const evalKey = task =>
  `superhuman:eval:${hash(VERSION, MODEL, task.id, task.grant, task.task)}`;

export default demoApi(
  async (req, res) => {
    const task = readTask(req);
    if (!task)
      return res.status(400).json({ error: 'Unknown eval task.', code: 'input' });
    return streamAgent(res, evalKey(task), {
      task: task.task,
      grant: task.grant,
      judgeMode: task.judgeMode,
    });
  },
  {
    cost: async req => {
      const task = readTask(req);
      if (!task) return COST.free;
      return (await cachedEvents(evalKey(task))) ? COST.free : TASK_COST;
    },
    requireKey: true,
  }
);

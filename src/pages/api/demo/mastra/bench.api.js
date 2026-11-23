// POST /api/demo/mastra/bench/  { config, cases: [ids] } -> NDJSON stream, one line per finished case
// Runs the support agent with the given config over up to ten benchmark cases, three at a time.
// The LLM picks tools and writes the answer; tools, grading and the failure cause are code.
// A case already run with an identical config replays from cache and costs nothing.
import { COST, clampText, demoApi, startStream } from 'demos/api';
import { normalizeConfig } from 'pages/demo/mastra/agent';
import { caseById } from 'pages/demo/mastra/data';
import { cachedCase, runCase } from './live';

export const config = { api: { bodyParser: { sizeLimit: '24kb' } }, maxDuration: 120 };

const MAX_CASES = 10;
const PARALLEL = 3;

function readBench(req) {
  const ids = Array.isArray(req.body?.cases) ? req.body.cases : [];
  const cases = [...new Set(ids.map(id => clampText(id, 8)))].map(caseById).filter(Boolean).slice(0, MAX_CASES);
  return { config: normalizeConfig(req.body?.config), cases };
}

export default demoApi(
  async (req, res) => {
    const { config: agentConfig, cases } = readBench(req);
    if (!cases.length) return res.status(400).json({ error: 'Pick at least one case.', code: 'input' });
    const stream = startStream(res);
    const send = event => stream.write(`${JSON.stringify(event)}\n`);
    send({ t: 'meta', total: cases.length });
    const queue = [...cases];
    async function worker() {
      while (queue.length) {
        const testCase = queue.shift();
        send({ t: 'start', caseId: testCase.id });
        try {
          const result = await runCase(agentConfig, testCase);
          send({ t: 'result', caseId: testCase.id, ...result });
        } catch (error) {
          console.error('[mastra] case failed', testCase.id, error?.message);
          send({ t: 'error', caseId: testCase.id, message: 'This case hit a model error. Run it again in a moment.' });
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(PARALLEL, cases.length) }, worker));
    send({ t: 'done' });
    stream.end();
  },
  {
    // One unit per case that is not cached: two or three short LLM turns each
    cost: async req => {
      const { config: agentConfig, cases } = readBench(req);
      let units = 0;
      for (const testCase of cases) if (!(await cachedCase(agentConfig, testCase.id))) units += COST.llm;
      return units;
    },
    requireKey: true,
  }
);

// POST /api/demo/resend/run/ { task, variant: 'clear' | 'vague' } -> NDJSON stream of agent events
// The LLM drafts the email and picks the tools; every tool (template, render, lint, sandbox send,
// broadcast) runs in code on a sandbox: nothing is ever sent. variant picks the tool wording the
// model sees (the improved descriptions or the vague set) over the same tool server. An identical
// task, wording and day replays from cache, free. Paid: needs the visitor's demo key.
import { clampText, COST, demoApi, startStream } from 'demos/api';
import { cachedRun, runKey, runTask } from './live';

export const config = { api: { bodyParser: { sizeLimit: '8kb' } }, maxDuration: 120 };

// Up to 14 short LLM turns of a few thousand tokens each: about two cents
const RUN_COST = 2 * COST.llm;

function readRun(req) {
  const task = clampText(req.body?.task, 320).replace(/\s+/g, ' ').trim();
  const variant = req.body?.variant === 'vague' ? 'vague' : 'clear';
  return { task, variant };
}

export default demoApi(
  async (req, res) => {
    const { task, variant } = readRun(req);
    if (task.length < 12) return res.status(400).json({ error: 'Describe the email to send first.', code: 'input' });
    const stream = startStream(res);
    const send = event => stream.write(`${JSON.stringify(event)}\n`);
    try {
      let announced = false;
      await runTask({ task, variant }, (event, cached) => {
        if (!announced) {
          announced = true;
          send({ t: 'meta', cached });
        }
        send(event);
      });
    } catch (error) {
      console.error('[resend] run failed', error);
      send({ t: 'error', message: 'The run hit an error partway through. Try again in a moment.' });
    }
    stream.end();
  },
  {
    cost: async req => {
      const { task, variant } = readRun(req);
      if (task.length < 12) return COST.free;
      return (await cachedRun(runKey(task, variant))) ? COST.free : RUN_COST;
    },
    requireKey: true,
  }
);

// POST /api/demo/ashby/run/  { jd } -> NDJSON stream of rediscovery events
// The LLM extracts the requirements, screens every past candidate and cites evidence; code
// checks every requirement and quote; a fast decision model gives each shortlisted candidate a
// fit verdict. An identical job description replays from cache, free.
import { COST, clampText, demoApi, startStream } from 'demos/api';
import { cachedRun, runRediscovery } from './live';

export const config = { api: { bodyParser: { sizeLimit: '16kb' } }, maxDuration: 120 };

// 1 extraction + 3 screening + 3 evidence calls (short), 14 decision calls: about 3 cents
const RUN_COST = 3 * COST.llm + COST.decision;

const readJd = req => clampText(req.body?.jd, 4000).trim();

export default demoApi(
  async (req, res) => {
    const jd = readJd(req);
    if (jd.length < 80) return res.status(400).json({ error: 'Paste a fuller job description (a few lines at least).', code: 'input' });
    const stream = startStream(res);
    const send = event => stream.write(`${JSON.stringify(event)}\n`);
    try {
      let announced = false;
      await runRediscovery(jd, (event, cached) => {
        if (!announced) {
          announced = true;
          send({ t: 'meta', cached });
        }
        send(event);
      });
    } catch (error) {
      console.error('[ashby] run failed', error);
      send({ t: 'error', message: 'The run hit an error partway through. Try again in a moment.' });
    }
    stream.end();
  },
  {
    cost: async req => {
      const jd = readJd(req);
      if (jd.length < 80) return COST.free;
      return (await cachedRun(jd)) ? COST.free : RUN_COST;
    },
    requireKey: true,
  }
);

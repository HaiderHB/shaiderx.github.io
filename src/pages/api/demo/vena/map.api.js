// POST /api/demo/vena/map/ { csv } -> NDJSON stream of mapping events (see
// pages/demo/vena/pipeline.js runMapping). The CSV is profiled in code, every row goes through the
// fast decision model, rows under the confidence threshold go to the LLM in one batch, and the
// page runs the checks, trust scores, statements and eval on the result in code.
// Paid: demoApi requires the visitor's demo key. Identical accounts and repeat files are cached.
import { clampText, COST, demoApi, startStream } from 'demos/api';
import { MAX_CHARS, profile } from 'pages/demo/vena/engine';
import { runMapping } from 'pages/demo/vena/pipeline';
import { askFast, askLlm, hash, randomId, trace } from './server';

export const config = { api: { bodyParser: { sizeLimit: '64kb' } } };

const readCsv = req => clampText(req.body?.csv, MAX_CHARS);

export default demoApi(
  async (req, res) => {
    const csv = readCsv(req);
    const prof = profile(csv);
    if (!prof.ok) return res.status(400).json({ error: prof.error, code: 'input' });

    const runId = randomId('run');
    const started = Date.now();
    const stream = startStream(res);
    const send = event => stream.write(`${JSON.stringify(event)}\n`);
    send({ t: 'meta', runId, at: started, rows: prof.rowCount, truncated: prof.truncated, file: hash(csv).slice(0, 12) });

    try {
      const { entries, timing } = await runMapping({
        rows: prof.rows,
        askFast,
        askLlm,
        emit: send,
      });
      const routed = Object.values(entries).filter(entry => entry.route === 'llm').length;
      trace('run', { runId, file: hash(csv).slice(0, 12), rows: prof.rowCount, routed, ...timing, ms: Date.now() - started });
      send({ t: 'done', at: Date.now(), runId, timing: { ...timing, totalMs: Date.now() - started } });
    } catch (error) {
      console.error('[vena map]', runId, error);
      trace('run_error', { runId, message: String(error.message || error).slice(0, 200) });
      send({ t: 'error', at: Date.now(), message: 'The mapping run stopped partway through. Try again in a moment.' });
    }
    stream.end();
  },
  {
    // One decision-model call per row (input tokens only, ~1.2k each) and one short LLM call
    cost: req => {
      const prof = profile(readCsv(req));
      if (!prof.ok) return COST.free;
      return Math.ceil(prof.rowCount / 15) * COST.decision + COST.llm;
    },
    requireKey: true,
  }
);

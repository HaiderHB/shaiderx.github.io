// POST /api/demo/blackletter/learn/ { feedback: [{ id, verdict, quote, reason, redline, edited }] }
// -> NDJSON stream. Turns lawyer feedback into harness v2 (one short LLM call writes a rule
// clarification per rejected rule; code adds the examples), then reviews every sample document
// with v1 (cached per day) and v2 so the page can score both against the labels.
// Events: { t: 'meta' } { t: 'harness', harness, written } { t: 'run', version, doc, flags, dropped, cleared, cached }
//         { t: 'done', ms } { t: 'error', message }
import { COST, demoApi, startStream } from 'demos/api';
import { DOCS } from 'pages/demo/blackletter/data';
import { buildHarness, readFeedback } from 'pages/demo/blackletter/harness';
import { clarify, getBaseline, reviewDoc, saveBaseline } from './server';

export const config = { api: { bodyParser: { sizeLimit: '16kb' } }, maxDuration: 120 };

// One clarification call, five v2 reviews, and up to five v1 reviews not yet run today
const RUN_COST = COST.llm * 4;

export default demoApi(
  async (req, res) => {
    const feedback = readFeedback(req.body?.feedback);
    if (!feedback.length) {
      return res.status(400).json({ error: 'Accept or reject at least one flag first.', code: 'input' });
    }

    const started = Date.now();
    const stream = startStream(res);
    const send = event => stream.write(`${JSON.stringify(event)}\n`);
    send({ t: 'meta', docs: DOCS.length, feedback: feedback.length });

    try {
      // Baselines start now, in parallel with the clarification call
      const baselines = DOCS.map(async doc => {
        let run = await getBaseline(doc.id);
        const cached = Boolean(run);
        if (!run) {
          const fresh = await reviewDoc(doc.id);
          run = { flags: fresh.flags, dropped: fresh.dropped, cleared: fresh.cleared, confidence: {}, ms: fresh.ms };
          await saveBaseline(doc.id, run);
        }
        send({ t: 'run', version: 'v1', doc: doc.id, flags: run.flags, dropped: run.dropped, cleared: run.cleared || [], cached });
      });

      const rejections = feedback.filter(item => item.verdict === 'reject');
      const written = await clarify(rejections);
      const harness = buildHarness(feedback, written);
      send({ t: 'harness', harness, written: Object.keys(written) });

      const reruns = DOCS.map(async doc => {
        const run = await reviewDoc(doc.id, harness);
        send({ t: 'run', version: 'v2', doc: doc.id, flags: run.flags, dropped: run.dropped, cleared: run.cleared, ms: run.ms });
      });

      await Promise.all([...baselines, ...reruns]);
      send({ t: 'done', ms: Date.now() - started });
    } catch (error) {
      console.error('[blackletter learn]', error);
      send({ t: 'error', message: 'The re-run stopped partway through. Try again in a moment.' });
    }
    stream.end();
  },
  { cost: RUN_COST, requireKey: true }
);

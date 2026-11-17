// POST /api/demo/truss/process/  { session, image (data URL), sampleId? } -> NDJSON stream of run
// events (see pages/demo/truss/pipeline.js runBill). Gemini reads the invoice image into a typed
// bill, code runs eight checks against the vendor file, the POs and the paid ledger (plus this
// session's payments), Jev decides approve / hold / reject under a rules floor, and DeepSeek writes
// the reviewer note. The bill is saved for /pay before the final event, so only what this run
// approved can be paid. The same image is read once (cached); repeats cost 1 unit, not 3.
import { COST, clampText, demoApi, startStream } from 'demos/api';
import { matchVendor, runBill } from 'pages/demo/truss/pipeline';
import { billRecord, newBillId, readLedger, saveBill } from 'pages/demo/truss/payments';
import {
  LLM_MODEL,
  VISION_MODEL,
  cachedExtraction,
  decide,
  extract,
  hash,
  randomId,
  readImage,
  readSession,
  store,
  trace,
  writeNote,
} from './server';

export const config = { api: { bodyParser: { sizeLimit: '3mb' } } };

// One vision call (about 1.5k image tokens), one tiny Jev call, one short streamed LLM note
const RUN_COST = COST.llm + COST.decision + COST.llm;
const REPEAT_COST = COST.decision;

function readInput(req) {
  return {
    session: readSession(req.body?.session),
    image: readImage(clampText(req.body?.image, 2_800_000)),
    sampleId: clampText(req.body?.sampleId, 24).replace(/[^a-z-]/g, '') || null,
  };
}

export default demoApi(
  async (req, res) => {
    const { session, image, sampleId } = readInput(req);
    if (!session) return res.status(400).json({ error: 'Reload the page to start a session.', code: 'input' });
    if (!image) {
      return res
        .status(400)
        .json({ error: 'Send a PNG, JPEG or WebP invoice image under 2 MB.', code: 'input' });
    }

    const runId = randomId('run');
    const billId = newBillId();
    const started = Date.now();
    const stream = startStream(res);
    const send = event => stream.write(`${JSON.stringify(event)}\n`);
    send({
      t: 'meta',
      at: started,
      runId,
      billId,
      sampleId,
      image: { sha: image.sha.slice(0, 12), bytes: image.bytes, type: image.mimeType },
      models: { vision: VISION_MODEL, llm: LLM_MODEL, decision: 'jev' },
    });

    try {
      const { charges } = await readLedger(store, session);
      const result = await runBill({
        extract: () => extract(image),
        decide,
        writeNote,
        charges,
        emit: send,
        beforeDone: async done => {
          if (done.bill) {
            const record = billRecord({
              billId,
              runId,
              bill: done.bill,
              vendor: matchVendor(done.bill),
              final: done.final,
            });
            await saveBill(store, session, record);
          }
          trace('run', {
            runId,
            billId,
            session: hash(session).slice(0, 12),
            image: image.sha.slice(0, 12),
            sampleId,
            invoice: done.bill?.invoiceNumber || null,
            final: done.final,
            by: done.by || 'rules',
            model: done.jev?.choice || null,
            floor: done.floor?.choice || null,
            failed: (done.checks || []).filter(check => check.pass !== true).map(check => check.id),
            ms: Date.now() - started,
          });
        },
      });
      if (!result) throw new Error('run returned nothing');
    } catch (error) {
      console.error('[truss process]', runId, error);
      trace('run_error', { runId, message: String(error.message || error).slice(0, 200) });
      send({
        t: 'error',
        at: Date.now(),
        message: /gemini/i.test(String(error.message))
          ? 'The vision model could not read this image. Try again, or try a sample invoice.'
          : 'The run stopped partway through. Nothing was paid; try again in a moment.',
      });
    }
    stream.end();
  },
  {
    cost: async req => {
      const { session, image } = readInput(req);
      if (!session || !image) return COST.free;
      return (await cachedExtraction(image)) ? REPEAT_COST : RUN_COST;
    },
    requireKey: true,
  }
);

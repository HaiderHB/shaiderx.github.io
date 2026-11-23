// POST /api/demo/blackletter/review/ { doc } -> NDJSON stream of review events.
// One streamed LLM call flags clauses against the playbook; each flag's quote is pinned to the
// document in code as it arrives (or dropped); a fast decision model gives each pinned flag a
// confidence. The same document on the same day replays the stored run for free.
// Events: { t: 'meta', doc, cached } { t: 'flag', flag } { t: 'dropped', flag }
//         { t: 'cleared', item }
//         { t: 'confidence', id, choice, probabilities, ms | error } { t: 'done', ms } { t: 'error' }
import { clampText, COST, demoApi, startStream } from 'demos/api';
import { docById } from 'pages/demo/blackletter/data';
import { confidence, getBaseline, reviewDoc, saveBaseline } from './server';

export const config = { api: { bodyParser: { sizeLimit: '1kb' } }, maxDuration: 60 };

// One LLM call (~1.3k tokens in, ~500 out) and one small decision call per flag
const RUN_COST = COST.llm + COST.decision;

const readDoc = req => docById(clampText(req.body?.doc, 40));
const wantsFresh = req => req.body?.fresh === true;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function replayFor(req) {
  const doc = readDoc(req);
  if (!doc || wantsFresh(req)) return null;
  return getBaseline(doc.id);
}

export default demoApi(
  async (req, res) => {
    const doc = readDoc(req);
    if (!doc) return res.status(400).json({ error: 'Pick a document first.', code: 'input' });

    const stream = startStream(res);
    const send = event => stream.write(`${JSON.stringify(event)}\n`);

    const replay = await replayFor(req);
    if (replay) {
      send({ t: 'meta', doc: doc.id, cached: true });
      for (const flag of replay.flags) {
        await sleep(350);
        send({ t: 'flag', flag });
        if (replay.confidence?.[flag.id]) send({ t: 'confidence', id: flag.id, ...replay.confidence[flag.id] });
      }
      for (const flag of replay.dropped) send({ t: 'dropped', flag });
      for (const item of replay.cleared || []) send({ t: 'cleared', item });
      send({ t: 'done', ms: replay.ms });
      return stream.end();
    }

    send({ t: 'meta', doc: doc.id, cached: false });
    const started = Date.now();
    const scores = {};
    const pending = [];
    try {
      const run = await reviewDoc(doc.id, undefined, {
        onFlag: flag => {
          send({ t: 'flag', flag });
          pending.push(
            confidence(flag).then(result => {
              scores[flag.id] = result;
              send({ t: 'confidence', id: flag.id, ...result });
            })
          );
        },
        onDropped: flag => send({ t: 'dropped', flag }),
        onCleared: item => send({ t: 'cleared', item }),
      });
      await Promise.all(pending);
      const ms = Date.now() - started;
      await saveBaseline(doc.id, { flags: run.flags, dropped: run.dropped, cleared: run.cleared, confidence: scores, ms });
      send({ t: 'done', ms });
    } catch (error) {
      console.error('[blackletter review]', error);
      await Promise.allSettled(pending);
      send({ t: 'error', message: 'The review stopped partway through. Try again in a moment.' });
    }
    stream.end();
  },
  // A replay costs nothing, but still needs a valid key
  {
    cost: async req => (!readDoc(req) || (await replayFor(req)) ? COST.free : RUN_COST),
    requireKey: true,
  }
);

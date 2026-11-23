// POST /api/demo/cointracker/run/  { edits? } -> NDJSON stream of agent steps, one JSON object a line:
//   { t: 'step', id, status: 'running' | 'done' | 'paused' | 'error', ms?, detail?, data? }  then  { t: 'end', runId }
// The live path for the household with edited figures: the documents are rendered from the figures,
// the LLM reads them into a typed record (checked against the documents in code), code checks the
// file against the checklist, the LLM proposes actions (each checked in code), the decision model
// routes every action and code applies the floor (money never auto-runs). The run pauses at the step
// that needs the missing 1099-INT and saves a checkpoint, so /resume continues from there.
// Every model call is cached by its input: the same figures twice cost nothing the second time.
import { COST, demoApi } from 'demos/api';
import { ON_FILE, assemble, checkRecord, completeness } from 'pages/demo/cointracker/agent';
import { DOCUMENTS, documentText, withEdits } from 'pages/demo/cointracker/data';
import { CACHE_SECONDS, decide, extractRecord, getRunCache, newRunId, proposeActions, runCacheKey, runKey, store, trace } from './server';

export const config = { api: { bodyParser: { sizeLimit: '4kb' } } };

const readEdits = body => {
  const edits = body?.edits;
  if (!edits || typeof edits !== 'object') return null;
  return Object.fromEntries(['solValue', 'solBasis', 'k401Ytd', 'roofCost'].map(id => [id, Number(edits[id])]).filter(([, value]) => Number.isFinite(value)));
};

export default demoApi(
  async (req, res) => {
    const edits = readEdits(req.body);
    const figures = withEdits(edits);
    const runId = newRunId();
    const started = Date.now();

    res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' });
    const send = event => res.write(`${JSON.stringify(event)}\n`);
    const step = (id, status, extra = {}) => send({ t: 'step', id, status, ...extra });

    try {
      step('list', 'running');
      step('list', 'done', { ms: 4, detail: `${ON_FILE.length} documents on file`, data: { onFile: ON_FILE } });

      step('extract', 'running');
      const texts = DOCUMENTS.map(doc => ({ id: doc.id, text: documentText(doc.id, figures) }));
      const extracted = await extractRecord(texts);
      if (!extracted.record) throw new Error('The LLM did not return a record.');
      const recordCheck = checkRecord(extracted.record, figures);
      step('extract', 'done', {
        ms: extracted.ms,
        cached: extracted.cached,
        detail: `${recordCheck.figuresChecked - recordCheck.figuresWrong} of ${recordCheck.figuresChecked} figures match`,
        data: { record: extracted.record },
      });

      step('complete', 'running');
      const complete = completeness(ON_FILE);
      step('complete', 'done', { ms: 2, detail: `${complete.have} of ${complete.total} documents`, data: { missing: complete.missing } });

      step('propose', 'running');
      const proposed = await proposeActions(extracted.record, complete);
      if (!proposed.actions.length) throw new Error('The LLM proposed no actions.');
      step('propose', 'done', { ms: proposed.ms, cached: proposed.cached, detail: `${proposed.actions.length} actions`, data: { actions: proposed.actions } });

      step('route', 'running');
      const routeStarted = Date.now();
      const checked = assemble({ record: extracted.record, actions: proposed.actions, decisions: {}, figures });
      const answers = await Promise.all(checked.actions.map(action => decide(action, action.checks)));
      const decisions = Object.fromEntries(checked.actions.map((action, index) => [action.id, answers[index]]));
      step('route', 'done', { ms: Date.now() - routeStarted, detail: `${proposed.actions.length} routed`, data: { decisions } });

      const run = { record: extracted.record, actions: proposed.actions, decisions, edits, onFile: ON_FILE, pausedAt: 6, timings: { extract: extracted.ms, propose: proposed.ms, route: Date.now() - routeStarted } };
      await store.set(runKey(runId), run, CACHE_SECONDS);
      await store.set(runCacheKey(figures), { cached: true }, CACHE_SECONDS).catch(() => {});
      step('scheduleB', 'paused', { detail: 'Waiting on the household: 1099-INT' });
      send({ t: 'end', runId });

      const routes = assemble({ record: extracted.record, actions: proposed.actions, decisions, figures }).actions.map(action => `${action.id}:${action.final.route}${action.final.overruled ? '*' : ''}`);
      trace('run', { runId, edits, routes, ms: Date.now() - started });
    } catch (error) {
      console.error('[cointracker] run failed', error);
      send({ t: 'error', message: 'The live run failed. Try again in a moment.' });
    }
    res.end();
  },
  {
    cost: async req => ((await getRunCache(withEdits(readEdits(req.body)))) ? COST.free : COST.llm * 2 + COST.decision * 4),
    requireKey: true,
  }
);

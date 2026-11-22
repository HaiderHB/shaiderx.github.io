// POST /api/demo/housesigma/fair/ { id } -> NDJSON stream
//   { t: 'verdict', choice, probabilities, competition, ms }   the fast decision model
//   { t: 'delta', text } ...                                     the LLM's two sentences
//   { t: 'done', ms, cached }
// Comps and the estimate are picked in code (the page shows the same ones); the decision model
// reads only those numbers, and the LLM may only quote the facts in fairFacts().
// Paid: demoApi requires the visitor's demo key. The sample market is fixed, so a listing's
// answer is cached after its first run.
import { clampText, COST, demoApi, startStream } from 'demos/api';
import { askJev, chatStream, DEMO_LLM } from 'demos/models';
import { getJSON, setJSON } from 'demos/store';
import { getMarket } from 'pages/demo/housesigma/data';
import { areaStats, fairFacts, fairState, valuation } from 'pages/demo/housesigma/engine';
import { CACHE_SECONDS, FAIR_QUESTIONS, FAIR_SYSTEM, VERSION, hash, trace } from './server';

export const config = { api: { bodyParser: { sizeLimit: '4kb' } } };

export default demoApi(
  async (req, res) => {
    const id = clampText(req.body?.id, 16);
    const home = getMarket().active.find(item => item.id === id);
    if (!home) return res.status(400).json({ error: 'That listing is not in the sample market.', code: 'input' });
    const value = valuation(home);
    if (!value.estimate) return res.status(400).json({ error: 'Too few comparable sales for an estimate.', code: 'input' });

    const stream = startStream(res);
    const send = event => stream.write(`${JSON.stringify(event)}\n`);
    const key = `cache:housesigma:fair:${hash(VERSION, DEMO_LLM.model(), id)}`;
    const hit = await getJSON(key).catch(() => null);
    if (hit) {
      send({ ...hit.verdict, cached: true });
      send({ t: 'delta', text: hit.text });
      send({ t: 'done', ms: 0, cached: true });
      return stream.end();
    }

    const started = Date.now();
    try {
      const state = fairState(home, value, areaStats(home.hood, home.type));
      const call = () => askJev(state, FAIR_QUESTIONS);
      let result;
      try {
        result = await call();
      } catch {
        await new Promise(resolve => setTimeout(resolve, 300));
        result = await call();
      }
      const answer = result.answers.verdict || {};
      const verdict = {
        t: 'verdict',
        choice: answer.choice,
        probabilities: answer.probabilities || {},
        confidence: answer.confidence ?? null,
        competition: result.answers.competition?.noul ?? null,
        ms: Date.now() - started,
      };
      if (!verdict.choice) throw new Error('no verdict');
      send(verdict);

      let text = '';
      for await (const delta of chatStream({
        provider: DEMO_LLM.provider,
        model: DEMO_LLM.model(),
        system: FAIR_SYSTEM,
        messages: [{ role: 'user', content: JSON.stringify(fairFacts(home, value, verdict.choice)) }],
        maxTokens: 160,
        temperature: 0.2,
      })) {
        text += delta;
        send({ t: 'delta', text: delta });
      }
      const ms = Date.now() - started;
      if (text.trim()) await setJSON(key, { verdict, text }, CACHE_SECONDS).catch(() => {});
      trace('fair', { id, choice: verdict.choice, jevMs: verdict.ms, ms });
      send({ t: 'done', ms, cached: false });
    } catch (error) {
      console.error('[housesigma fair]', id, error);
      send({ t: 'error', message: 'The price check stopped partway through. Try again in a moment.' });
    }
    stream.end();
  },
  { cost: COST.decision + COST.llm }
);

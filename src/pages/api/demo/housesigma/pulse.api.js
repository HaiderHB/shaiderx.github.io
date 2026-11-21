// POST /api/demo/housesigma/pulse/ { filters } -> streamed text (3 bullets and a takeaway)
// The week's numbers for the saved search are computed in code (pulseStats); the LLM only words
// them, from pulseFacts(). The page then checks every figure in the text against those facts.
// Paid: demoApi requires the visitor's demo key. Identical searches are cached.
import { COST, demoApi, startStream } from 'demos/api';
import { chatStream, DEMO_LLM } from 'demos/models';
import { getJSON, setJSON } from 'demos/store';
import { pulseFacts, pulseStats, validateFilters } from 'pages/demo/housesigma/engine';
import { CACHE_SECONDS, PULSE_SYSTEM, VERSION, hash, trace } from './server';

export const config = { api: { bodyParser: { sizeLimit: '8kb' } } };

export default demoApi(
  async (req, res) => {
    // The page sends its filters back in the raw shape; they go through the same validation
    const { filters } = validateFilters(req.body?.filters);
    const facts = pulseFacts(filters, pulseStats(filters));
    const payload = JSON.stringify(facts);
    const key = `cache:housesigma:pulse:${hash(VERSION, DEMO_LLM.model(), payload)}`;

    const stream = startStream(res);
    const hit = await getJSON(key).catch(() => null);
    if (hit?.text) {
      stream.write(hit.text);
      return stream.end();
    }

    const started = Date.now();
    let text = '';
    try {
      for await (const delta of chatStream({
        provider: DEMO_LLM.provider,
        model: DEMO_LLM.model(),
        system: PULSE_SYSTEM,
        messages: [{ role: 'user', content: payload }],
        maxTokens: 220,
        temperature: 0.2,
      })) {
        text += delta;
        stream.write(delta);
      }
      if (text.trim()) await setJSON(key, { text }, CACHE_SECONDS).catch(() => {});
      trace('pulse', { ms: Date.now() - started, chars: text.length });
    } catch (error) {
      console.error('[housesigma pulse]', error);
      if (!text) stream.write('The weekly update could not be written just now. The numbers above are still current.');
    }
    stream.end();
  },
  { cost: COST.llm }
);

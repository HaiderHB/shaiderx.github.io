// POST /api/demo/housesigma/parse/ { ask } -> { filters, notes, unmapped, ms, cached }
// The LLM turns one sentence into a JSON object of filters; validateFilters() in code keeps only
// places, types and ranges that exist in the sample market, so the model cannot invent a filter.
// Paid: demoApi requires the visitor's demo key. Identical asks are cached.
import { clampText, COST, demoApi } from 'demos/api';
import { chat, DEMO_LLM } from 'demos/models';
import { getJSON, setJSON } from 'demos/store';
import { MAX_ASK, hasAnyFilter, validateFilters } from 'pages/demo/housesigma/engine';
import { CACHE_SECONDS, PARSE_SYSTEM, VERSION, hash, trace } from './server';

export const config = { api: { bodyParser: { sizeLimit: '8kb' } } };

function readJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = String(text).match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

export default demoApi(
  async (req, res) => {
    const ask = clampText(req.body?.ask, MAX_ASK).replace(/\s+/g, ' ').trim();
    if (ask.length < 3) return res.status(400).json({ error: 'Describe the home you are looking for.', code: 'input' });

    const key = `cache:housesigma:parse:${hash(VERSION, DEMO_LLM.model(), ask.toLowerCase())}`;
    const hit = await getJSON(key).catch(() => null);
    if (hit) return res.status(200).json({ ...hit, cached: true });

    const started = Date.now();
    let raw = null;
    try {
      const text = await chat({
        provider: DEMO_LLM.provider,
        model: DEMO_LLM.model(),
        system: PARSE_SYSTEM,
        messages: [{ role: 'user', content: ask }],
        maxTokens: 220,
        temperature: 0,
        json: true,
      });
      raw = readJson(text);
    } catch (error) {
      console.error('[housesigma parse]', error);
    }
    if (!raw) {
      return res.status(502).json({ error: 'The model did not return filters. Try again in a moment.', code: 'model' });
    }

    const { filters, notes, unmapped } = validateFilters(raw);
    const result = { filters, notes, unmapped, understood: hasAnyFilter(filters), ms: Date.now() - started };
    trace('parse', { ms: result.ms, chips: Object.values(filters).flat().filter(Boolean).length, notes: notes.length });
    await setJSON(key, result, CACHE_SECONDS).catch(() => {});
    res.status(200).json({ ...result, cached: false });
  },
  { cost: COST.llm }
);

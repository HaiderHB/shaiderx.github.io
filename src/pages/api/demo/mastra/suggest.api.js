// POST /api/demo/mastra/suggest/  { config, clusters: [{ cause, count, examples }] } -> NDJSON stream
// For each failure cluster the LLM proposes one or two typed config changes (an instruction edit,
// a tool description, a parameter schema, a memory window, a step budget). Code validates every
// change against the config before the page can apply it. Identical requests replay from cache.
import { COST, clampText, demoApi, startStream } from 'demos/api';
import { applyChanges, CAUSES, normalizeConfig } from 'pages/demo/mastra/agent';
import { cachedSuggestion, saveSuggestion, suggest, suggestKey } from './live';

export const config = { api: { bodyParser: { sizeLimit: '32kb' } }, maxDuration: 60 };

const MAX_CLUSTERS = 6;

function readSuggest(req) {
  const raw = Array.isArray(req.body?.clusters) ? req.body.clusters : [];
  const clusters = raw
    .filter(cluster => CAUSES[cluster?.cause])
    .slice(0, MAX_CLUSTERS)
    .map(cluster => ({
      cause: cluster.cause,
      count: Math.max(1, Math.min(40, Math.round(Number(cluster.count)) || 1)),
      // The examples are condensed traces from the page; clamp each so the prompt stays small
      examples: (Array.isArray(cluster.examples) ? cluster.examples : [])
        .slice(0, 3)
        .map(example => clampText(JSON.stringify(example), 1400)),
      working: (Array.isArray(cluster.working) ? cluster.working : []).slice(0, 4).map(line => clampText(line, 140)),
    }));
  return { config: normalizeConfig(req.body?.config), clusters };
}

export default demoApi(
  async (req, res) => {
    const { config: agentConfig, clusters } = readSuggest(req);
    if (!clusters.length) return res.status(400).json({ error: 'No failure clusters to fix.', code: 'input' });
    const stream = startStream(res);
    const send = event => stream.write(`${JSON.stringify(event)}\n`);
    await Promise.all(
      clusters.map(async cluster => {
        const key = suggestKey(agentConfig, cluster);
        try {
          let proposal = await cachedSuggestion(key);
          const cached = Boolean(proposal);
          if (!proposal) {
            proposal = await suggest(agentConfig, cluster);
            await saveSuggestion(key, proposal);
          }
          const { applied, rejected } = applyChanges(agentConfig, proposal.changes);
          send({ t: 'suggestion', cause: cluster.cause, ...proposal, changes: applied, rejected, cached });
        } catch (error) {
          console.error('[mastra] suggestion failed', cluster.cause, error?.message);
          send({ t: 'error', cause: cluster.cause, message: 'No suggestion for this cluster: the model call failed.' });
        }
      })
    );
    send({ t: 'done' });
    stream.end();
  },
  {
    cost: async req => {
      const { config: agentConfig, clusters } = readSuggest(req);
      let units = 0;
      for (const cluster of clusters) if (!(await cachedSuggestion(suggestKey(agentConfig, cluster)))) units += COST.llm;
      return units;
    },
    requireKey: true,
  }
);

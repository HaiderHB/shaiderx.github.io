// MCP surface for interview findings: tool definitions as an MCP server would list them
// (tools/list), and the handlers, run here in the browser over the findings on the page.
import { GOALS, formatTime } from './study';

const quoteSchema = {
  type: 'object',
  properties: {
    quote_id: { type: 'string' },
    text: { type: 'string', description: 'Verbatim participant words' },
    turn: { type: 'string' },
    timestamp: { type: 'string', description: 'mm:ss from interview start' },
  },
  required: ['quote_id', 'text', 'turn', 'timestamp'],
};

export const TOOLS = [
  {
    name: 'search_findings',
    title: 'Search interview findings',
    description:
      'Search findings from AI-moderated interviews. Returns matching findings with verbatim participant quotes and timestamps. Use it before answering questions about what participants said.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: "Keywords, e.g. 'payroll' or 'spreadsheet'",
        },
        goal: {
          type: 'string',
          enum: GOALS.map(goal => goal.id),
          description: GOALS.map(goal => `${goal.id} ${goal.label}`).join(', '),
        },
        limit: { type: 'integer', minimum: 1, maximum: 10, default: 3 },
      },
      required: ['query'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        total: { type: 'integer' },
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              finding_id: { type: 'string' },
              title: { type: 'string' },
              insight: { type: 'string' },
              goal: { type: ['string', 'null'] },
              score: { type: 'number' },
              quotes: { type: 'array', items: quoteSchema },
            },
            required: ['finding_id', 'title', 'insight', 'quotes'],
          },
        },
      },
      required: ['query', 'total', 'results'],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_quote',
    title: 'Get a participant quote',
    description:
      'Get one verbatim quote with the moderator question it answered, so a citation can be checked in context.',
    inputSchema: {
      type: 'object',
      properties: {
        quote_id: { type: 'string', description: "From search_findings, e.g. 'T4-1'" },
      },
      required: ['quote_id'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        ...quoteSchema.properties,
        finding_id: { type: 'string' },
        answering: {
          type: 'string',
          description: 'The moderator turn just before the quote',
        },
        full_answer: { type: 'string' },
      },
      required: ['quote_id', 'text', 'turn', 'timestamp', 'finding_id'],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
];

const STOPWORDS = new Set(
  'a an and are as at be by did do for from how i in is it of on or our so that the their them they this to was we what when where who why with you your'.split(
    ' '
  )
);

const words = text =>
  String(text)
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .split(/[^a-z0-9']+/)
    .filter(word => word.length > 1 && !STOPWORDS.has(word));

// Light stemming so "stall" finds "stalls" and "stalled".
const stem = word => word.replace(/'s$/, '').replace(/(ing|ed|es|s)$/, '');

function scoreText(terms, text, weight) {
  const tokens = words(text).map(stem);
  return terms.reduce(
    (sum, term) =>
      sum +
      (tokens.some(token => token.startsWith(term) || term.startsWith(token))
        ? weight
        : 0),
    0
  );
}

const quoteOut = quote => ({
  quote_id: quote.id,
  text: quote.text,
  turn: quote.turn,
  timestamp: formatTime(quote.t),
});

function searchFindings(findings, { query, goal, limit = 3 }) {
  const terms = words(query)
    .map(stem)
    .filter(term => term.length > 1);
  const max = Math.min(10, Math.max(1, Number(limit) || 3));

  const scored = findings
    .filter(finding => !goal || finding.goal === goal)
    .map(finding => ({
      finding,
      score:
        scoreText(terms, finding.title, 3) +
        scoreText(terms, finding.insight, 2) +
        finding.quotes.reduce((sum, quote) => sum + scoreText(terms, quote.text, 1), 0),
    }))
    .filter(item => !terms.length || item.score > 0)
    .sort((a, b) => b.score - a.score);

  return {
    query: String(query),
    total: scored.length,
    results: scored.slice(0, max).map(({ finding, score }) => ({
      finding_id: finding.id,
      title: finding.title,
      insight: finding.insight,
      goal: finding.goal,
      score,
      quotes: finding.quotes.map(quoteOut),
    })),
  };
}

function getQuote(findings, turns, { quote_id }) {
  for (const finding of findings) {
    const quote = finding.quotes.find(item => item.id === quote_id);
    if (!quote) continue;
    const index = turns.findIndex(turn => turn.label === quote.turn);
    const answer = index === -1 ? null : turns[index];
    const question =
      index === -1
        ? null
        : turns
            .slice(0, index)
            .reverse()
            .find(turn => turn.role === 'moderator');
    return {
      ...quoteOut(quote),
      finding_id: finding.id,
      answering: question?.text || null,
      full_answer: answer?.text || null,
    };
  }
  return null;
}

let rpcId = 0;

/**
 * Runs a tool the way an MCP server would and returns { request, response } as JSON-RPC.
 * turns: transcript with `label` (T1, T2...) so get_quote can add context.
 */
export function callTool(name, args, { findings, turns }) {
  rpcId += 1;
  const request = {
    jsonrpc: '2.0',
    id: rpcId,
    method: 'tools/call',
    params: { name, arguments: args },
  };

  let structured = null;
  let error = null;
  if (name === 'search_findings') {
    if (!String(args.query || '').trim()) error = 'query is required';
    else structured = searchFindings(findings, args);
  } else if (name === 'get_quote') {
    structured = getQuote(findings, turns, args);
    if (!structured) error = `No quote with id ${args.quote_id}`;
  } else {
    error = `Unknown tool: ${name}`;
  }

  const result = error
    ? { content: [{ type: 'text', text: error }], isError: true }
    : {
        // Per the MCP spec, structured results are also serialized into a text block.
        content: [{ type: 'text', text: JSON.stringify(structured) }],
        structuredContent: structured,
        isError: false,
      };

  return { request, response: { jsonrpc: '2.0', id: rpcId, result } };
}

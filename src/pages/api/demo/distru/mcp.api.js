// POST /api/demo/distru/mcp/ : a minimal, stateless MCP server ("distru-orders") over Streamable HTTP,
// answering with plain JSON (no SSE). It serves the exact tool functions the agent calls, over
// the fictional sample data only, so it is free: no paid model runs here. Rate limited by demoApi.
//   claude mcp add --transport http distru-orders https://haiderb.com/api/demo/distru/mcp/
import { COST, demoApi } from 'demos/api';
import { MCP_SERVER, MCP_TOOLS, callTool } from 'pages/demo/distru/erp';

export const config = { api: { bodyParser: { sizeLimit: '32kb' } } };

const SUPPORTED_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];

const reply = (res, id, result) => res.status(200).json({ jsonrpc: '2.0', id, result });
const fail = (res, id, code, message, status = 200) =>
  res.status(status).json({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });

export default demoApi(
  async (req, res) => {
    const message = req.body;
    if (Array.isArray(message))
      return fail(res, null, -32600, 'Batch requests are not supported', 400);
    if (!message || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
      return fail(res, message?.id, -32600, 'Invalid JSON-RPC request', 400);
    }

    // Notifications (no id), e.g. notifications/initialized, get 202 and no body
    if (message.id === undefined || message.id === null) return res.status(202).end();

    const { id, method, params } = message;
    switch (method) {
      case 'initialize': {
        const asked = params?.protocolVersion;
        return reply(res, id, {
          protocolVersion: SUPPORTED_VERSIONS.includes(asked)
            ? asked
            : SUPPORTED_VERSIONS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: {
            ...MCP_SERVER,
            title: 'Order tools (unofficial prototype, sample data)',
          },
          instructions:
            'Order-intake tools over a fictional cannabis distributor. All tools are read-only; draft_sales_order only drafts. Typical flow: lookup_account, match_products, check_inventory, propose_substitution, check_license, check_credit, draft_sales_order.',
        });
      }
      case 'ping':
        return reply(res, id, {});
      case 'tools/list':
        return reply(res, id, { tools: MCP_TOOLS });
      case 'tools/call': {
        const name = params?.name;
        if (!MCP_TOOLS.some(tool => tool.name === name))
          return fail(res, id, -32602, `Unknown tool: ${name}`);
        try {
          const result = callTool(name, params?.arguments || {});
          return reply(res, id, {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result,
            isError: false,
          });
        } catch (error) {
          if (!error.toolError) console.error('[distru mcp]', name, error);
          const text = error.toolError
            ? error.message
            : 'The tool could not run with these arguments.';
          return reply(res, id, { content: [{ type: 'text', text }], isError: true });
        }
      }
      default:
        return fail(res, id, -32601, `Method not found: ${method}`);
    }
  },
  { cost: COST.free }
);

import { useRef, useState } from 'react';
import { classes } from 'utils/style';
import { Pill } from './Badges';
import { Button } from './Button';
import { Tabs } from './Choice';
import { CopyButton } from './CodeView';
import { TextArea } from './Field';
import { formatMs } from './format';
import { JsonDetails, JsonView } from './JsonView';
import styles from './Mcp.module.css';
import { Card, CardHead, CardTitle, MiniLabel } from './Panel';
import { Notice } from './States';

/** A JSON-RPC `tools/call` request, as an MCP client sends it. */
export const rpcRequest = (id, name, args) => ({
  jsonrpc: '2.0',
  id,
  method: 'tools/call',
  params: { name, arguments: args },
});

/** MCP tool results: structured content, or an error the model can read. */
export const toolResult = structuredContent => ({ isError: false, structuredContent });
export const toolErrorResult = text => ({
  isError: true,
  content: [{ type: 'text', text }],
});

/**
 * Tool list → definition → "call it" box → JSON-RPC request and result, all in the browser.
 * tools: MCP `tools/list` entries ({ name, title, description, inputSchema, annotations }).
 * examples: { [name]: args } prefilled per tool. call(name, args) returns structured content
 * or throws; errorText(error) turns a throw into the text an MCP client would see.
 */
export function McpToolPanel({
  tools,
  examples = {},
  call,
  errorText = error => error.message,
  initialTool = tools[0]?.name,
  hint = 'Free: runs in your browser against the sample data',
  argsId = 'tool-args',
  className,
}) {
  const example = name => JSON.stringify(examples[name] ?? {}, null, 2);
  const [name, setName] = useState(initialTool);
  const [args, setArgs] = useState(() => example(initialTool));
  const [result, setResult] = useState(null);
  const callId = useRef(0);
  const tool = tools.find(item => item.name === name);

  function select(next) {
    setName(next);
    setArgs(example(next));
    setResult(null);
  }

  function run(event) {
    event.preventDefault();
    let parsed;
    try {
      parsed = args.trim() ? JSON.parse(args) : {};
    } catch {
      setResult({ error: 'Arguments are not valid JSON.' });
      return;
    }
    const request = rpcRequest(++callId.current, name, parsed);
    const started = performance.now();
    let response;
    try {
      response = toolResult(call(name, parsed));
    } catch (error) {
      response = toolErrorResult(errorText(error));
    }
    setResult({ request, response, ms: performance.now() - started });
  }

  return (
    <Card className={classes(styles.panel, className)}>
      <Tabs
        variant="list"
        label="Tools"
        className={styles.toolList}
        items={tools.map(item => ({ id: item.name, label: item.name, sub: item.title }))}
        value={name}
        onChange={select}
      />
      <div className={styles.pane} role="tabpanel">
        <div className={styles.definition}>
          <CardHead>
            <CardTitle>
              <code>{tool.name}</code>
            </CardTitle>
            {tool.annotations?.readOnlyHint && <Pill tone="ok">readOnlyHint</Pill>}
          </CardHead>
          <p className={styles.description}>{tool.description}</p>
          <JsonDetails summary="Tool definition (tools/list)" value={tool} open tall />
        </div>
        <form className={styles.tryBox} onSubmit={run}>
          <MiniLabel as="label" htmlFor={argsId}>
            arguments
          </MiniLabel>
          <TextArea
            id={argsId}
            code
            value={args}
            spellCheck={false}
            rows={6}
            onChange={event => setArgs(event.target.value)}
          />
          <div className={styles.runRow}>
            <Button type="submit">Call tool</Button>
            <span className={styles.hint}>{hint}</span>
          </div>
          {result?.error && (
            <Notice kind="error" size="s" className={styles.error}>
              {result.error}
            </Notice>
          )}
          {result?.response && (
            <div className={styles.exchange}>
              <div>
                <MiniLabel>request</MiniLabel>
                <JsonView value={result.request} />
              </div>
              <div>
                <MiniLabel>
                  result{result.response.isError ? ' · isError' : ''} ·{' '}
                  {formatMs(result.ms)}
                </MiniLabel>
                <JsonView value={result.response} tall />
              </div>
            </div>
          )}
        </form>
      </div>
    </Card>
  );
}

/** "Connect from Claude Code" row: the command and a copy button. */
export function McpConnectCommand({ label, command, className }) {
  return (
    <div className={classes(styles.connect, className)}>
      <MiniLabel>{label}</MiniLabel>
      <div className={styles.connectRow}>
        <code className={styles.command}>{command}</code>
        <CopyButton variant="ghost" text={command} failedLabel="Copy" resetMs={1500} />
      </div>
    </div>
  );
}

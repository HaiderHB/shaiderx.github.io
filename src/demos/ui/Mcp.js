import { useEffect, useRef, useState } from 'react';
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

const CALL_STATUS = {
  allowed: { label: 'allowed', tone: 'ok' },
  blocked: { label: 'blocked', tone: 'bad' },
  awaiting: { label: 'awaiting approval', tone: 'warn' },
  approved: { label: 'approved', tone: 'ok' },
  rejected: { label: 'rejected', tone: 'muted' },
  error: { label: 'error', tone: 'bad' },
  running: { label: 'calling', tone: 'muted' },
};

/** One line of compact JSON for arguments: {"thread_id":"t02"} → thread_id: "t02". */
function compactArgs(args, clip) {
  const entries = Object.entries(args || {});
  if (!entries.length) return '{}';
  return entries
    .map(([key, value]) => {
      let text =
        typeof value === 'string' ? JSON.stringify(value) : JSON.stringify(value);
      if (text && text.length > clip) text = `${text.slice(0, clip - 1)}…"`;
      return `${key}: ${text}`;
    })
    .join(', ');
}

/**
 * Streamed MCP tool calls, one row per tools/call: index, tool name, its permission scope, what
 * the gate did (allowed, blocked, awaiting approval...), the arguments on one line, an optional
 * note (why it was blocked) and the result behind a disclosure.
 * calls: [{ id, name, scope, status, args, result, note }]; statuses overrides labels and tones
 * per status ({ blocked: { label, tone } }); scopeTones maps scope -> 'neutral' | 'accent' |
 * 'warn'; pending shows a "calling" row; follow keeps the newest row in view inside the log's
 * own scroll box (height: --uiCallLogHeight). active marks one row (the call the page is showing).
 */
export function McpCallLog({
  calls,
  statuses,
  scopeTones = { read: 'neutral', draft: 'accent', act: 'warn' },
  pending = false,
  pendingLabel = 'Waiting for the model…',
  empty = 'No tool calls yet.',
  follow = true,
  active,
  argsClip = 90,
  resultLabel = 'result',
  label = 'Tool calls',
  className,
}) {
  const box = useRef(null);
  const count = calls.length;
  useEffect(() => {
    const node = box.current;
    if (!follow || !node) return;
    node.scrollTop = node.scrollHeight;
  }, [count, pending, follow]);
  const statusOf = status =>
    ({ ...CALL_STATUS, ...statuses }[status] || CALL_STATUS.allowed);

  if (!count && !pending)
    return <p className={classes(styles.logEmpty, className)}>{empty}</p>;
  return (
    <div ref={box} className={classes(styles.log, className)}>
      <ol className={styles.logList} aria-label={label}>
        {calls.map(call => {
          const status = statusOf(call.status);
          return (
            <li
              key={call.id}
              className={styles.call}
              data-tone={status.tone}
              data-active={active === call.id ? '' : undefined}
            >
              <div className={styles.callHead}>
                <span className={styles.callIndex}>{call.id}</span>
                <code className={styles.callName}>{call.name}</code>
                {call.scope && (
                  <span
                    className={styles.scope}
                    data-tone={scopeTones[call.scope] || 'neutral'}
                  >
                    {call.scope}
                  </span>
                )}
                <span className={styles.callStatus} data-tone={status.tone}>
                  {status.label}
                </span>
              </div>
              <code className={styles.callArgs}>{compactArgs(call.args, argsClip)}</code>
              {call.note && <p className={styles.callNote}>{call.note}</p>}
              {call.result != null && (
                <details className={styles.callResult}>
                  <summary>{resultLabel}</summary>
                  <JsonView value={call.result} clip={220} />
                </details>
              )}
            </li>
          );
        })}
        {pending && (
          <li className={styles.call} data-tone="muted" data-pending="">
            <div className={styles.callHead}>
              <span className={styles.callIndex}>{count + 1}</span>
              <span className={styles.pendingText}>{pendingLabel}</span>
            </div>
          </li>
        )}
      </ol>
    </div>
  );
}

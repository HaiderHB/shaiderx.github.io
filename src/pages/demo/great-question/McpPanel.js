import {
  Button,
  Card,
  Chip,
  Input,
  JsonView,
  Pill,
  SegmentedControl,
  Select,
  srOnly,
} from 'demos/ui';
import { useEffect, useMemo, useState } from 'react';
import { FiPlay } from 'react-icons/fi';
import styles from './GreatQuestion.module.css';
import { TOOLS, callTool } from './mcp';
import { GOALS } from './study';

const PRESETS = ['payroll', 'spreadsheet', 'alert', 'review'];

// A starting query that matches the top finding, so the box shows a real result on load.
const defaultQuery = findings =>
  (findings?.[0]?.title || '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .find(word => word.length >= 5) || 'onboarding';

const TOOL_OPTIONS = TOOLS.map(item => ({
  value: item.name,
  label: <code>{item.name}</code>,
}));

function Json({ value, clip = false, className }) {
  return (
    <JsonView
      className={className}
      value={value}
      variant="boxed"
      colon="plain"
      clip={clip ? 140 : undefined}
      clipNote={
        <p className={styles.small}>
          The text block carries the same JSON as structuredContent, serialized (shortened
          here).
        </p>
      }
    />
  );
}

/** MCP tool definitions plus a free, in-browser "call the tool" box over the findings. */
export function McpPanel({ findings, turns, sourceLabel }) {
  const [toolName, setToolName] = useState('search_findings');
  const [query, setQuery] = useState('payroll');
  const [goal, setGoal] = useState('');
  const [quoteId, setQuoteId] = useState('');
  const [call, setCall] = useState(null);

  const tool = TOOLS.find(item => item.name === toolName);
  const quoteIds = useMemo(
    () => (findings || []).flatMap(finding => finding.quotes.map(quote => quote.id)),
    [findings]
  );

  // New findings (example run vs. live interview): reset the box and show one real call.
  useEffect(() => {
    const first = defaultQuery(findings);
    setQuoteId(quoteIds[0] || '');
    setToolName('search_findings');
    setQuery(first);
    setGoal('');
    setCall(
      findings?.length
        ? callTool('search_findings', { query: first, limit: 3 }, { findings, turns })
        : null
    );
    // turns only matter for get_quote context; re-running on every transcript change is noise
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findings, quoteIds]);

  function run(name = toolName, args) {
    if (!findings?.length) return;
    const finalArgs =
      args ||
      (name === 'search_findings'
        ? { query: query.trim(), ...(goal && { goal }), limit: 3 }
        : { quote_id: quoteId });
    setCall(callTool(name, finalArgs, { findings, turns }));
  }

  function preset(word) {
    setToolName('search_findings');
    setQuery(word);
    run('search_findings', { query: word, ...(goal && { goal }), limit: 3 });
  }

  return (
    <div className={styles.mcpGrid}>
      <Card className={styles.mcpCol}>
        <div className={styles.mcpHead}>
          <Pill tone="ok">Read-only</Pill>
          <span>{TOOLS.length} tools</span>
        </div>
        <SegmentedControl
          className={styles.toolPicker}
          label="Tool"
          options={TOOL_OPTIONS}
          value={toolName}
          onChange={name => {
            setToolName(name);
            setCall(null);
          }}
        />
        <p className={styles.codeLabel}>Tool definition, as listed by tools/list</p>
        <Json value={tool} className={styles.toolDef} />
      </Card>

      <Card className={styles.mcpCol}>
        <form
          className={styles.callBox}
          onSubmit={event => {
            event.preventDefault();
            run();
          }}
        >
          <p className={styles.codeLabel}>
            Call <code>{toolName}</code> over {sourceLabel}
          </p>
          {toolName === 'search_findings' ? (
            <>
              <div className={styles.callRow}>
                <label className={srOnly} htmlFor="mcp-query">
                  query
                </label>
                <Input
                  id="mcp-query"
                  className={styles.queryInput}
                  value={query}
                  maxLength={80}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="query"
                />
                <label className={srOnly} htmlFor="mcp-goal">
                  goal
                </label>
                <Select
                  id="mcp-goal"
                  className={styles.querySelect}
                  value={goal}
                  onChange={event => setGoal(event.target.value)}
                >
                  <option value="">Any goal</option>
                  {GOALS.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.id} {item.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className={styles.presets}>
                {PRESETS.map(word => (
                  <Chip key={word} onClick={() => preset(word)}>
                    {word}
                  </Chip>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.callRow}>
              <label className={srOnly} htmlFor="mcp-quote">
                quote_id
              </label>
              <Select
                id="mcp-quote"
                className={styles.querySelect}
                value={quoteId}
                onChange={event => setQuoteId(event.target.value)}
              >
                {quoteIds.map(id => (
                  <option key={id} value={id}>
                    quote_id: {id}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <Button
            variant="secondary"
            pill
            className={styles.runButton}
            type="submit"
            disabled={
              !findings?.length ||
              (toolName === 'search_findings' ? !query.trim() : !quoteId)
            }
          >
            <FiPlay aria-hidden /> Run tool
          </Button>
          {!findings?.length && (
            <p className={styles.small}>
              Generate findings first, or switch to the example run.
            </p>
          )}
        </form>

        {call ? (
          <>
            <p className={styles.codeLabel}>Request</p>
            <Json value={call.request} />
            <p className={styles.codeLabel}>
              Result: what an MCP client like Claude receives
            </p>
            <Json value={call.response} clip />
          </>
        ) : (
          <p className={styles.mcpHint}>
            Runs in your browser over the findings above. No model call, no cost.
          </p>
        )}
      </Card>
    </div>
  );
}

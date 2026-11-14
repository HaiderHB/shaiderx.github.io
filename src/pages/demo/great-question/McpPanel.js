import { Fragment, useEffect, useMemo, useState } from 'react';
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

// Minimal JSON syntax coloring: keys, strings, numbers, literals.
const TOKEN =
  /("(?:\\.|[^"\\])*")(\s*:)?|\b(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b|\b(true|false|null)\b/g;

const CLIP = 140;

// Shortens long strings for display only (the serialized text block repeats the whole result).
function clipStrings(value, clipped) {
  if (typeof value === 'string' && value.length > CLIP + 20) {
    clipped.count += 1;
    return `${value.slice(0, CLIP)}… (+${value.length - CLIP} chars)`;
  }
  if (Array.isArray(value)) return value.map(item => clipStrings(item, clipped));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, clipStrings(item, clipped)])
    );
  }
  return value;
}

function Json({ value, clip = false }) {
  const clipped = { count: 0 };
  const text = JSON.stringify(clip ? clipStrings(value, clipped) : value, null, 2);
  const parts = [];
  let last = 0;
  let match;
  TOKEN.lastIndex = 0;
  while ((match = TOKEN.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1] && match[2]) {
      parts.push(
        <span key={match.index} className={styles.jsonKey}>
          {match[1]}
        </span>,
        match[2]
      );
    } else if (match[1]) {
      parts.push(
        <span key={match.index} className={styles.jsonString}>
          {match[1]}
        </span>
      );
    } else {
      parts.push(
        <span key={match.index} className={styles.jsonLiteral}>
          {match[0]}
        </span>
      );
    }
    last = match.index + match[0].length;
  }
  parts.push(text.slice(last));
  return (
    <>
      <pre className={styles.json}>
        <code>
          {parts.map((part, index) => (
            <Fragment key={index}>{part}</Fragment>
          ))}
        </code>
      </pre>
      {clipped.count > 0 && (
        <p className={styles.small}>
          The text block carries the same JSON as structuredContent, serialized (shortened
          here).
        </p>
      )}
    </>
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
      <div className={styles.mcpCol}>
        <div className={styles.segmented} role="group" aria-label="Tool">
          {TOOLS.map(item => (
            <button
              key={item.name}
              type="button"
              className={styles.segment}
              aria-pressed={toolName === item.name}
              onClick={() => {
                setToolName(item.name);
                setCall(null);
              }}
            >
              <code>{item.name}</code>
            </button>
          ))}
        </div>
        <p className={styles.codeLabel}>Tool definition, as listed by tools/list</p>
        <Json value={tool} />
      </div>

      <div className={styles.mcpCol}>
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
                <label className={styles.visuallyHidden} htmlFor="mcp-query">
                  query
                </label>
                <input
                  id="mcp-query"
                  className={styles.input}
                  value={query}
                  maxLength={80}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="query"
                />
                <label className={styles.visuallyHidden} htmlFor="mcp-goal">
                  goal
                </label>
                <select
                  id="mcp-goal"
                  className={styles.select}
                  value={goal}
                  onChange={event => setGoal(event.target.value)}
                >
                  <option value="">Any goal</option>
                  {GOALS.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.id} {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.presets}>
                {PRESETS.map(word => (
                  <button
                    key={word}
                    type="button"
                    className={styles.chip}
                    onClick={() => preset(word)}
                  >
                    {word}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.callRow}>
              <label className={styles.visuallyHidden} htmlFor="mcp-quote">
                quote_id
              </label>
              <select
                id="mcp-quote"
                className={styles.select}
                value={quoteId}
                onChange={event => setQuoteId(event.target.value)}
              >
                {quoteIds.map(id => (
                  <option key={id} value={id}>
                    quote_id: {id}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            className={styles.secondaryButton}
            type="submit"
            disabled={
              !findings?.length ||
              (toolName === 'search_findings' ? !query.trim() : !quoteId)
            }
          >
            <FiPlay aria-hidden /> Run tool
          </button>
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
      </div>
    </div>
  );
}

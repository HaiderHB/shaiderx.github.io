// Panels for the Vena demo page. State lives in index.page.js; these only render it.
import {
  Button,
  Card,
  CardHead,
  CardTitle,
  CheckList,
  EvalTable,
  MiniLabel,
  Pill,
  ProbabilityBar,
  Ring,
  Select,
  SheetGrid,
  SplitBar,
  Spinner,
  StatusIcon,
  Tag,
  Timeline,
  TimelineStep,
  formatMs,
} from 'demos/ui';
import { Fragment } from 'react';
import { FiArrowRight, FiCornerDownRight, FiRotateCcw } from 'react-icons/fi';
import { COA, TYPES, coaById, typeById } from './data';
import { cellRefs, compactMoney, money, trustTone } from './engine';
import styles from './Vena.module.css';

const SECTION_SHORT = { asset: 'Asset', liability: 'Liability', equity: 'Equity', revenue: 'Revenue', cogs: 'COGS', opex: 'OpEx' };

export function SectionTag({ type }) {
  return (
    <span className={styles.sectionTag} data-type={type}>
      {SECTION_SHORT[type] || type}
    </span>
  );
}

// --- hero ---------------------------------------------------------------------------------------

export function HeroScore({ evalResult, counts, balanced, running, isSample }) {
  const total = evalResult?.total || 0;
  const correct = evalResult?.correct || 0;
  return (
    <Card tone="accent" className={styles.heroCard}>
      <div className={styles.heroTop}>
        <span className={styles.heroLabel}>{isSample ? 'Matches ground truth' : 'Rows mapped'}</span>
        {running && <Spinner />}
      </div>
      <div className={styles.heroScore}>
        <Ring
          value={isSample ? (total ? correct / total : 0) : counts.mapped / Math.max(1, counts.rows)}
          tone="ink"
          size={76}
          stroke={7}
          label={isSample ? `${correct} of ${total} rows match ground truth` : `${counts.mapped} rows mapped`}
        />
        <span className={styles.heroValue}>
          {isSample ? (
            <>
              {total ? correct : '–'}
              <small> / {total || counts.rows}</small>
            </>
          ) : (
            <>
              {counts.mapped}
              <small> / {counts.rows}</small>
            </>
          )}
        </span>
      </div>
      <ul className={styles.heroFacts}>
        <li>
          <strong>{counts.fast}</strong> by the fast model
        </li>
        <li>
          <strong>{counts.llm}</strong> sent to the LLM
        </li>
        <li>{balanced == null ? 'Checks pending' : balanced ? 'Debits = credits' : 'Out of balance'}</li>
      </ul>
    </Card>
  );
}

// --- run timeline -------------------------------------------------------------------------------

export function RunTimeline({ stages }) {
  return (
    <Timeline className={styles.timeline}>
      {stages.map((stage, index) => (
        <TimelineStep
          key={stage.id}
          index={index}
          status={stage.status}
          title={stage.title}
          ms={stage.ms}
          detail={stage.tag}
        >
          {stage.text && <p className={styles.stageText}>{stage.text}</p>}
        </TimelineStep>
      ))}
    </Timeline>
  );
}

// --- mapping table ------------------------------------------------------------------------------

function ConfidenceBar({ value, pending }) {
  const tone = value >= 0.97 ? 'ok' : value >= 0.8 ? 'warn' : 'bad';
  return (
    <span className={styles.conf} data-pending={pending || undefined}>
      <span className={styles.confTrack}>
        <span className={styles.confFill} data-tone={tone} style={{ width: `${pending ? 0 : Math.max(3, value * 100)}%` }} />
      </span>
      <span className={styles.confValue}>{pending ? '–' : `${Math.round(value * 100)}%`}</span>
    </span>
  );
}

function RouteChip({ entry, llmPending }) {
  if (!entry) return <span className={styles.routeIdle}>queued</span>;
  if (entry.override) return <span className={styles.route} data-route="person">You</span>;
  if (entry.route === 'llm' || llmPending) {
    return (
      <span className={styles.route} data-route="llm">
        {llmPending ? <Spinner /> : null}
        LLM
      </span>
    );
  }
  return (
    <span className={styles.route} data-route="fast">
      Fast
    </span>
  );
}

export function MapTable({
  rows,
  view,
  openRow,
  onToggle,
  renderDetail,
}) {
  return (
    <div className={styles.map} role="table" aria-label="Trial-balance rows mapped to the chart of accounts">
      <div className={styles.mapHead} role="row">
        <span role="columnheader">Line</span>
        <span role="columnheader">From the export</span>
        <span role="columnheader" aria-hidden />
        <span role="columnheader">Chart of accounts</span>
        <span role="columnheader">Confidence</span>
        <span role="columnheader">Route</span>
        <span role="columnheader">Trust</span>
      </div>
      {rows.map(row => {
        const item = view[row.id] || {};
        const account = coaById(item.account);
        const open = openRow === row.id;
        return (
          <Fragment key={row.id}>
            <button
              type="button"
              role="row"
              className={styles.mapRow}
              data-open={open || undefined}
              data-excluded={item.excluded || undefined}
              data-fail={item.fail || undefined}
              data-row={row.id}
              aria-expanded={open}
              onClick={() => onToggle(row.id)}
            >
              <span role="cell" className={styles.line}>
                {row.line}
              </span>
              <span role="cell" className={styles.source}>
                <code>{row.code || '—'}</code>
                <span>{row.name}</span>
                <span className={styles.amount} data-side={row.side}>
                  {money(row.amount)} {row.side === 'debit' ? 'Dr' : 'Cr'}
                </span>
              </span>
              <span role="cell" className={styles.arrow} aria-hidden>
                <FiArrowRight />
              </span>
              <span role="cell" className={styles.target}>
                {account ? (
                  <span key={`${item.account}-${item.route}`} className={styles.targetIn} data-second={item.llmPending || undefined}>
                    <SectionTag type={account.type} />
                    <span className={styles.targetName}>{account.name}</span>
                  </span>
                ) : (
                  <span className={styles.targetEmpty} aria-label="Not mapped yet" />
                )}
              </span>
              <span role="cell" className={styles.confCell}>
                <ConfidenceBar value={item.confidence || 0} pending={!account} />
              </span>
              <span role="cell" className={styles.routeCell}>
                <RouteChip entry={item.entry} llmPending={item.llmPending} />
              </span>
              <span role="cell" className={styles.trustCell}>
                {item.excluded ? (
                  <Tag tone="warn">dup</Tag>
                ) : item.trust != null ? (
                  <span className={styles.trust} data-tone={trustTone(item.trust)}>
                    {item.trust}
                  </span>
                ) : (
                  <span className={styles.trustIdle}>–</span>
                )}
              </span>
            </button>
            {open && (
              <div role="row" className={styles.detailRow}>
                <div role="cell" className={styles.detailCell}>
                  {renderDetail(row)}
                </div>
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

// --- provenance -----------------------------------------------------------------------------------

export function RowTrace({ row, prof, fileName, item, issues, onOverride, threshold }) {
  const refs = cellRefs(prof, row);
  const entry = item.entry;
  const lines = prof.fileRows;
  const from = Math.max(prof.headerLine + 1, row.line - 1);
  const to = Math.min(lines.length, row.line + 1);
  const excerpt = [lines[prof.headerLine - 1], ...lines.slice(from - 1, to)];
  const marks = {};
  ['code', 'name', 'debit', 'credit', 'amount'].forEach(key => {
    if (!refs[key]) return;
    if ((key === 'debit' && !row.debit) || (key === 'credit' && !row.credit)) return;
    marks[refs[key]] = 'accent';
  });
  const shownRefs = Object.keys(marks);
  const numeric = ['debit', 'credit', 'amount'].map(key => prof.columns[key]).filter(index => index != null);
  const firstLines = [prof.headerLine, ...Array.from({ length: to - from + 1 }, (_, i) => from + i)];
  const account = coaById(item.account);
  const fastAccount = coaById(entry?.fastChoice);

  return (
    <div className={styles.trace}>
      <div className={styles.traceSource}>
        <MiniLabel>Source</MiniLabel>
        <p className={styles.traceRef}>
          <code>{fileName}</code> · line {row.line} · cells {shownRefs.join(', ')}
        </p>
        <SheetGrid
          className={styles.traceSheet}
          rows={excerpt}
          lines={firstLines}
          columns={prof.header.length}
          activeLine={row.line}
          cells={marks}
          numeric={numeric}
          label={`Line ${row.line} of ${fileName} with the cells it was read from`}
        />
        <p className={styles.traceNote}>
          Read as {money(row.amount)} {row.side}
          {prof.period ? `, period ${row.period || prof.period}` : ''}
          {row.currency ? `, ${row.currency}` : ''}.
        </p>
      </div>

      <div className={styles.traceWhy}>
        <MiniLabel>Why {account ? account.name : 'this account'}</MiniLabel>
        {entry?.candidates?.length ? (
          <div className={styles.traceBars}>
            {entry.candidates.map(candidate => (
              <ProbabilityBar
                key={candidate.id}
                label={coaById(candidate.id)?.name || candidate.id}
                value={candidate.p}
                tone={candidate.id === entry.fastChoice ? 'accent' : undefined}
                strong={candidate.id === entry.fastChoice}
                marks={[threshold]}
              />
            ))}
            <p className={styles.traceNote}>
              Fast decision model, {formatMs(entry.ms)}. The tick marks the {Math.round(threshold * 100)}% bar a row needs to skip
              the second look.
            </p>
          </div>
        ) : (
          <p className={styles.traceNote}>Waiting for the fast model.</p>
        )}
        {entry?.route === 'llm' && (
          <div className={styles.secondLook}>
            <FiCornerDownRight aria-hidden />
            <div>
              <strong>
                LLM second look:{' '}
                {entry.account === entry.fastChoice ? 'agrees' : `overrules ${fastAccount?.name || 'the fast pick'}`}
              </strong>
              <p>{entry.reason || 'Waiting for the LLM…'}</p>
            </div>
          </div>
        )}
      </div>

      <div className={styles.traceTrust}>
        <MiniLabel>Checks on this row</MiniLabel>
        {issues.length ? (
          <ul className={styles.rowIssues}>
            {issues.map(issue => (
              <li key={issue.text} data-status={issue.status}>
                <StatusIcon status={issue.status === 'fixed' ? 'warn' : issue.status} />
                <span>{issue.text}</span>
              </li>
            ))}
          </ul>
        ) : (
          <ul className={styles.rowIssues}>
            <li data-status="pass">
              <StatusIcon status="pass" />
              <span>On its account&apos;s normal side; not a duplicate; same period and currency as the file.</span>
            </li>
          </ul>
        )}
        <div className={styles.trustBox}>
          <span className={styles.trustBig} data-tone={item.excluded ? 'bad' : trustTone(item.trust ?? 0)}>
            {item.excluded ? '0' : item.trust ?? '–'}
          </span>
          <span className={styles.trustMath}>
            <strong>Trust</strong>
            {item.excluded
              ? 'Left out: duplicate row'
              : `${item.trustParts ? item.trustParts.confidence.toFixed(2) : '–'} ${item.override ? 'set by you' : 'model confidence'} × ${
                  item.trustParts ? item.trustParts.factor.toFixed(1) : '–'
                } checks`}
          </span>
        </div>
        {account && !item.excluded && (
          <div className={styles.override}>
            <label htmlFor={`override-${row.id}`}>Override the mapping</label>
            <div className={styles.overrideRow}>
              <Select
                id={`override-${row.id}`}
                value={item.account}
                onChange={event => onOverride(row.id, event.target.value)}
              >
                {TYPES.map(type => (
                  <optgroup key={type.id} label={type.label}>
                    {COA.filter(option => option.type === type.id).map(option => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
              {item.override && (
                <Button variant="ghost" size="s" onClick={() => onOverride(row.id, null)}>
                  <FiRotateCcw aria-hidden /> Reset
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- checks -------------------------------------------------------------------------------------

export function ChecksCard({ validation, pending }) {
  return (
    <Card className={styles.checksCard}>
      <CardHead aside={validation && <CheckSummary checks={validation.checks} />}>
        <CardTitle>Checks, in code</CardTitle>
      </CardHead>
      {validation ? (
        <CheckList items={validation.checks} statusLabels={{ fixed: 'Fixed', na: 'n/a' }} label="Validation checks" />
      ) : (
        <p className={styles.muted}>{pending ? 'Runs once every row is mapped.' : 'Run the mapping first.'}</p>
      )}
    </Card>
  );
}

function CheckSummary({ checks }) {
  const fails = checks.filter(check => check.status === 'fail').length;
  const fixed = checks.filter(check => check.status === 'fixed').length;
  return (
    <Pill tone={fails ? 'bad' : fixed ? 'warn' : 'ok'}>
      {fails ? `${fails} failing` : fixed ? `All pass, ${fixed} fixed` : 'All pass'}
    </Pill>
  );
}

// --- statements ---------------------------------------------------------------------------------

function Line({ label, value, strong, sub, tone }) {
  return (
    <div className={styles.stLine} data-strong={strong || undefined} data-sub={sub || undefined}>
      <span>{label}</span>
      <span className={styles.stValue} data-tone={tone}>
        {money(value, { cents: false })}
      </span>
    </div>
  );
}

export function Statements({ stmt, currency, changed }) {
  const { bs, pl } = stmt;
  return (
    <div className={styles.statements}>
      <Card className={styles.stCard} data-flash={changed || undefined}>
        <CardHead aside={<Pill tone={bs.balanced ? 'ok' : 'bad'}>{bs.balanced ? 'Balances' : 'Does not balance'}</Pill>}>
          <CardTitle>Balance sheet</CardTitle>
        </CardHead>
        <p className={styles.stBig}>
          {compactMoney(bs.assets)}
          <small> total assets, {currency}</small>
        </p>
        <Line label="Current assets" value={bs.currentAssets} sub />
        <Line label="Non-current assets" value={bs.nonCurrentAssets} sub />
        <Line label="Total assets" value={bs.assets} strong />
        <Line label="Liabilities" value={bs.liabilities} sub />
        <Line label="Equity" value={bs.equity} sub tone={bs.equity < 0 ? 'bad' : undefined} />
        <Line label="Net income, year to date" value={bs.netIncome} sub />
        <Line label="Liabilities + equity" value={bs.totalLE} strong />
      </Card>
      <Card className={styles.stCard} data-flash={changed || undefined}>
        <CardHead aside={<Pill>{Math.round(pl.grossMargin * 100)}% gross margin</Pill>}>
          <CardTitle>P&amp;L, year to date</CardTitle>
        </CardHead>
        <p className={styles.stBig}>
          {compactMoney(pl.netIncome)}
          <small> net income</small>
        </p>
        <Line label="Revenue, net of discounts" value={pl.revenue} strong />
        <Line label="Cost of revenue" value={-pl.cogs} sub />
        <Line label="Gross profit" value={pl.grossProfit} strong />
        {pl.opexLines.map(line => (
          <Line key={line.name} label={line.name} value={-line.value} sub />
        ))}
        <Line label="Operating income" value={pl.operatingIncome} strong />
        <Line label="Interest and other income" value={pl.other} sub />
        <Line label="Net income" value={pl.netIncome} strong />
      </Card>
    </div>
  );
}

export function CleanTrialBalance({ stmt, overridden }) {
  let lastType = null;
  return (
    <Card className={styles.tbCard}>
      <CardHead aside={<span className={styles.muted}>{stmt.lines.length} lines</span>}>
        <CardTitle>Clean trial balance</CardTitle>
      </CardHead>
      <div className={styles.tb} role="table" aria-label="Clean trial balance on the standard chart of accounts">
        <div className={styles.tbHead} role="row">
          <span role="columnheader">Account</span>
          <span role="columnheader">Rows</span>
          <span role="columnheader">Debit</span>
          <span role="columnheader">Credit</span>
        </div>
        {stmt.lines.map(line => {
          const showType = line.account.type !== lastType;
          lastType = line.account.type;
          return (
            <Fragment key={line.account.id}>
              {showType && (
                <div className={styles.tbGroup} role="row">
                  <span role="cell">{typeById(line.account.type).label}</span>
                </div>
              )}
              <div className={styles.tbRow} role="row" data-changed={overridden.has(line.account.id) || undefined}>
                <span role="cell">
                  {line.account.name}
                  {line.account.contra && <em> contra</em>}
                </span>
                <span role="cell" className={styles.tbRows}>
                  {line.rows.length}
                </span>
                <span role="cell">{line.net > 0 ? money(line.net) : ''}</span>
                <span role="cell">{line.net < 0 ? money(-line.net) : ''}</span>
              </div>
            </Fragment>
          );
        })}
        <div className={styles.tbTotal} role="row">
          <span role="cell">Total</span>
          <span role="cell" />
          <span role="cell">{money(stmt.trialBalance.debit)}</span>
          <span role="cell">{money(stmt.trialBalance.credit)}</span>
        </div>
      </div>
    </Card>
  );
}

// --- eval ---------------------------------------------------------------------------------------

export function EvalPanel({ evalResult, entries, rows, timing, kind, overrideCount, costUnits }) {
  const routed = rows.filter(row => entries[row.id]?.route === 'llm');
  const evalRows = [
    ...routed.map(row => ({ row, why: 'second look' })),
    ...(evalResult?.misses || [])
      .filter(miss => entries[miss.row.id]?.route !== 'llm')
      .map(miss => ({ row: miss.row, why: 'miss' })),
  ];
  const truth = Object.fromEntries((evalResult?.misses || []).map(miss => [miss.row.id, miss.expected]));
  const callTimes = rows.map(row => entries[row.id]?.ms).filter(ms => ms > 0);
  const fastPerCall = callTimes.length ? callTimes.reduce((a, b) => a + b, 0) / callTimes.length : null;

  return (
    <div className={styles.evalGrid}>
      <Card tone="tint" className={styles.evalScore}>
        <CardHead aside={<Pill>{kind === 'live' ? 'Live run' : 'Example run'}</Pill>}>
          <CardTitle>Against ground truth</CardTitle>
        </CardHead>
        {evalResult ? (
          <>
            <p className={styles.evalBig}>
              {evalResult.correct}
              <small> / {evalResult.total} rows</small>
            </p>
            <p className={styles.muted}>
              Mapped to the same line a person chose by hand, written before any model run.
            </p>
            <SplitBar
              label="Correct rows by route"
              parts={[
                { label: 'Fast model, correct', value: evalResult.fast.correct, tone: 'accent' },
                { label: 'LLM second look, correct', value: evalResult.llm.correct, tone: 'ink' },
                { label: 'Wrong', value: evalResult.total - evalResult.correct, tone: 'bad' },
              ]}
            />
            <dl className={styles.evalFacts}>
              <div>
                <dt>Fast model</dt>
                <dd>
                  {evalResult.fast.correct} / {evalResult.fast.n}
                </dd>
              </div>
              <div>
                <dt>LLM second look</dt>
                <dd>
                  {evalResult.llm.correct} / {evalResult.llm.n}
                </dd>
              </div>
              <div>
                <dt>Fast model alone, all rows</dt>
                <dd>
                  {evalResult.fastOnly} / {evalResult.total}
                </dd>
              </div>
              <div>
                <dt>Second look fixed / broke</dt>
                <dd>
                  {evalResult.llm.fixed} / {evalResult.llm.broke}
                </dd>
              </div>
              {overrideCount > 0 && (
                <div>
                  <dt>With your {overrideCount === 1 ? 'override' : `${overrideCount} overrides`}</dt>
                  <dd>
                    {evalResult.withOverrides} / {evalResult.total}
                  </dd>
                </div>
              )}
            </dl>
          </>
        ) : (
          <p className={styles.muted}>Ground truth exists for the sample export only; a pasted file gets the timing and cost below.</p>
        )}
      </Card>

      <Card className={styles.evalCases}>
        <CardHead>
          <CardTitle>The hard rows</CardTitle>
        </CardHead>
        {evalRows.length ? (
          <EvalTable
            columns={['Row', 'Ground truth', 'Engine']}
            rows={evalRows.map(({ row }) => {
              const entry = entries[row.id];
              const expected = truth[row.id] || (evalResult ? entry.account : null);
              const isMiss = Boolean(truth[row.id]);
              return {
                id: row.id,
                label: `${row.line} · ${row.name}`,
                expected: evalResult ? coaById(isMiss ? truth[row.id] : expected)?.name : '—',
                actual: `${coaById(entry.account)?.name}${entry.route === 'llm' ? ' (LLM)' : ''}`,
                pass: evalResult ? !isMiss : null,
              };
            })}
          />
        ) : (
          <p className={styles.muted}>No row fell under the confidence bar and nothing was missed.</p>
        )}
      </Card>

      <Card className={styles.evalCost}>
        <CardHead>
          <CardTitle>Time and cost, this run</CardTitle>
        </CardHead>
        {timing ? (
          <dl className={styles.costList}>
            <div>
              <dt>Whole mapping stage</dt>
              <dd>{formatMs(timing.totalMs)}</dd>
            </div>
            <div>
              <dt>Fast model: {timing.fastCalls} calls, 6 at a time</dt>
              <dd>{formatMs(timing.fastMs)}</dd>
            </div>
            <div>
              <dt>Average decision, one row</dt>
              <dd>{fastPerCall != null ? formatMs(fastPerCall) : '–'}</dd>
            </div>
            <div>
              <dt>LLM second look: 1 call, {routed.length} rows</dt>
              <dd>{routed.length ? formatMs(timing.llmMs) : 'skipped'}</dd>
            </div>
            <div>
              <dt>Tokens: fast model (input only) / LLM (est.)</dt>
              <dd>
                {(timing.fastTokens / 1000).toFixed(1)}k / {(timing.llmTokens / 1000).toFixed(1)}k
              </dd>
            </div>
            <div>
              <dt>Checks, trust, statements, eval</dt>
              <dd>in code, &lt;5 ms</dd>
            </div>
            <div>
              <dt>Charged to the demo budget</dt>
              <dd>{costUnits} units ≈ {costUnits}¢ cap</dd>
            </div>
          </dl>
        ) : (
          <p className={styles.muted}>Shows once a run finishes.</p>
        )}
      </Card>
    </div>
  );
}

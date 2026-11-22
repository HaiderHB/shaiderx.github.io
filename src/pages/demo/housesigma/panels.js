// Presentational pieces of the HouseSigma demo page. State lives in index.page.js; the numbers
// come from engine.js (code), the verdict and wording from the API (models).
import {
  Button,
  Caret,
  DecisionBadge,
  EmptyState,
  MiniBars,
  Pill,
  ProbabilityBars,
  Spinner,
  StatusIcon,
} from 'demos/ui';
import { useMemo, useRef, useState } from 'react';
import { FiArrowDownRight, FiBell, FiClock, FiMapPin, FiX } from 'react-icons/fi';
import { STREET_LABEL, TYPES } from './data';
import { VERDICTS, WALK_KM, longDate, money, moneyShort, shortDate, signedPct, verdictOf } from './engine';
import styles from './Housesigma.module.css';

/** A drawn house for each home type: the sample market has no photos. */
export function HomeGlyph({ type, seed = 0, size = 'm' }) {
  const hue = seed % 4;
  return (
    <span className={styles.glyph} data-size={size} data-hue={hue} aria-hidden>
      <svg viewBox="0 0 64 48" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
        {type === 'detached' && (
          <>
            <path d="M14 40V22l18-12 18 12v18z" />
            <path d="M28 40V30h8v10M20 26h5v5h-5zM39 26h5v5h-5z" />
          </>
        )}
        {type === 'semi' && (
          <>
            <path d="M8 40V24l12-10 12 10 12-10 12 10v16z" />
            <path d="M32 24v16M16 40v-8h6v8M42 40v-8h6v8" />
          </>
        )}
        {type === 'town' && (
          <>
            <path d="M6 40V24l9-8 8.5 8 8.5-8 8.5 8 8.5-8 9 8v16z" />
            <path d="M23.5 24v16M40.5 24v16M12 40v-7h5v7M29.5 40v-7h5v7M47 40v-7h5v7" />
          </>
        )}
        {type === 'condo' && (
          <>
            <path d="M20 40V8h24v32z" />
            <path d="M26 14h4M34 14h4M26 20h4M34 20h4M26 26h4M34 26h4M29 40v-7h6v7" />
          </>
        )}
        <path d="M3 40h58" />
      </svg>
    </span>
  );
}

const seedOf = home => Number(home.id.replace(/\D/g, '')) || 0;

function valueHint(value) {
  if (!value?.estimate) return null;
  const pct = Math.abs(value.gap * 100).toFixed(1);
  if (value.rule === 'underpriced') return { tone: 'ok', text: `${pct}% under estimate` };
  if (value.rule === 'overpriced') return { tone: 'warn', text: `${pct}% over estimate` };
  return { tone: 'neutral', text: 'In the estimate range' };
}

export function HomeFacts({ home }) {
  return (
    <span className={styles.facts}>
      <span>
        <b>{home.beds}</b> bed
      </span>
      <span>
        <b>{home.baths}</b> bath
      </span>
      <span>
        <b>{home.sqft.toLocaleString('en-US')}</b> sq ft
      </span>
      <span>{TYPES[home.type].short}</span>
    </span>
  );
}

function HomeTags({ home }) {
  return (
    <span className={styles.tags}>
      {home.goKm <= WALK_KM && (
        <span className={styles.tagItem}>
          <FiMapPin aria-hidden /> {home.goKm} km to {home.station}
        </span>
      )}
      {home.street === 'quiet' && <span className={styles.tagItem}>{STREET_LABEL.quiet}</span>}
      {home.offerDate && (
        <span className={styles.tagItem} data-tone="warn">
          <FiClock aria-hidden /> Offers {shortDate(home.offerDate)}
        </span>
      )}
      {home.drop && (
        <span className={styles.tagItem} data-tone="ok">
          <FiArrowDownRight aria-hidden /> Price cut
        </span>
      )}
    </span>
  );
}

/** One result: tap to open the price check. */
export function ListingCard({ home, value, selected, onSelect }) {
  const hint = valueHint(value);
  return (
    <button
      type="button"
      className={styles.listing}
      data-selected={selected || undefined}
      data-listing={home.id}
      aria-pressed={selected}
      onClick={() => onSelect(home.id)}
    >
      <HomeGlyph type={home.type} seed={seedOf(home)} />
      <span className={styles.listingBody}>
        <span className={styles.listingTop}>
          <span className={styles.price}>{money(home.listPrice)}</span>
          {hint && <Pill tone={hint.tone}>{hint.text}</Pill>}
        </span>
        <span className={styles.address}>
          {home.address} <span>· {home.area}, {home.city}</span>
        </span>
        <HomeFacts home={home} />
        <HomeTags home={home} />
      </span>
      <span className={styles.listingDom}>{home.dom === 0 ? 'New today' : `${home.dom} d`}</span>
    </button>
  );
}

// --- Price vs size chart --------------------------------------------------------------------

function niceTicks(min, max, count) {
  const raw = (max - min) / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(mult => mult * power).find(candidate => candidate >= raw) || raw;
  const ticks = [];
  for (let tick = Math.ceil(min / step) * step; tick <= max + 1e-6; tick += step) ticks.push(tick);
  return ticks;
}

/**
 * Asking price against size: the matches (accent) over homes that sold nearby in the last six
 * months (grey). A match below the grey cloud is asking less than similar homes sold for.
 */
export function PriceSizeChart({ results, sold, selectedId, onSelect }) {
  const [hover, setHover] = useState(null);
  const wrap = useRef(null);
  const W = 560;
  const H = 330;
  const pad = { l: 54, r: 14, t: 14, b: 34 };

  const model = useMemo(() => {
    const all = [...results.map(home => [home.sqft, home.listPrice]), ...sold.map(home => [home.sqft, home.soldPrice])];
    if (!all.length) return null;
    const xs = all.map(point => point[0]);
    const ys = all.map(point => point[1]);
    const xMin = Math.min(...xs) * 0.96;
    const xMax = Math.max(...xs) * 1.03;
    const yMin = Math.min(...ys) * 0.94;
    const yMax = Math.max(...ys) * 1.05;
    const x = value => pad.l + ((value - xMin) / (xMax - xMin)) * (W - pad.l - pad.r);
    const y = value => H - pad.b - ((value - yMin) / (yMax - yMin)) * (H - pad.t - pad.b);
    return {
      x,
      y,
      xTicks: niceTicks(xMin, xMax, 4),
      yTicks: niceTicks(yMin, yMax, 4),
      points: [
        ...sold.map(home => ({ home, kind: 'sold', px: x(home.sqft), py: y(home.soldPrice) })),
        ...results.map(home => ({ home, kind: 'match', px: x(home.sqft), py: y(home.listPrice) })),
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, sold]);

  if (!model) return <EmptyState size="s">Nothing to plot yet.</EmptyState>;

  function nearest(event) {
    const box = wrap.current.getBoundingClientRect();
    const mx = ((event.clientX - box.left) / box.width) * W;
    const my = ((event.clientY - box.top) / box.height) * H;
    let best = null;
    model.points.forEach(point => {
      const distance = Math.hypot(point.px - mx, point.py - my) - (point.kind === 'match' ? 6 : 0);
      if (distance < 16 && (!best || distance < best.distance)) best = { ...point, distance };
    });
    return best;
  }

  const selected = model.points.find(point => point.kind === 'match' && point.home.id === selectedId);
  return (
    <div className={styles.chart}>
      <div
        ref={wrap}
        className={styles.chartPlot}
        onMouseMove={event => setHover(nearest(event))}
        onMouseLeave={() => setHover(null)}
        onClick={event => {
          const point = nearest(event);
          if (point?.kind === 'match') onSelect(point.home.id);
        }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Asking price against size for the matching homes, over homes sold nearby in the last six months">
          {model.yTicks.map(tick => (
            <g key={tick}>
              <line className={styles.gridLine} x1={pad.l} x2={W - pad.r} y1={model.y(tick)} y2={model.y(tick)} />
              <text className={styles.axisText} x={pad.l - 8} y={model.y(tick) + 4} textAnchor="end">
                {moneyShort(tick)}
              </text>
            </g>
          ))}
          {model.xTicks.map(tick => (
            <text key={tick} className={styles.axisText} x={model.x(tick)} y={H - 12} textAnchor="middle">
              {tick.toLocaleString('en-US')}
            </text>
          ))}
          <text className={styles.axisText} x={W - pad.r} y={H - 12} textAnchor="end">
            sq ft
          </text>
          {model.points
            .filter(point => point.kind === 'sold')
            .map(point => (
              <circle key={point.home.id} className={styles.soldDot} cx={point.px} cy={point.py} r={3.2} />
            ))}
          {model.points
            .filter(point => point.kind === 'match')
            .map(point => (
              <circle
                key={point.home.id}
                className={styles.matchDot}
                data-selected={point.home.id === selectedId || undefined}
                cx={point.px}
                cy={point.py}
                r={point.home.id === selectedId ? 7.5 : 5.5}
              />
            ))}
          {selected && <circle className={styles.selectedRing} cx={selected.px} cy={selected.py} r={13} />}
        </svg>
        {hover && (
          <div
            className={styles.tip}
            style={{ left: `${(hover.px / W) * 100}%`, top: `${(hover.py / H) * 100}%` }}
            data-flip={hover.px > W * 0.6 || undefined}
          >
            <b>{money(hover.kind === 'match' ? hover.home.listPrice : hover.home.soldPrice)}</b>
            <span>
              {hover.kind === 'match' ? 'Asking' : `Sold ${shortDate(hover.home.soldDate)}`} · {hover.home.sqft.toLocaleString('en-US')} sq ft · {hover.home.beds} bed
            </span>
            <span>{hover.home.address}</span>
          </div>
        )}
      </div>
      <div className={styles.legend}>
        <span>
          <i data-kind="match" /> Matches, asking price
        </span>
        <span>
          <i data-kind="sold" /> Sold nearby, last 6 months
        </span>
      </div>
    </div>
  );
}

// --- Fair price ---------------------------------------------------------------------------------

/** The estimate range as a band, with the comps as ticks and the asking price as a pin. */
export function RangeBar({ home, value }) {
  const { estimate, comps } = value;
  const values = [estimate.low, estimate.high, home.listPrice, ...comps.map(comp => comp.adjusted)];
  const span = Math.max(...values) - Math.min(...values);
  const min = Math.min(...values) - span * 0.08;
  const max = Math.max(...values) + span * 0.08;
  const at = amount => `${((amount - min) / (max - min)) * 100}%`;
  const listSide = (home.listPrice - min) / (max - min) > 0.6 ? 'end' : 'start';
  return (
    <div className={styles.range} data-track="range">
      <div className={styles.rangePin} style={{ left: at(home.listPrice) }} data-side={listSide}>
        <span>
          Asking <b>{money(home.listPrice)}</b>
        </span>
      </div>
      <div className={styles.rangeTrack}>
        <span className={styles.rangeBand} style={{ left: at(estimate.low), right: `calc(100% - ${at(estimate.high)})` }} />
        <span className={styles.rangeMid} style={{ left: at(estimate.mid) }} />
        {comps.map(comp => (
          <span key={comp.id} className={styles.rangeComp} style={{ left: at(comp.adjusted) }} title={`${comp.address}: ${money(comp.adjusted)} adjusted`} />
        ))}
        <span className={styles.rangeList} style={{ left: at(home.listPrice) }} />
      </div>
      <div className={styles.rangeScale}>
        <span style={{ left: at(estimate.low) }}>{moneyShort(estimate.low)}</span>
        <span style={{ left: at(estimate.high) }}>{moneyShort(estimate.high)}</span>
      </div>
      <p className={styles.rangeNote}>
        Estimate <b>{money(estimate.low)}</b> to <b>{money(estimate.high)}</b> from {comps.length} comparable sales (ticks), {estimate.confidence} confidence
      </p>
    </div>
  );
}

const OPTIONS = VERDICTS.map(({ value, label, tone }) => ({ value, label, tone }));

/** Traced-figures line under a model's text: every number must come from the facts. */
export function TraceLine({ check, noun = 'the comps' }) {
  if (!check || !check.total) return null;
  const clean = check.missing.length === 0;
  return (
    <p className={styles.trace} data-clean={clean || undefined}>
      <StatusIcon status={clean ? 'pass' : 'warn'} />
      {clean
        ? `${check.total} figures in this text, all traced to ${noun}`
        : `${check.traced} of ${check.total} figures traced to ${noun}; not found: ${check.missing.join(', ')}`}
    </p>
  );
}

export function VerdictPanel({ home, value, fair, hasKey, onCheck, check }) {
  const status = fair?.status || 'idle';
  const verdict = fair?.verdict;
  const chosen = verdict ? verdictOf(verdict.choice) : null;
  const ruleOnly = status === 'rule';
  const rule = verdictOf(value.rule);
  const closeCall = verdict && (verdict.choice !== value.rule || (verdict.probabilities?.[verdict.choice] ?? 1) < 0.65);

  return (
    <div className={styles.verdict} data-track="verdict">
      <RangeBar home={home} value={value} />

      {status === 'idle' && (
        <div className={styles.verdictAsk}>
          <Button onClick={onCheck} data-action="check-price">
            Is this a fair price?
          </Button>
          <span className={styles.muted}>
            {hasKey ? 'A fast decision model weighs the asking price against the comps.' : 'Preview: shows the range check; the model verdict needs the private link.'}
          </span>
        </div>
      )}

      {status !== 'idle' && (
        <div className={styles.verdictBody} aria-live="polite">
          <div className={styles.verdictHead}>
            {status === 'loading' && !verdict ? (
              <span className={styles.verdictWait}>
                <Spinner /> Weighing the asking price against {value.comps.length} sold homes
              </span>
            ) : (
              <>
                <DecisionBadge tone={(ruleOnly ? rule : chosen).tone === 'accent' ? undefined : (ruleOnly ? rule : chosen).tone} size="l">
                  {(ruleOnly ? rule : chosen).label}
                </DecisionBadge>
                <span className={styles.verdictPlain}>
                  {(ruleOnly ? rule : chosen).plain}
                  {closeCall && !ruleOnly && <em> · close call</em>}
                </span>
                {fair.kind === 'example' && <Pill className={styles.runPill}>Example run</Pill>}
                {fair.kind === 'live' && <Pill tone="live" className={styles.runPill}>{fair.cached ? 'Live · cached' : 'Live'}</Pill>}
              </>
            )}
          </div>
          <ProbabilityBars
            className={styles.verdictBars}
            options={OPTIONS}
            probabilities={verdict?.probabilities}
            choice={verdict?.choice}
            pending={!verdict}
          />
          <p className={styles.verdictMeta}>
            {ruleOnly
              ? 'Range check in code only. The model verdict with probabilities needs the private link.'
              : verdict
              ? `Fast decision model${verdict.ms ? ` · ${verdict.ms} ms` : ''} · range check in code says ${rule.label.toLowerCase()}`
              : 'Fast decision model'}
          </p>
          {!ruleOnly && (
            <div className={styles.explain} data-track="explain">
              {fair?.text ? (
                <p>
                  {fair.text}
                  {status === 'loading' && <Caret variant="soft" />}
                </p>
              ) : status === 'error' ? null : (
                <p className={styles.explainWait}>
                  <span />
                  <span />
                </p>
              )}
              {status === 'done' && <TraceLine check={check} />}
            </div>
          )}
          {status === 'error' && (
            <p className={styles.error} role="alert">
              {fair.error}{' '}
              <button type="button" className={styles.linkButton} onClick={onCheck}>
                Try again
              </button>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function CompsList({ value }) {
  return (
    <ol className={styles.comps} data-track="comps">
      {value.comps.map(comp => (
        <li key={comp.id}>
          <span className={styles.compMain}>
            <b>{comp.address}</b>
            <span>
              {comp.beds} bed · {comp.sqft.toLocaleString('en-US')} sq ft · sold {shortDate(comp.soldDate)}
            </span>
          </span>
          <span className={styles.compPrice}>
            <b>{money(comp.soldPrice)}</b>
            <span>{money(comp.adjusted)} adjusted</span>
          </span>
          <span className={styles.compMatch} title="How alike: size, bedrooms, sale date, distance to the station, street">
            <i style={{ width: `${Math.round(comp.similarity * 100)}%` }} />
            <em>{Math.round(comp.similarity * 100)}% alike</em>
          </span>
        </li>
      ))}
    </ol>
  );
}

// --- Offer-night brief ------------------------------------------------------------------------------

export function OfferRange({ home, brief }) {
  const stanceText = {
    competitive: 'Competitive: bids cluster near the middle of the estimate',
    negotiate: 'Room to negotiate: start under the estimate',
    balanced: 'Balanced: the estimate is the anchor',
  }[brief.stance];
  return (
    <div className={styles.offer} data-track="offer">
      <div className={styles.offerTop}>
        <span className={styles.offerLabel}>Suggested offer range</span>
        <Pill tone="warn">Sample data · not advice</Pill>
      </div>
      <p className={styles.offerRange}>
        {money(brief.range.low)} <span>to</span> {money(brief.range.high)}
      </p>
      <p className={styles.offerStance}>
        {stanceText} · asking {money(home.listPrice)}
      </p>
      <ul className={styles.reasons}>
        {brief.reasons.map(reason => (
          <li key={reason.text} data-tone={reason.tone}>
            {reason.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AreaTrend({ area }) {
  const months = area.months.filter(month => month.count > 0);
  return (
    <div className={styles.trend}>
      <MiniBars
        height={84}
        active={months.length - 1}
        label="Median days on market by 30-day period, oldest first"
        data={months.map((month, index) => ({
          label: index === months.length - 1 ? 'Now' : `${(months.length - 1 - index) * 30}d`,
          value: month.dom,
          display: `${Math.round(month.dom)} d`,
        }))}
      />
      <p className={styles.muted}>Median days on market, by 30-day period (oldest to newest)</p>
    </div>
  );
}

export function HomeHistory({ home }) {
  const rows = [...home.history].reverse();
  return (
    <ol className={styles.history}>
      {rows.map((row, index) => (
        <li key={`${row.date}${row.event}`} data-now={index === 0 || undefined}>
          <span>{longDate(row.date)}</span>
          <b>{row.event}</b>
          <em>{money(row.price)}</em>
        </li>
      ))}
    </ol>
  );
}

// --- Weekly pulse ----------------------------------------------------------------------------------------

export function PulseText({ text, streaming }) {
  const lines = String(text || '').split('\n').map(line => line.trim()).filter(Boolean);
  const bullets = lines.filter(line => /^[-•]/.test(line)).map(line => line.replace(/^[-•]\s*/, ''));
  const rest = lines.filter(line => !/^[-•]/.test(line));
  const takeaway = rest.find(line => /^takeaway/i.test(line));
  const other = rest.filter(line => line !== takeaway);
  return (
    <div className={styles.pulseText}>
      {other.map(line => (
        <p key={line}>{line}</p>
      ))}
      {bullets.length > 0 && (
        <ul>
          {bullets.map((line, index) => (
            <li key={line}>
              {line}
              {streaming && !takeaway && index === bullets.length - 1 && <Caret variant="soft" />}
            </li>
          ))}
        </ul>
      )}
      {takeaway && (
        <p className={styles.takeaway}>
          <b>Takeaway</b>
          {takeaway.replace(/^takeaway:?\s*/i, '')}
          {streaming && <Caret variant="soft" />}
        </p>
      )}
    </div>
  );
}

export function MiniHome({ home, note, onSelect }) {
  return (
    <button type="button" className={styles.miniHome} onClick={() => onSelect(home.id)}>
      <HomeGlyph type={home.type} seed={seedOf(home)} size="s" />
      <span>
        <b>{money(home.listPrice)}</b>
        <em>{home.address}</em>
      </span>
      {note && <span className={styles.miniNote}>{note}</span>}
    </button>
  );
}

export function FilterChip({ label, count, onRemove }) {
  return (
    <span className={styles.filterChip}>
      {label}
      {count != null && <i>{count}</i>}
      <button type="button" aria-label={`Remove filter: ${label}`} onClick={onRemove}>
        <FiX aria-hidden />
      </button>
    </span>
  );
}

export function SavedBadge({ children }) {
  return (
    <span className={styles.saved}>
      <FiBell aria-hidden /> {children}
    </span>
  );
}

export { signedPct };

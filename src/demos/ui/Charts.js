import { useId } from 'react';
import { classes } from 'utils/style';
import styles from './Charts.module.css';

const clamp01 = value => Math.min(1, Math.max(0, Number(value) || 0));

/**
 * Circular progress with something in the middle (a percent, a count).
 * value: 0..1; tone: 'accent' (default) | 'ok' | 'warn' | 'bad' | 'ink'.
 * size and stroke are in px. label is read out by screen readers.
 */
export function Ring({
  value,
  tone = 'accent',
  size = 56,
  stroke = 6,
  label,
  className,
  children,
}) {
  const radius = (size - stroke) / 2;
  const length = 2 * Math.PI * radius;
  const shown = clamp01(value);
  return (
    <span
      className={classes(styles.ring, className)}
      data-tone={tone}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          className={styles.ringTrack}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
        />
        {/* At zero the round cap would still draw a dot, so the arc is left out */}
        {shown > 0 && (
          <circle
            className={styles.ringValue}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={stroke}
            strokeDasharray={`${shown * length} ${length}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
      {children != null && <span className={styles.ringLabel}>{children}</span>}
    </span>
  );
}

/**
 * Half-dial made of ticks: how far along a 0..1 scale a score sits.
 * value: 0..1; ticks: how many (default 23); tone as Ring. `children` is the big number
 * in the middle, `caption` the line under it.
 */
export function Gauge({
  value,
  ticks = 23,
  tone = 'accent',
  caption,
  label,
  className,
  children,
}) {
  const shown = clamp01(value);
  const lit = Math.round(shown * ticks);
  return (
    <div
      className={classes(styles.gauge, className)}
      data-tone={tone}
      role="img"
      aria-label={label}
    >
      <svg viewBox="0 0 200 106" aria-hidden>
        {/* Lit ticks brighten towards the value, so the dial reads as a sweep */}
        {Array.from({ length: ticks }, (_, index) => (
          <rect
            key={index}
            className={styles.tick}
            data-lit={index < lit ? '' : undefined}
            style={index < lit ? { opacity: 0.45 + 0.55 * ((index + 1) / lit) } : undefined}
            x={95.5}
            y={6}
            width={9}
            height={30}
            rx={4.5}
            transform={`rotate(${-90 + (index * 180) / (ticks - 1)} 100 100)`}
          />
        ))}
      </svg>
      <div className={styles.gaugeText}>
        <strong>{children}</strong>
        {caption != null && <span>{caption}</span>}
      </div>
    </div>
  );
}

/**
 * Segmented meter: n blocks, the first `value * n` filled.
 * value: 0..1; segments (default 10); tone as Ring; size: 'm' | 's'.
 */
export function Meter({
  value,
  segments = 10,
  tone = 'accent',
  size = 'm',
  label,
  className,
}) {
  const filled = Math.round(clamp01(value) * segments);
  return (
    <span
      className={classes(styles.meter, className)}
      data-tone={tone}
      data-size={size}
      role="img"
      aria-label={label}
    >
      {Array.from({ length: segments }, (_, index) => (
        <i key={index} data-on={index < filled ? '' : undefined} />
      ))}
    </span>
  );
}

/**
 * One bar split into proportional parts, with a legend.
 * parts: [{ label, value, tone, display }]; tone 'accent' | 'ok' | 'warn' | 'bad' | 'ink'
 * | 'muted'. Parts with a value of 0 are left out of the bar but kept in the legend.
 * legend: false hides it; `display` overrides the number shown.
 */
export function SplitBar({ parts, legend = true, label, className }) {
  const total = parts.reduce((sum, part) => sum + (Number(part.value) || 0), 0) || 1;
  return (
    <div className={classes(styles.split, className)}>
      <div className={styles.splitBar} role="img" aria-label={label}>
        {parts
          .filter(part => Number(part.value) > 0)
          .map(part => (
            <span
              key={part.label}
              data-tone={part.tone || 'muted'}
              style={{ flexGrow: part.value / total }}
              title={`${part.label}: ${part.display ?? part.value}`}
            />
          ))}
      </div>
      {legend && (
        <dl className={styles.splitLegend}>
          {parts.map(part => (
            <div key={part.label} data-tone={part.tone || 'muted'}>
              <dd>{part.display ?? part.value}</dd>
              <dt>{part.label}</dt>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/**
 * Small column chart. data: [{ label, value, display }]. The `active` column (index) is
 * filled and carries its value in a bubble; the rest are hatched. max defaults to the
 * largest value. height in px.
 */
export function MiniBars({ data, active, max, height = 120, label, className }) {
  const top = (max ?? Math.max(...data.map(item => Number(item.value) || 0), 0)) || 1;
  return (
    <div
      className={classes(styles.bars, className)}
      style={{ '--uiBarsHeight': `${height}px` }}
      role="img"
      aria-label={label}
    >
      {data.map((item, index) => (
        <div key={item.label} className={styles.bar} data-active={index === active || undefined}>
          <span className={styles.barPlot}>
            <span
              className={styles.barFill}
              style={{ height: `${Math.max(4, (clamp01(item.value / top)) * 100)}%` }}
            >
              <b>{item.display ?? item.value}</b>
            </span>
          </span>
          <span className={styles.barLabel}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Line over a short series, with a soft area under it and a dot on the last point.
 * values: numbers; min / max default to the data range; tone as Ring; height in px.
 * threshold: a value drawn as a dashed line across the plot.
 */
export function Sparkline({
  values,
  min,
  max,
  tone = 'accent',
  height = 56,
  threshold,
  label,
  className,
}) {
  const gradientId = `${useId()}spark`.replace(/:/g, '');
  if (!values?.length) return null; // nothing to plot; the caller shows its own empty state
  const width = 240;
  const pad = 5;
  const low = min ?? Math.min(...values);
  const high = max ?? Math.max(...values);
  const span = high - low || 1;
  const x = index =>
    values.length > 1 ? pad + (index * (width - 2 * pad)) / (values.length - 1) : width / 2;
  const y = value => height - pad - ((value - low) / span) * (height - 2 * pad);
  const points = values.map((value, index) => [x(index), y(value)]);
  const line = points.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');
  const last = points[points.length - 1];

  return (
    <svg
      className={classes(styles.spark, className)}
      data-tone={tone}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ height }}
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className={styles.sparkStop} stopOpacity="0.32" />
          <stop offset="1" className={styles.sparkStop} stopOpacity="0" />
        </linearGradient>
      </defs>
      {threshold != null && (
        <line
          className={styles.sparkThreshold}
          x1={pad}
          x2={width - pad}
          y1={y(threshold)}
          y2={y(threshold)}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {points.length > 1 && (
        <>
          <path
            d={`${line} L${last[0].toFixed(1)} ${height} L${points[0][0].toFixed(1)} ${height} Z`}
            fill={`url(#${gradientId})`}
          />
          <path className={styles.sparkLine} d={line} vectorEffect="non-scaling-stroke" />
        </>
      )}
      {/* Zero-length round-capped strokes: dots that stay round when the plot stretches */}
      {last && (
        <>
          <path
            className={styles.sparkHalo}
            d={`M${last[0].toFixed(1)} ${last[1].toFixed(1)}h0.01`}
            vectorEffect="non-scaling-stroke"
          />
          <path
            className={styles.sparkDot}
            d={`M${last[0].toFixed(1)} ${last[1].toFixed(1)}h0.01`}
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}
    </svg>
  );
}

import { classes } from 'utils/style';
import styles from './Schedule.module.css';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function hourLabel(hour) {
  const h = hour % 24;
  if (h === 0) return '12a';
  if (h === 12) return '12p';
  return h < 12 ? `${h}a` : `${h - 12}p`;
}

/**
 * A few days of a calendar as columns with blocks placed by time: an interview loop, a shift plan.
 * days: [{ id, label, sub }]; from, to: the hours shown (9, 18);
 * blocks: [{ id, day, start, end (minutes after midnight), title, sub, meta, tone, state, title attr via `hint` }];
 *   tone: 'accent' (default) | 'ok' | 'warn' | 'bad' | 'muted';
 *   state: 'changed' (pops in with a ring) | 'held' (dashed, tentative) | 'removed' (hatched ghost) | 'dropped' (struck through).
 * windows: [{ day, start, end }] shaded as available; tz: label over the time gutter ("EST");
 * legend: [{ state, label }] keys shown under the grid. --uiStripHour (default 44px) and
 *   --uiStripGutter (34px, 26px on phones) can be set on any parent.
 */
export function ScheduleStrip({
  days,
  from = 9,
  to = 18,
  blocks = [],
  windows = [],
  tz,
  legend,
  label,
  className,
}) {
  const span = (to - from) * 60;
  const place = item => {
    const top = clamp((item.start - from * 60) / span, 0, 1);
    const bottom = clamp((item.end - from * 60) / span, 0, 1);
    return { top: `${top * 100}%`, height: `${Math.max(0, bottom - top) * 100}%` };
  };
  const hours = Array.from({ length: to - from + 1 }, (_, index) => from + index);

  return (
    <figure
      className={classes(styles.strip, className)}
      style={{ '--uiStripDays': days.length, '--uiStripHours': to - from }}
      aria-label={label}
    >
      <div className={styles.head} aria-hidden>
        <span className={styles.tz}>{tz}</span>
        {days.map(day => (
          <span key={day.id} className={styles.dayHead}>
            <strong>{day.label}</strong>
            {day.sub && <span>{day.sub}</span>}
          </span>
        ))}
      </div>
      <div className={styles.grid}>
        <div className={styles.gutter} aria-hidden>
          {hours.map(hour => (
            <span key={hour} style={{ top: `${((hour - from) / (to - from)) * 100}%` }}>
              {hourLabel(hour)}
            </span>
          ))}
        </div>
        {days.map(day => {
          const dayBlocks = blocks.filter(block => block.day === day.id);
          return (
            <ol
              key={day.id}
              className={styles.day}
              aria-label={`${day.label} ${day.sub || ''}`.trim()}
            >
              {windows
                .filter(window => window.day === day.id)
                .map((window, index) => (
                  <li
                    key={`w${index}`}
                    className={styles.window}
                    style={place(window)}
                    aria-hidden
                  />
                ))}
              {dayBlocks.map(block => (
                <li
                  key={block.id}
                  className={styles.block}
                  data-tone={block.tone || 'accent'}
                  data-state={block.state}
                  data-short={block.end - block.start < 50 || undefined}
                  style={place(block)}
                  title={block.hint}
                >
                  <strong>{block.title}</strong>
                  {block.sub && <span>{block.sub}</span>}
                  {block.meta && <em>{block.meta}</em>}
                </li>
              ))}
            </ol>
          );
        })}
      </div>
      {legend?.length > 0 && (
        <figcaption className={styles.legend}>
          {legend.map(item => (
            <span key={item.state} data-state={item.state}>
              <i aria-hidden />
              {item.label}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  );
}

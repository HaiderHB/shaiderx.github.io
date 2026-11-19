import { classes } from 'utils/style';
import styles from './SheetGrid.module.css';

const letter = index => {
  let out = '';
  let n = index + 1;
  while (n > 0) {
    out = String.fromCharCode(65 + ((n - 1) % 26)) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
};

const filled = value => value != null && String(value) !== '';

/** How many columns a text cell covers: itself plus the empty, non-numeric cells after it. */
function spillSpan(row, index, width, numericSet) {
  if (!filled(row[index]) || numericSet.has(index)) return 1;
  let span = 1;
  while (index + span < width && !filled(row[index + span]) && !numericSet.has(index + span)) span += 1;
  return span;
}

/** The column whose text covers this one (itself when it is not covered). */
function spillFrom(row, index, numericSet) {
  if (filled(row[index]) || numericSet.has(index)) return index;
  let from = index - 1;
  while (from >= 0 && !filled(row[from]) && !numericSet.has(from)) from -= 1;
  return from >= 0 && filled(row[from]) && !numericSet.has(from) ? from : index;
}

/**
 * A spreadsheet excerpt with column letters and row numbers, the way Excel shows a file: for
 * provenance (which cell a value came from), raw exports and before / after views.
 * rows: arrays of cell strings; firstLine: the row number of rows[0] (default 1); lines: explicit
 * row numbers, one per row, for an excerpt that skips (a header, then rows 13-15);
 * activeLine: the row to highlight; cells: { "B14": 'accent' | 'ok' | 'warn' | 'bad' } marks single
 * cells; struck: row numbers shown struck through (dropped rows); numeric: column indexes to
 * right-align; columns: how many columns to draw (default: the widest row); label: aria label.
 * Like Excel, a text cell spills over the empty non-numeric cells to its right (a title line).
 * Scrolls sideways inside its own box on narrow screens; --uiSheetHeight caps the height.
 */
export function SheetGrid({
  rows,
  firstLine = 1,
  lines,
  activeLine,
  cells = {},
  struck = [],
  numeric = [],
  columns,
  label = 'Spreadsheet excerpt',
  className,
}) {
  const width = columns || Math.max(1, ...rows.map(row => row.length));
  const struckSet = new Set(struck);
  const numericSet = new Set(numeric);
  return (
    <div className={classes(styles.sheet, className)} role="region" aria-label={label} tabIndex={0}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.corner} aria-hidden />
            {Array.from({ length: width }, (_, index) => (
              <th key={index} scope="col" className={styles.colHead}>
                {letter(index)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            const line = lines ? lines[rowIndex] : firstLine + rowIndex;
            return (
              <tr
                key={line}
                data-active={line === activeLine || undefined}
                data-struck={struckSet.has(line) || undefined}
              >
                <th scope="row" className={styles.rowHead}>
                  {line}
                </th>
                {Array.from({ length: width }, (_, index) => {
                  const ref = `${letter(index)}${line}`;
                  // Like Excel, text spills over the empty cells to its right
                  if (spillFrom(row, index, numericSet) !== index) return null;
                  const span = spillSpan(row, index, width, numericSet);
                  return (
                    <td
                      key={ref}
                      colSpan={span > 1 ? span : undefined}
                      data-mark={cells[ref] || undefined}
                      data-numeric={numericSet.has(index) || undefined}
                      title={ref}
                    >
                      {row[index] ?? ''}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { classes } from 'utils/style';
import { Button } from './Button';
import styles from './CodeView.module.css';
import { highlightLines } from './highlight';

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

/**
 * Copies `text` and confirms for a moment.
 * variant 'code' (small outlined, for code headers) | 'ghost' (Button ghost).
 */
export function CopyButton({
  text,
  label = 'Copy',
  copiedLabel = 'Copied',
  failedLabel = 'Press Ctrl+C',
  resetMs = 1600,
  variant = 'code',
  className,
}) {
  const [state, setState] = useState('idle');
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    const ok = await copyText(text);
    setState(ok ? 'copied' : 'failed');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), resetMs);
  }

  const shown =
    state === 'copied' ? copiedLabel : state === 'failed' ? failedLabel : label;
  if (variant === 'ghost') {
    return (
      <Button variant="ghost" className={className} onClick={copy}>
        {shown}
      </Button>
    );
  }
  return (
    <button type="button" className={classes(styles.copy, className)} onClick={copy}>
      {shown}
    </button>
  );
}

/** Text with `inline code` spans (backticks), for findings, rules and model output. */
export function RichText({ text }) {
  const parts = String(text).split(/(`[^`]+`)/g);
  return parts.map((part, i) =>
    part.startsWith('`') && part.endsWith('`') && part.length > 1 ? (
      <code key={i} className={styles.inlineCode}>
        {part.slice(1, -1)}
      </code>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}

/** Inline code span with the RichText style. */
export function InlineCode({ className, children }) {
  return <code className={classes(styles.inlineCode, className)}>{children}</code>;
}

/**
 * Highlighted, line-numbered code.
 * lang: 'js' | 'diff' | 'text'. marks: { [lineNumber]: 'fail' | 'warn' | 'pass' }.
 * focusLine: { line, at } scrolls that line into view and flashes it (`at` re-triggers).
 * maxHeight caps the scroll area; --uiCodeHeight on a wrapper fixes its height.
 * wrap: soft-wrap long lines with a hanging indent.
 */
export function CodeView({
  code,
  lang = 'js',
  title,
  copy = true,
  numbers = true,
  marks,
  focusLine,
  maxHeight,
  wrap = false,
  className,
}) {
  const lines = useMemo(() => highlightLines(code, lang), [code, lang]);
  const scroller = useRef(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0, left: 0 }); // new code starts at its first line
  }, [code]);

  useEffect(() => {
    if (!focusLine?.line || !scroller.current) return;
    const row = scroller.current.querySelector(`[data-line="${focusLine.line}"]`);
    if (!row) return;
    const box = scroller.current;
    box.scrollTo({
      top: Math.max(0, row.offsetTop - box.clientHeight / 3),
      behavior: 'smooth',
    });
  }, [focusLine]);

  return (
    <div
      className={classes(
        styles.codeView,
        !numbers && styles.noNumbers,
        wrap && styles.wrap,
        className
      )}
    >
      {(title || copy) && (
        <div className={styles.head}>
          {title && <span className={styles.title}>{title}</span>}
          {copy && <CopyButton text={code} className={styles.headCopy} />}
        </div>
      )}
      <div
        className={styles.scroll}
        ref={scroller}
        style={maxHeight ? { maxHeight } : undefined}
      >
        <pre className={styles.pre}>
          <code>
            {lines.map((pieces, i) => {
              const n = i + 1;
              const flash = focusLine?.line === n;
              return (
                <span
                  key={flash ? `${n}-${focusLine.at}` : n}
                  data-line={n}
                  data-mark={marks?.[n]}
                  className={classes(styles.line, flash && styles.flash)}
                >
                  {numbers && <span className={styles.lineNo}>{n}</span>}
                  <span className={styles.lineText}>
                    {pieces.length
                      ? pieces.map(([text, kind], j) =>
                          kind ? (
                            <span key={j} className={styles[kind]}>
                              {text}
                            </span>
                          ) : (
                            <Fragment key={j}>{text}</Fragment>
                          )
                        )
                      : ' '}
                  </span>
                </span>
              );
            })}
          </code>
        </pre>
      </div>
    </div>
  );
}

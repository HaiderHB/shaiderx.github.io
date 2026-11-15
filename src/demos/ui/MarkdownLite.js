import { Fragment } from 'react';
import { classes } from 'utils/style';
import { CodeView, RichText } from './CodeView';
import styles from './MarkdownLite.module.css';

/** Splits model output into text and fenced code blocks; an unclosed fence runs to the end. */
export function splitFences(text) {
  const blocks = [];
  const fence = /```(\w*)\n?([\s\S]*?)(?:```|$)/g;
  let last = 0;
  let match;
  while ((match = fence.exec(text))) {
    if (match.index > last)
      blocks.push({ type: 'text', body: text.slice(last, match.index) });
    blocks.push({ type: 'code', lang: match[1] || 'js', body: match[2] });
    last = fence.lastIndex;
    if (match[0] === '') break;
  }
  if (last < text.length) blocks.push({ type: 'text', body: text.slice(last) });
  return blocks;
}

const inline = line =>
  line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i}>
        <RichText text={part.slice(2, -2)} />
      </strong>
    ) : (
      <RichText key={i} text={part} />
    )
  );

/**
 * Minimal markdown for streamed model output: paragraphs, `-` bullets, #-headings (bold),
 * `code`, **bold** and fenced blocks (rendered with CodeView; ```diff gets diff colours).
 * Safe to render while streaming. `children` render after the blocks (e.g. a Caret).
 */
export function MarkdownLite({
  text,
  codeTitle = 'Code',
  diffTitle = 'Proposed patch',
  className,
  children,
}) {
  const blocks = splitFences(text || '');
  return (
    <div className={classes(styles.markdown, className)}>
      {blocks.map((block, i) => {
        if (block.type === 'code') {
          const diff = block.lang === 'diff';
          return (
            <CodeView
              key={i}
              code={block.body}
              lang={diff ? 'diff' : 'js'}
              title={diff ? diffTitle : codeTitle}
              numbers={false}
            />
          );
        }
        return block.body
          .split(/\n{2,}/)
          .filter(para => para.trim())
          .map((para, j) => {
            const lines = para.split('\n').filter(line => line.trim());
            if (lines.every(line => /^\s*[-*]\s+/.test(line))) {
              return (
                <ul key={`${i}-${j}`} className={styles.list}>
                  {lines.map((line, k) => (
                    <li key={k}>{inline(line.replace(/^\s*[-*]\s+/, ''))}</li>
                  ))}
                </ul>
              );
            }
            return (
              <p key={`${i}-${j}`} className={styles.para}>
                {lines.map((line, k) => (
                  <Fragment key={k}>
                    {k > 0 && <br />}
                    {/^#{1,4}\s/.test(line) ? (
                      <strong>{inline(line.replace(/^#{1,4}\s+/, ''))}</strong>
                    ) : (
                      inline(line)
                    )}
                  </Fragment>
                ))}
              </p>
            );
          });
      })}
      {children}
    </div>
  );
}

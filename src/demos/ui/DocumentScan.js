import { classes } from 'utils/style';
import styles from './DocumentScan.module.css';

/**
 * A document image (an invoice, receipt or form) on a paper card. While `scanning`, a line sweeps
 * down the page; `done` marks it read (a quiet accent edge). The image keeps its aspect ratio from
 * `width` / `height`; `href` opens it full size (phones cannot read a page at card size).
 * caption: text under the page; children: overlays positioned over the page.
 */
export function DocumentScan({
  src,
  alt,
  width,
  height,
  scanning = false,
  done = false,
  href,
  caption,
  label = 'Open full size',
  className,
  children,
}) {
  const page = (
    <span
      className={styles.paper}
      style={width && height ? { aspectRatio: `${width} / ${height}` } : undefined}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.image} src={src} alt={alt} width={width} height={height} />
      ) : (
        <span className={styles.blank} />
      )}
      {scanning && <span className={styles.beam} aria-hidden />}
      {children}
    </span>
  );
  return (
    <figure
      className={classes(styles.frame, className)}
      data-scanning={scanning || undefined}
      data-done={(done && !scanning) || undefined}
      aria-busy={scanning || undefined}
    >
      {href ? (
        <a className={styles.link} href={href} target="_blank" rel="noreferrer" title={label}>
          {page}
        </a>
      ) : (
        page
      )}
      {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
    </figure>
  );
}

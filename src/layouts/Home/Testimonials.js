import React, { useState } from 'react';
import { TiChevronLeftOutline, TiChevronRightOutline } from 'react-icons/ti';
import styles from './Testimonials.module.css';

const MAX_VISIBILITY = 3;

export const Card = ({ title, content }) => (
  <div className={styles.card}>
    <h2>{title}</h2>
    <p>{content}</p>
  </div>
);

export const Testimonials = ({ children }) => {
  const [active, setActive] = useState(2);
  const count = React.Children.count(children);

  return (
    <div className={styles.wrapper}>
      {' '}
      {/* Wrapper added */}
      <div className={styles.carousel}>
        {active > 0 && (
          <button
            className={`${styles.nav} ${styles.navLeft}`}
            onClick={() => setActive(i => i - 1)}
          >
            <TiChevronLeftOutline />
          </button>
        )}
        {React.Children.map(children, (child, i) => (
          <div
            className={`${styles.cardContainer}`}
            style={{
              '--active': i === active ? 1 : 0,
              '--offset': (active - i) / 3,
              '--direction': Math.sign(active - i),
              '--abs-offset': Math.abs(active - i) / 3,
              'pointer-events': active === i ? 'auto' : 'none',
              opacity: Math.abs(active - i) >= MAX_VISIBILITY ? '0' : '1',
              display: Math.abs(active - i) > MAX_VISIBILITY ? 'none' : 'block',
            }}
          >
            {child}
          </div>
        ))}
        {active < count - 1 && (
          <button
            className={`${styles.nav} ${styles.navRight}`}
            onClick={() => setActive(i => i + 1)}
          >
            <TiChevronRightOutline />
          </button>
        )}
      </div>
    </div>
  );
};

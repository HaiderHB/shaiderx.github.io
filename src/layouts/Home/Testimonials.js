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
  const [active, setActive] = useState(0);
  const count = React.Children.count(children);

  const goToNext = () => {
    setActive(currentActive => (currentActive + 1) % count);
  };

  const goToPrevious = () => {
    setActive(currentActive => (currentActive - 1 + count) % count);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.carousel}>
        <button className={`${styles.nav} ${styles.navLeft}`} onClick={goToPrevious}>
          <TiChevronLeftOutline />
        </button>
        {React.Children.map(children, (child, i) => (
          <div
            className={styles.cardContainer}
            style={{
              '--offset': (active - i) / 3,
              '--direction': Math.sign(active - i),
              '--abs-offset': Math.abs(active - i) / 3,
              'pointer-events': active === i ? 'auto' : 'none',
              opacity: Math.abs(active - i) >= MAX_VISIBILITY ? '0' : '1',
              display: Math.abs(active - i) > MAX_VISIBILITY ? 'none' : 'block',
              backgroundColor: i === active ? 'white' : '#00E5FF', // Neon blue for non-active, white for active
            }}
          >
            {child}
          </div>
        ))}
        <button className={`${styles.nav} ${styles.navRight}`} onClick={goToNext}>
          <TiChevronRightOutline />
        </button>
      </div>
    </div>
  );
};

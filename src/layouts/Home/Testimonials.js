import React, { useState, useEffect, useRef } from 'react';
import { TiChevronLeftOutline, TiChevronRightOutline } from 'react-icons/ti';
import styles from './Testimonials.module.css';
import { FaStar } from 'react-icons/fa'; // FontAwesome star icon
import { Section } from 'components/Section';

const MAX_VISIBILITY = 3;

export const Card = ({ company, name, review, image }) => (
  <div className={styles.card}>
    <img src={image} alt={`${name}'s profile`} className={styles.profileImage} />
    <h3 className={styles.profileName}>{name}</h3>
    <h4 className={styles.companyName}>{company}</h4>
    <div className={styles.starRating}>
      <FaStar />
      <FaStar />
      <FaStar />
      <FaStar />
      <FaStar />
    </div>
    <p className={styles.review}>{review}</p>
  </div>
);

export const Testimonials = ({ children, sectionRef }) => {
  const [active, setActive] = useState(1);
  const count = React.Children.count(children);
  const cardRefs = useRef([]);

  useEffect(() => {
    cardRefs.current.forEach((card, index) => {
      card.style.transform = ''; // Reset transform
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
    });

    const activeCard = cardRefs.current[active];
    if (activeCard) {
      activeCard.addEventListener('mousemove', handleMouseMove);
      activeCard.addEventListener('mouseleave', handleMouseLeave);
    }
  }, [active]);

  const handleMouseMove = e => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left; //x position within the element.
    const y = e.clientY - rect.top; //y position within the element.
    const offsetX = x / rect.width;
    const offsetY = y / rect.height;

    const limits = 15.0;
    const rotateY = offsetX * (limits * 2) - limits;
    const rotateX = offsetY * (limits * 2) - limits;

    card.style.transform = `perspective(1000px) rotateX(${-rotateX}deg) rotateY(${rotateY}deg)`;
  };

  const handleMouseLeave = e => {
    const card = e.currentTarget;
    card.style.transform = '';
  };

  const goToNext = () => {
    setActive(currentActive => (currentActive + 1) % count);
  };

  const goToPrevious = () => {
    setActive(currentActive => (currentActive - 1 + count) % count);
  };

  return (
    <Section
      as="section"
      ref={sectionRef}
      id={'testimonials'}
      aria-labelledby={'testimonials'}
      tabIndex={-1}
    >
      <div className={styles.wrapper}>
        <div className={styles.carousel}>
          <button className={`${styles.nav} ${styles.navLeft}`} onClick={goToPrevious}>
            <TiChevronLeftOutline />
          </button>
          {React.Children.map(children, (child, i) => (
            <div
              ref={el => (cardRefs.current[i] = el)}
              className={`${styles.cardContainer} ${i === active ? styles.active : ''}`}
              style={{
                '--offset': (active - i) / 3,
                '--direction': Math.sign(active - i),
                '--abs-offset': Math.abs(active - i) / 3,
                'pointer-events': active === i ? 'auto' : 'none',
                opacity: Math.abs(active - i) < MAX_VISIBILITY ? '1' : '0',
                display: Math.abs(active - i) < MAX_VISIBILITY ? 'block' : 'none',
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
    </Section>
  );
};

import React, { useEffect } from 'react';
import styles from './Skills.module.css'; // Import the CSS module
import { Section } from 'components/Section';

const Skills = ({ words, sectionRef }) => {
  useEffect(() => {
    document.body.classList.add('card-component-active');
    return () => {
      document.body.classList.remove('card-component-active');
    };
  }, []);

  return (
    <Section
      as="section"
      ref={sectionRef}
      id={'skills'}
      aria-labelledby={'skills'}
      tabIndex={-1}
    >
      <div className={styles.cardsContainer}>
        {words.map((word, index) => (
          <div key={index} className={styles.card}>
            <h2>{word}</h2>
          </div>
        ))}
      </div>
    </Section>
  );
};

export default Skills;

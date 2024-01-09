import React from 'react';
import styles from './MoreProjects.module.css';

const MoreProjects = ({ projects }) => {
  return (
    <div className={styles.container}>
      {projects.map((project, index) => (
        <div className={styles.card} key={index}>
          <h3 className={styles.title}>{project.title}</h3>
          <div className={styles.bar}>
            <div className={styles.emptybar}></div>
            <div className={styles.filledbar}></div>
          </div>
          <div className={styles.details}>{project.details}</div>
        </div>
      ))}
    </div>
  );
};

export default MoreProjects;

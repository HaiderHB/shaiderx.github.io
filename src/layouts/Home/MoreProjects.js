import React from 'react';
import styles from './MoreProjects.module.css';

const projectData = [
  {
    title: 'Append App',
    details:
      'Developed an online student forum promoting connections, community creation, discussions, and friendship growth among students.',
  },
  {
    title: 'Decked.js',
    details:
      'Created a JavaScript library allowing draggable cards with unique properties for webpages, with a custom context menu.',
  },
  {
    title: 'Game Dev Lead',
    details:
      'Led a team of 5 developers in designing a Unity-based mobile game, delegating tasks, organizing meetings, and setting deadlines to ensure project success.',
  },
];

const MoreProjects = () => {
  return (
    <div className={styles.container}>
      {projectData.map((project, index) => (
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

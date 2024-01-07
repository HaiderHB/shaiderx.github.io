import eloquateLg from 'assets/Eloquate-large.png';
import sprTexturePlaceholder from 'assets/spr-lesson-builder-dark-placeholder.jpg';
import eloquateMd from 'assets/Eloquate-med.png';
import { Meta } from 'components/Meta';
import { Intro } from 'layouts/Home/Intro';
import { Profile } from 'layouts/Home/Profile';
import { ProjectSummary } from 'layouts/Home/ProjectSummary';
import { useEffect, useRef, useState } from 'react';
import styles from './Home.module.css';
import Skills from './Skills';

const disciplines = [
  'AI Specialist',
  'Full Stack Dev',
  'App Developer',
  'Game Dev',
  'Student',
];

const skillsArray = [
  'Python',
  'Next.js',
  'React',
  'JavaScript',
  'Vue.js',
  'HTML',
  'CSS',
  'C#',
  'Unity',
  'Git',
  'C',
  'Game Design',
];

export const Home = () => {
  const [visibleSections, setVisibleSections] = useState([]);
  const [scrollIndicatorHidden, setScrollIndicatorHidden] = useState(false);
  const intro = useRef();
  const projectOne = useRef();
  // const projectTwo = useRef();
  // const projectThree = useRef();
  const details = useRef();
  const skills = useRef();

  useEffect(() => {
    const sections = [intro, details, projectOne, skills];

    const sectionObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const section = entry.target;
            observer.unobserve(section);
            if (visibleSections.includes(section)) return;
            setVisibleSections(prevSections => [...prevSections, section]);
          }
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.1 }
    );

    const indicatorObserver = new IntersectionObserver(
      ([entry]) => {
        setScrollIndicatorHidden(!entry.isIntersecting);
      },
      { rootMargin: '-100% 0px 0px 0px' }
    );

    sections.forEach(section => {
      sectionObserver.observe(section.current);
    });

    indicatorObserver.observe(intro.current);

    return () => {
      sectionObserver.disconnect();
      indicatorObserver.disconnect();
    };
  }, [visibleSections]);

  return (
    <div className={styles.home}>
      <Meta
        title="Developer"
        description="Developer portfolio of Haider Bokhari — a fullstack developer working on web & mobile
          apps with a focus on AI."
      />
      <Intro
        id="intro"
        sectionRef={intro}
        disciplines={disciplines}
        scrollIndicatorHidden={scrollIndicatorHidden}
      />
      <Profile
        sectionRef={details}
        visible={visibleSections.includes(details.current)}
        id="details"
      />
      <ProjectSummary
        id="project-1"
        sectionRef={projectOne}
        visible={visibleSections.includes(projectOne.current)}
        index={1}
        title="Designing the future of franchise training"
        description="Designing a platform to redefine franchise training with the power of AI"
        buttonText="View project"
        buttonLink="https://www.eloquate.net"
        model={{
          type: 'laptop',
          alt: 'Eloquate',
          textures: [
            {
              srcSet: [eloquateMd, eloquateLg],
              placeholder: sprTexturePlaceholder,
            },
          ],
        }}
      />
      <Skills sectionRef={skills} words={skillsArray} />
      {/* <ProjectSummary
        id="project-2"
        alternate
        sectionRef={projectTwo}
        visible={visibleSections.includes(projectTwo.current)}
        index={2}
        title="Video game progress tracking"
        description="Design and development for a video game tracking app built in React Native"
        buttonText="View website"
        buttonLink="https://gamestack.hamishw.com"
        model={{
          type: 'phone',
          alt: 'App login screen',
          textures: [
            {
              srcSet: [gamestackTexture, gamestackTextureLarge],
              placeholder: gamestackTexturePlaceholder,
            },
            {
              srcSet: [gamestackTexture2, gamestackTexture2Large],
              placeholder: gamestackTexture2Placeholder,
            },
          ],
        }}
      /> */}
    </div>
  );
};

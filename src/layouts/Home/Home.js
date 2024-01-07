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

import grx1Large from 'assets/grx1Large.png';
import grx1 from 'assets/grx1.png';
import grx2Large from 'assets/grx2Large.png';
import grx2 from 'assets/grx2.png';
import gamestackTexture2Placeholder from 'assets/gamestack-list-placeholder.jpg';
import gamestackTexturePlaceholder from 'assets/gamestack-login-placeholder.jpg';
import Experience from './Experience';

//Credit to hamishw - HAMISH WILLIAMS

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
  'Supabase',
  'HTML',
  'CSS',
  'C#',
  'Unity',
  'Git',
  'C',
];

export const Home = () => {
  const [visibleSections, setVisibleSections] = useState([]);
  const [scrollIndicatorHidden, setScrollIndicatorHidden] = useState(false);
  const intro = useRef();
  const projectOne = useRef();
  const projectTwo = useRef();
  const experience = useRef();
  const details = useRef();
  const skills = useRef();

  useEffect(() => {
    const sections = [intro, details, experience, projectOne, projectTwo, skills];

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
      <Experience sectionRef={experience} />
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
      <ProjectSummary
        id="project-2"
        alternate
        sectionRef={projectTwo}
        visible={visibleSections.includes(projectTwo.current)}
        index={2}
        title="Video game progress tracking"
        description="Design and development for a video game tracking app built in React Native"
        buttonText="View Trailer"
        buttonLink="https://www.youtube.com/watch?v=7UOMfTYkKoQ"
        model={{
          type: 'phoneh',
          alt: 'App login screen',
          textures: [
            {
              srcSet: [grx1, grx1Large],
              placeholder: gamestackTexturePlaceholder,
            },
            {
              srcSet: [grx2, grx1Large],
              placeholder: gamestackTexture2Placeholder,
            },
          ],
        }}
      />
      <Skills sectionRef={skills} words={skillsArray} />
    </div>
  );
};

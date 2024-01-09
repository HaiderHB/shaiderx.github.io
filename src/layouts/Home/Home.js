import eloquateLg from 'assets/Eloquate-large.png';
import eloquateMd from 'assets/Eloquate-med.png';
import { Meta } from 'components/Meta';
import { Intro } from 'layouts/Home/Intro';
import { Profile } from 'layouts/Home/Profile';
import { ProjectSummary } from 'layouts/Home/ProjectSummary';
import { useEffect, useRef, useState } from 'react';
import styles from './Home.module.css';
import Skills from './Skills';
import MoreProjects from './MoreProjects';
import { Testimonials, Card } from './Testimonials'; // Adjust the path based on your project structure
import grx1Large from '../../assets/grx1Large.png';
import grx1 from '../../assets/grx1.png';
import grx2 from '../../assets/grx2.png';
import gamestackTexture2Placeholder from '../../assets/gamestack-list-placeholder.jpg';
import gamestackTexturePlaceholder from '../../assets/gamestack-login-placeholder.jpg';
import Experience from './Experience';

import CustomMouseTrail from './Mouse';
import {
  disciplines,
  skillsArray,
  testimonialData,
  projects,
  experiences,
} from './AllInfo';

//Credit to hamishw - HAMISH WILLIAMS

export const Home = () => {
  const [visibleSections, setVisibleSections] = useState([]);
  const [scrollIndicatorHidden, setScrollIndicatorHidden] = useState(false);
  const intro = useRef();
  const projectOne = useRef();
  const projectTwo = useRef();
  const experience = useRef();
  const details = useRef();
  const testimonials = useRef();
  const skills = useRef();

  useEffect(() => {
    const sections = [
      intro,
      details,
      experience,
      projectOne,
      projectTwo,
      testimonials,
      skills,
    ];

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
      <CustomMouseTrail />
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
      <Experience sectionRef={experience} experiences={experiences} />
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
              placeholder: eloquateMd,
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
        title="Galaxy Royale - Puzzle Strategy Game"
        description="Fully self taught and self made mobile game. Recognized by Google for high potential and uniqueness."
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
      <MoreProjects projects={projects} />
      <Testimonials sectionRef={testimonials}>
        {testimonialData.map((testimonial, i) => (
          <Card
            key={i}
            name={testimonial.name}
            company={testimonial.company}
            review={testimonial.review}
            image={testimonial.image}
          />
        ))}
      </Testimonials>

      <Skills sectionRef={skills} words={skillsArray} />
    </div>
  );
};

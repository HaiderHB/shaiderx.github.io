import React, { Component } from 'react';
import {
  VerticalTimeline,
  VerticalTimelineElement,
} from 'react-vertical-timeline-component';
import 'react-vertical-timeline-component/style.min.css';
import { Section } from 'components/Section';

class Experience extends Component {
  render() {
    const { experiences, sectionRef } = this.props;

    const work = experiences.map((work, i) => {
      const mainTech = work.mainTech.map((technology, i) => {
        return (
          <span key={i} style={{ marginRight: '10px', color: 'black' }}>
            {technology}
          </span>
        );
      });

      const icon = work.logo ? (
        <div
          style={{
            display: 'flex', // Enable flexbox
            justifyContent: 'center', // Center horizontally
            alignItems: 'center', // Center vertically
            height: '100%', // Take full height of the container
            width: '100%', // Take full width of the container
          }}
        >
          <img
            src={work.logo.src}
            alt={`${work.company} logo`}
            style={{
              maxWidth: '80%', // Limiting the maximum width
              maxHeight: '80%', // Limiting the maximum height
              objectFit: 'contain', // Ensures that the entire image is visible and maintains its aspect ratio
            }}
          />
        </div>
      ) : (
        <i className="fab fa-angular experience-icon"></i>
      );

      return (
        <VerticalTimelineElement
          className="vertical-timeline-element--work"
          date={work.years}
          iconStyle={{ background: '#00E5FF', color: '#fff', textAlign: 'center' }}
          icon={icon}
          key={i}
        >
          <div style={{ textAlign: 'left', marginBottom: '4px', color: 'black' }}>
            {mainTech}
          </div>
          <h3
            className="vertical-timeline-element-title"
            style={{ textAlign: 'left', color: 'black' }}
          >
            {work.title}
          </h3>
          <h4
            className="vertical-timeline-element-subtitle"
            style={{ textAlign: 'left', color: 'black' }}
          >
            {work.company}
          </h4>
          <div style={{ textAlign: 'left', marginTop: '15px', color: 'black' }}>
            {work.description}
          </div>
        </VerticalTimelineElement>
      );
    });

    return (
      <Section
        as="section"
        ref={sectionRef}
        id={'experience'}
        aria-labelledby={'experience'}
        tabIndex={-1}
      >
        <section id="resume" className="pb-5">
          <div className="col-md-8 mx-auto">
            <VerticalTimeline>{work}</VerticalTimeline>
          </div>
        </section>
      </Section>
    );
  }
}

export default Experience;

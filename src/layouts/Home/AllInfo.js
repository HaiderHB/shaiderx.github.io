import tinyhorse from '../../assets/logos/tinyhorse.jpg';
import phc from '../../assets/logos/phc.png';
import immican from '../../assets/logos/immican.png';
import ecomtent from '../../assets/logos/ecomtent.png';
import omnia from '../../assets/logos/omnia.png';
import wali from '../../assets/logos/wali.png';
import zenith from '../../assets/logos/zenith.png';
import pashmotors from '../../assets/logos/pashmotors.png';
import selfjustice from '../../assets/logos/selfjustice.jpg';
import simulence from '../../assets/logos/simulence.jpg';


// For profile pic change src/assets/profile.png and /profile-large.png 

export const resumeURL =
  'https://drive.google.com/file/d/1xTPM2psIVVVr-n2NeNelN9-5OmTmMHlH/view';


export const profileText = {
  greeting: "Hi there",
  description: `I’m Haider, a startup enthusiast, Full-Stack developer, and AI Specialist.
  Driven by a passion for artificial intelligence, SaaS, and startups. Drawn towards innovation
  and challenging conventional approaches to discover new and creative ways to solve problems using software.
  Extensive experience working with AI and LLMs, including building AI agents and designing complex workflows 
  to automate challenging business tasks. Also proficient in multiple programming languages, with additional 
  experience in mobile and game development. Holding an AI Specialist degree from the University of Toronto.`,
  extra: `Committed to continuous growth to become the best version of myself. 
  Actively seeking challenges and growth opportunities to help me learn and improve. 
  Extracurricular hobbies include boxing, reading, weightlifting, and gaming.`,
};

export const disciplines = [
  'AI Specialist',
  'Full Stack Dev',
  'Startup Enthusiast',
  'App Developer',
  'Game Dev',
];

export const experiences = [
  {
    title: 'Fullstack AI Developer',
    company: 'Topline Pro (YC W21)',
    years: 'Oct 2024 - Current',
    mainTech: ['Python', 'Django', "LLMs", 'Prompt Engineering', "React", "Next.js"],
    description:
      'Developing full stack solutions with heavy AI integrations for YC backed startup. Won hackathon by building AI agent to automate invoice creation.',
    logo: tinyhorse,
  },
  {
    title: 'AI Developer',
    company: 'WorkReducer.com',
    years: 'Apr 2024 - Jul 2024 (Contract)',
    mainTech: ['Python', 'Flask', "AWS", "LLMs", 'Prompt Engineering', "React", "Next.js"],
    description:
      'Developed AI automations and features for an agency serving various clients, prioritizing speed and efficiency. Utilized advanced prompt engineering techniques, including few-shot prompting, chain of thought, self-consistency, and more.',
    logo: simulence,
  },
  {
    title: 'AI Automation Engineer',
    company: 'ZenithGen',
    years: 'May 2024 (Contract)',
    mainTech: ['Python', 'Flask', "AWS", "Docker", 'TypeScript', "HTML", "CSS"],
    description:
      'Engineered an advanced AI automation tool for a social media agency, implementing algorithms and automations that brought in millions of additional monthly views.',
    logo: zenith,
  },
  {
    title: 'Full Stack Developer Intern',
    company: 'Ecomtent (Techstars)',
    years: 'Dec 2024 - May 2024',
    mainTech: ['Next.js', 'AWS', 'React', 'Node.js', 'Python'],
    description:
      'Focused on full-stack development with a backend emphasis, integrated AI models with frontend, and worked with multiple AWS services, NodeJS/Python, and MLOps.',
    logo: ecomtent,
  },
  {
    title: 'AI Automation Engineer',
    company: 'Tiny Horse',
    years: 'Dec 2023 - Feb 2024 (Contract)',
    mainTech: ['Python', 'Node.js', 'React', 'Supabase', 'Shopify'],
    description:
      'Created custom AI applications to help automate and streamline business processes.',
    logo: tinyhorse,
  },
  {
    title: 'AI Engineer',
    company: 'ImmiCan',
    years: 'Dec 2023 (Contract)',
    mainTech: ['React', 'Python', 'Flask', 'Node.js', 'Vercel'],
    description:
      'Trained and created custom AI chatbot with multimodal functionality to meet employer needs.',
    logo: immican,
  },
  {
    title: 'QA Tester',
    company: 'Omnia Consulting',
    years: 'Dec 2023 (Contract)',
    mainTech: ['React', 'Node.js', 'Vite', 'Vitest'],
    description:
      'Implemented Unit testing and integration testing to ensure website stability. Tests included various pages, user profiles, and authentication.',
    logo: omnia,
  },
  {
    title: 'Backend Developer',
    company: 'Pashmotors',
    years: 'Nov 2024 (Contract)',
    mainTech: ['Javascript', 'React'],
    description:
      'Implemented API endpoints and backend services to support the frontend. Conducted thorough testing to ensure stability and security.',
    logo: pashmotors,
  },
  {
    title: 'Frontend Developer',
    company: 'Self Justice',
    years: 'Nov 2024 (Contract)',
    mainTech: ['Javascript', 'HTML', 'CSS'],
    description:
      'Implemented early page prototypes to test user response and feedback. Worked with a team to iterate on feedback and create a user-friendly and intuitive interface.',
    logo: selfjustice,
  },
  {
    title: 'Software Development Intern',
    company: 'Project: Humam City',
    years: 'Jan 2023 - March 2023',
    mainTech: ['React Native', 'Python'],
    description:
      'Developed and integrated user network features including login and messaging, along with API integrations using React Native and Python.',
    logo: phc,
  },
  {
    title: 'Full Stack Developer Intern',
    company: 'Simulence',
    years: 'Sep 2022 - Dec 2022',
    mainTech: ['Vue.js', 'Firestore', 'React', 'Node.js'],
    description:
      'Contributed to backend development by creating API calls and integrating databases using Firestore.js. Effectively collaborated in an agile environment with a team of over 10 members, actively participating in meetings and demos. Utilized Vue.js to design and implement responsive, interactive user interfaces.',
    logo: simulence,
  },
  {
    title: 'App Developer Intern',
    company: 'Wali Ul Asr Learning Institute',
    years: 'June 2019 - Sep 2019',
    mainTech: ['Python', 'Bash', 'React Native', 'Node.js'],
    description:
    "Developed and implemented app features based on client requirements using Python, Bash, React Native, and Node.js. Collaborated closely with the team to define specifications and design robust solutions. Conducted thorough testing to ensure high quality and reliability, and efficiently resolved complex bugs to enhance the user experience.",
    logo: wali,
  },
  {
    title: 'Web Developer Intern',
    company: 'Wali Ul Asr Learning Institute',
    years: 'June 2018 - Sep 2018',
    mainTech: ['React', 'Node.js', 'Javascript', 'Python'],
    description:
    "Transformed client needs into web application features using React, Node.js, JavaScript, and Python. Worked collaboratively within a team to establish specifications and design efficient solutions. Ensured product quality through rigorous testing processes and successfully addressed complex bugs to improve overall functionality.",
    logo: wali,
  },
];

export const projects = [
  {
    title: 'Social Flows',
    details:
      'AI App for content creators to easily convert content to be suitable to post on any social media using LLMs.',
  },
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

export const testimonialData = [
  {
    name: 'Taylor Leedahl',
    company: 'Owner at TinyHorse',
    review:
      "It's been a joy to work with Haider. He demonstrated a deep understanding of the tools he uses: he thought and communicated quickly about how his skills could help achieve ideas, he delivered drafts in a very reasonable timeline!",
    image: 'https://media.licdn.com/dms/image/C5603AQH7FQqevMWPGg/profile-displayphoto-shrink_800_800/0/1517480511384?e=1721865600&v=beta&t=0ofn9Ec0rPLwvyAcit2hm0cEHA4raq1C3gB_Jn5xmRg'
  },
  {
    name: 'Kyle Lacroix',
    company: 'Co-Founder at Blue Guardian',
    review:
      'Haider was an invaluable asset to our website project. His creativity, technical expertise, and proactive approach were exceptional. Highly recommended for his outstanding work ethic and talent.',
    image:
      'https://media.licdn.com/dms/image/C4D03AQEuOKPlOiPH3g/profile-displayphoto-shrink_800_800/0/1604442994882?e=2147483647&v=beta&t=sQ1HqUZ68dlkKHozYwr0JFierhTUjn2DkZkUx8U8Drg',
  },
  {
    name: 'Matt Karakilic',
    company: 'Director at Omnia Consulting',
    review:
      "Haider's willingness to step into unfamiliar territory and master a skill that once intimidated him was impressive. He demonstrated a high level of adaptability and technical proficiency.",
    image:
      'https://adplist-bucket.s3.amazonaws.com/media/profile_photos/1471371d465f4845987ba45d89bd8a38D71JB.webp',
  },
  {
    name: 'Saad Khan',
    company: 'CEO & Founder at ImmiCan',
    review:
      'Great guy to work with. Clear concise understanding of the project with an action taking approach. It would be my honor and privilege to work with him again',
    image: 'https://media.licdn.com/dms/image/D5603AQEPX5m3eZIh5A/profile-displayphoto-shrink_800_800/0/1702181465430?e=1721865600&v=beta&t=SvaNV4lTIrF9N317LsGOyggwidU9wLw4hVMoCYJcVAs'
  },
];

export const skillsArray = [
  'Python',
  'Next.js',
  'React.js',
  "Flask",
  "Node.js",
  'TypeScript',
  'JavaScript',
  'AWS',
  'Docker',
  'Vue.js',
  'Supabase',
  'Firebase',
  'HTML',
  'CSS',
  'C#',
  'Unity',
  'Git',
  'C',
];

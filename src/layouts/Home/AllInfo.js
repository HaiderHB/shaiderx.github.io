import phc from '../../assets/logos/phc.png';
import ecomtent from '../../assets/logos/ecomtent.png';
import wali from '../../assets/logos/wali.png';
import simulence from '../../assets/logos/simulence.jpg';
import topline from '../../assets/logos/topline.png';

// Content here mirrors the resume (public/Haider_Bokhari_Resume.pdf).
// When the resume changes, update both so dates and titles stay consistent.

// For profile pic change src/assets/profile.png and /profile-large.png

export const resumeURL = '/Haider_Bokhari_Resume.pdf';

export const profileText = {
  greeting: 'Hi there',
  description: `I’m Haider, an AI engineer and full-stack developer based in Ontario, Canada.
  For 3+ years I’ve been shipping LLM-powered products: AI agents with tool calling and RAG,
  realtime and voice AI, and the production web apps around them. Right now I’m building AI
  features at Arctic Wolf. Before that I was at Topline Pro (YC W21), and before that I reported
  to the CTO of Ecomtent, an eBay-backed AI startup whose tool drove $1M+ in sales.
  I’ve won 1st place at two company hackathons, and I studied Computer Science (AI) at the
  University of Toronto.`,
  extra: `I like working close to the product and the people using it, and I’m happiest
  turning a rough idea into a working demo fast. Outside of code: boxing, reading,
  weightlifting, and gaming.`,
};

export const disciplines = ['Full Stack Dev', 'LLM Agents', 'Voice AI', 'App Developer'];

export const experiences = [
  {
    title: 'Full Stack Engineer',
    company: 'Arctic Wolf',
    years: 'Jun 2025 - Present',
    mainTech: ['Python', 'TypeScript', 'React', 'AWS Lambda', 'LLM Agents', 'RAG'],
    description:
      'Building AI features for a cybersecurity platform. Won 1st place at the internal hackathon with an AI agent prototype (LLM backend and demo UI). Run LLM agent workflows (tool calling, RAG) on event-driven AWS Lambda, designed guardrails (schema-validated outputs, model fallbacks, prompt regression tests), added CloudWatch observability to AI services, and built streaming React/TypeScript UIs that render agent steps token by token.',
    initials: 'AW',
  },
  {
    title: 'Full Stack Engineer',
    company: 'Topline Pro (YC W21)',
    years: 'Sep 2024 - Mar 2025',
    mainTech: ['Python', 'Django', 'React', 'Next.js', 'LLMs'],
    description:
      'Led end-to-end development of a new AI agent that improved task efficiency by 40%. Built SPA and SSR apps in React and Next.js that cut page load time by 30%, optimized Django ORM queries on critical endpoints, and won 1st place at the company hackathon with an AI workflow automation tool.',
    logo: topline,
  },
  {
    title: 'AI Developer',
    company: 'Ecomtent (Techstars)',
    years: 'Nov 2023 - May 2024',
    mainTech: ['Next.js', 'React', 'AWS', 'Python', 'LLMs'],
    description:
      'Reported directly to the CTO, building core features of an eBay-backed AI tool that drove $1M+ in sales on Amazon, eBay and Walmart. Ran LLM evaluations that improved accuracy and response speed by 23%, stood up the serverless AWS backend (Amplify, AppSync, DynamoDB, EC2), and revamped the frontend (+15% engagement, -25% bounce rate).',
    logo: ecomtent,
  },
  {
    title: 'AI Full Stack Developer',
    company: 'Freelance',
    years: 'Jun 2023 - Dec 2023 (Contract)',
    mainTech: ['Python', 'Node.js', 'React', 'NLP', 'Supabase'],
    description:
      'Delivered AI automation and full-stack work to 8+ startups and brands, including Signarama (700+ franchise locations), Tiny Horse, ImmiCan, Omnia Consulting, Pashmotors and Self Justice. Trained custom ML models and deployed NLP chatbots, working directly with CEOs and founders. Averaged a 35% gain in operational efficiency across 10+ projects.',
    initials: '</>',
  },
  {
    title: 'Full Stack Developer Intern',
    company: 'Project: Human City',
    years: 'Dec 2022 - Mar 2023',
    mainTech: ['React Native', 'Python'],
    description:
      'Led a team of three developers at an early-stage social media startup, building the mobile app. Implemented login, onboarding and messaging and integrated REST APIs, reporting directly to the CEO.',
    logo: phc,
  },
  {
    title: 'Full Stack Developer Intern',
    company: 'Simulence',
    years: 'Sep 2022 - Dec 2022',
    mainTech: ['Vue.js', 'Firestore', 'Node.js'],
    description:
      'Architected and deployed REST APIs backed by Firestore, reducing data retrieval time by 30%, in agile sprints with a 10+ person cross-functional team.',
    logo: simulence,
  },
  {
    title: 'Software Developer Intern',
    company: 'Wali Ul Asr Learning Institute',
    years: 'Summers 2018 - 2019',
    mainTech: ['React Native', 'React', 'Node.js', 'Google Cloud'],
    description:
      'Built a React Native and Node.js app that automated media editing for content reaching thousands of viewers, and a custom CMS (React, Node.js, Google Cloud) that cut site update time by 50% for non-technical staff.',
    logo: wali,
  },
];

export const projects = [
  {
    title: 'Zenith Gen',
    details:
      'Built an AI automation tool for a social media agency that drove millions of additional monthly views.',
  },
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
];

export const testimonialData = [
  {
    name: 'Taylor Leedahl',
    company: 'Owner at TinyHorse',
    review:
      "It's been a joy to work with Haider. He demonstrated a deep understanding of the tools he uses: he thought and communicated quickly about how his skills could help achieve ideas, he delivered drafts in a very reasonable timeline!",
    image: ''
  },
  {
    name: 'Kyle Lacroix',
    company: 'Co-Founder at Blue Guardian',
    review:
      'Haider was an invaluable asset to our website project. His creativity, technical expertise, and proactive approach were exceptional. Highly recommended for his outstanding work ethic and talent.',
    image: '',
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
    image: ''
  },
];

export const skillsArray = [
  'Python',
  'TypeScript',
  'LLMs & Agents',
  'RAG',
  'Voice AI',
  'WebRTC',
  'React',
  'Next.js',
  'React Native',
  'Node.js',
  'Django',
  'Flask',
  'Postgres',
  'Supabase',
  'AWS',
  'Docker',
  'K8s',
  'Git',
];

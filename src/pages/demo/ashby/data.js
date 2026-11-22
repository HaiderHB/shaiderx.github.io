// Sample data for the Ashby demo. Everything here is invented: the companies, the people, their
// resumes and the interview notes. Thirty candidates are written by hand (the ones the three job
// descriptions are about, plus decoys that only look right to a keyword search); the rest are
// generated below from a fixed seed so the pool reads like a real past-applicant database.
// Pure JS: imported by the page and by the API routes.

export const TODAY = '2026-11';

// --- Job descriptions --------------------------------------------------------------------

export const JOBS = [
  {
    id: 'spe',
    title: 'Senior Product Engineer',
    short: 'Senior Product Engineer',
    band: 'CA$190–240K',
    // What a recruiter would type into a keyword search for this role (the baseline)
    keywords: ['TypeScript', 'React', 'Node', 'PostgreSQL', 'GraphQL', 'full-stack', 'scheduling'],
    text: `Senior Product Engineer · Remote (Canada) · CA$190–240K

We're a 60-person B2B software company building scheduling and workflow tools for operations teams. Product engineers here own a feature end to end: you talk to customers, write the spec, sketch the wireframes, then build it across the stack and watch the numbers after launch.

What you'll need
- 5+ years building web products professionally
- Strong TypeScript and React on the front end
- Comfort on the back end: Node.js services and PostgreSQL schemas
- A track record of owning features from spec to launch
- Product sense: you talk to users and turn what you hear into scope

Nice to have
- Experience with GraphQL APIs
- Experience in HR tech, recruiting or scheduling products
- You've written design docs or mentored other engineers
- Ideally a CS degree from a top-tier university`,
  },
  {
    id: 'sde',
    title: 'Staff Data Engineer',
    short: 'Staff Data Engineer',
    band: 'CA$210–260K',
    keywords: ['Spark', 'Airflow', 'Kafka', 'SQL', 'Python', 'data pipeline', 'staff'],
    text: `Staff Data Engineer · Remote (Canada) · CA$210–260K

Our data platform feeds billing, product analytics and the forecasts customers see in the app. We're looking for a staff-level engineer to set its direction.

What you'll need
- 8+ years in data or backend engineering, including time as a technical lead
- Designing batch and streaming pipelines that run in production
- Deep SQL and data modeling for an analytics warehouse
- Python for pipeline code, plus an orchestration tool
- Raising the bar for other engineers through design reviews and mentoring

Nice to have
- Kafka or another event streaming platform
- dbt in production
- Data quality and observability tooling
- Experience with usage-based billing data`,
  },
  {
    id: 'fd',
    title: 'Founding Product Designer',
    short: 'Founding Designer',
    band: 'CA$170–215K',
    keywords: ['Figma', 'design system', 'UX', 'prototyping', 'user research', 'SaaS', 'product designer'],
    text: `Founding Product Designer · Remote (Canada) · CA$170–215K

You'll be the first designer at a seed-stage company building hiring tools for small teams. There's no design system yet and no research practice: you'll start both.

What you'll need
- 5+ years designing B2B or SaaS products, end to end
- A portfolio that shows interaction design for complex workflows
- You run your own user research and usability tests
- Hands-on prototyping, from Figma to coded prototypes
- Comfort being the only designer: setting process, working directly with founders

Nice to have
- You've built a design system from scratch
- Experience designing for recruiting or HR products
- Some front-end code (HTML, CSS, React)
- A digital native who grew up online`,
  },
];

export const jobById = id => JOBS.find(job => job.id === id);

// Hand labels: the past candidates a recruiter would actually reach out to for each role.
// Written by reading every profile in the pool (not derived from any score); the eval panel
// measures both rankings against these.
export const LABELS = {
  spe: ['C-012', 'C-027', 'C-041', 'C-055', 'C-063', 'C-078', 'C-091', 'C-034'],
  sde: ['C-016', 'C-032', 'C-048', 'C-059', 'C-073', 'C-087'],
  fd: ['C-020', 'C-044', 'C-061', 'C-076', 'C-088'],
};

// --- Hand-written candidates ---------------------------------------------------------------
// roles: newest first; end null = current. applications: past applications with the stage
// reached, why they were passed on and the interview notes. school.prestige and the gaps
// between roles exist so the page can show that nothing reads them.

const PLANTED = [
  // Senior Product Engineer: the ones to find
  {
    id: 'C-012',
    name: 'Maya Okafor',
    location: 'Toronto, ON',
    school: { name: 'Lakeshore Polytechnic', degree: 'Diploma, Software Development', prestige: 'regional', year: 2019 },
    roles: [
      {
        title: 'Senior Software Engineer',
        org: 'Parcelwise',
        start: '2023-05',
        end: null,
        lines: [
          'Own the returns portal end to end: wrote the spec, wireframed the flows with our designer, and shipped it in TypeScript and React.',
          'Designed the Postgres schema and Node.js services behind label printing, now 40k labels a day.',
          'Run monthly calls with customer ops leads and turn them into the quarterly roadmap.',
        ],
      },
      {
        title: 'Software Engineer',
        org: 'Brightwire',
        start: '2020-01',
        end: '2023-04',
        lines: [
          'Built the booking calendar in React used by 300 clinics.',
          'Added GraphQL resolvers for the appointments API.',
        ],
      },
    ],
    applications: [
      {
        job: 'Senior Software Engineer',
        date: '2023-03',
        stage: 'Onsite',
        reason: 'level',
        detail: 'Strong on product, but about 3 years of experience; the role was scoped for 5+.',
        notes: [
          {
            kind: 'Onsite: product',
            by: 'Hiring manager',
            rating: 'Strong yes',
            text: 'Maya pushed back on our spec in the product round and proposed a smaller first release that would actually ship. Best product instincts of the loop.',
          },
          {
            kind: 'Onsite: system design',
            by: 'Staff engineer',
            rating: 'Mixed',
            text: 'Solid data model for the booking problem; less sure about scaling past one region. Feels like a senior in two years.',
          },
        ],
      },
    ],
  },
  {
    id: 'C-027',
    name: 'Daniel Ferreira',
    location: 'Vancouver, BC',
    school: { name: 'Westbridge University', degree: 'BSc, Computer Science', prestige: 'elite', year: 2017 },
    roles: [
      {
        title: 'Senior Full-stack Engineer',
        org: 'Tallyhub',
        start: '2021-02',
        end: null,
        lines: [
          'Led the invoice builder from the first customer interview to general availability, in TypeScript, React and Node.',
          'Cut p95 dashboard load from 3.1 s to 0.9 s.',
          'Mentor two junior engineers and write the design docs for billing changes.',
        ],
      },
      {
        title: 'Software Engineer',
        org: 'Loop Logistics',
        start: '2017-06',
        end: '2021-01',
        lines: ['Built dispatch screens and the PostgreSQL reporting tables.'],
      },
    ],
    applications: [
      {
        job: 'Senior Product Engineer',
        date: '2024-06',
        stage: 'Offer',
        reason: 'timing',
        detail: 'Accepted another offer a week before ours went out.',
        notes: [
          {
            kind: 'Onsite: product',
            by: 'Hiring manager',
            rating: 'Strong yes',
            text: 'Daniel ran the customer-interview exercise like it was the hundredth time: clear questions, then a scoped plan.',
          },
          {
            kind: 'Technical screen',
            by: 'Senior engineer',
            rating: 'Strong yes',
            text: 'Clean TypeScript, wrote tests without being asked, and explained the trade-offs between optimistic updates and server state.',
          },
        ],
      },
    ],
  },
  {
    id: 'C-041',
    name: 'Priya Raman',
    location: 'Montréal, QC',
    school: { name: 'Northgate College', degree: 'Diploma, Computer Programming', prestige: 'regional', year: 2018 },
    roles: [
      {
        title: 'Software Developer',
        org: 'Shiftly',
        start: '2021-09',
        end: null,
        lines: [
          'Shipped shift swapping from a one-page spec to launch: interviews with 12 store managers, wireframes, then the Next.js front end and the API.',
          'Moved our reporting from spreadsheets to Postgres views and a small Express service.',
          'Typed the whole front end in TS during a three-month migration.',
        ],
      },
      {
        title: 'Developer',
        org: 'Coastline Media',
        start: '2019-03',
        end: '2021-08',
        lines: ['Built a Remix site and a component library for the newsroom tools.'],
      },
    ],
    applications: [
      {
        job: 'Full-stack Engineer',
        date: '2025-01',
        stage: 'Technical screen',
        reason: 'closed',
        detail: 'Headcount for the role was frozen after the screen.',
        notes: [
          {
            kind: 'Technical screen',
            by: 'Senior engineer',
            rating: 'Yes',
            text: 'Priya refactored the take-home into small typed modules and explained every choice. Would have moved to onsite.',
          },
        ],
      },
    ],
  },
  {
    id: 'C-055',
    name: 'Tomás Lindqvist',
    location: 'Calgary, AB',
    school: { name: 'Prairie State University', degree: 'BSc, Computer Engineering', prestige: 'state', year: 2018 },
    roles: [
      {
        title: 'Founding Engineer',
        org: 'Quillstack',
        start: '2024-01',
        end: null,
        lines: [
          'Only engineer for the first year: built the React and TypeScript app, the Node API and the billing flow.',
          'Wrote every product spec and sat in on sales calls to hear objections first-hand.',
        ],
      },
      {
        title: 'Backend Engineer',
        org: 'Ridgeline Bank',
        start: '2018-04',
        end: '2023-11',
        lines: [
          'Built payment reconciliation services in Java and PostgreSQL.',
          'On-call lead for the ledger team.',
        ],
      },
    ],
    applications: [
      {
        job: 'Senior Product Engineer',
        date: '2023-09',
        stage: 'Onsite',
        reason: 'skills',
        detail: 'Strong back end, but no real front-end experience; struggled in the React pairing round.',
        notes: [
          {
            kind: 'Onsite: pairing',
            by: 'Senior engineer',
            rating: 'No',
            text: 'Tomás was lost in the React pairing exercise: unfamiliar with hooks and component state.',
          },
          {
            kind: 'Onsite: system design',
            by: 'Staff engineer',
            rating: 'Strong yes',
            text: 'Excellent schema design and clear thinking on idempotent payments.',
          },
        ],
      },
    ],
  },
  {
    id: 'C-063',
    name: 'Aisha Bello',
    location: 'Ottawa, ON',
    school: { name: 'Westbridge University', degree: 'BEng, Software', prestige: 'elite', year: 2017 },
    roles: [
      {
        title: 'Senior Mobile Engineer',
        org: 'Fieldnote',
        start: '2020-05',
        end: null,
        lines: [
          'Own the scheduling module in our React Native app, from customer interviews to release.',
          'Built the TypeScript GraphQL layer shared by web and mobile.',
          'Wrote the spec template the product team still uses.',
        ],
      },
      {
        title: 'Software Engineer',
        org: 'Maple Transit',
        start: '2018-01',
        end: '2020-04',
        lines: ['Built trip planning screens in React and a Node.js map tile service.'],
      },
    ],
    applications: [
      {
        job: 'Senior Product Engineer',
        date: '2022-11',
        stage: 'Recruiter screen',
        reason: 'withdrew',
        detail: 'Withdrew: was not looking to leave before the equity vested.',
        notes: [
          {
            kind: 'Recruiter screen',
            by: 'Recruiter',
            rating: 'Yes',
            text: 'Aisha’s scheduling work is a direct match. Asked us to reach back out in a year or two.',
          },
        ],
      },
    ],
  },
  {
    id: 'C-078',
    name: 'Kenji Watanabe',
    location: 'Halifax, NS',
    school: { name: 'Coastal Technical Institute', degree: 'Diploma, Computer Systems', prestige: 'regional', year: 2015 },
    roles: [
      {
        title: 'Senior Engineer',
        org: 'Kindred Health',
        start: '2023-08',
        end: null,
        lines: ['Lead engineer for patient intake forms: Postgres, React, Node.'],
      },
      {
        title: 'Co-founder and CTO',
        org: 'Lumen Rota',
        start: '2019-02',
        end: '2023-06',
        lines: [
          'Built a staff scheduling product from zero to 80 paying customers in TypeScript, React and Node.js.',
          'Did the wireframes, the specs and most customer onboarding calls myself.',
        ],
      },
      {
        title: 'Software Engineer',
        org: 'Bluepeak',
        start: '2015-06',
        end: '2019-01',
        lines: ['Full-stack work on a ticketing product.'],
      },
    ],
    applications: [
      {
        job: 'Senior Product Engineer',
        date: '2023-09',
        stage: 'Offer',
        reason: 'comp',
        detail: 'Asked for CA$235K; our band then topped out at CA$200K.',
        notes: [
          {
            kind: 'Hiring manager',
            by: 'Hiring manager',
            rating: 'Strong yes',
            text: 'Kenji has done the whole job before, as a founder. The only blocker is compensation.',
          },
        ],
      },
    ],
  },
  {
    id: 'C-091',
    name: 'Grace Kowalski',
    location: 'Winnipeg, MB',
    school: { name: 'Prairie State University', degree: 'BSc, Computer Science', prestige: 'state', year: 2019 },
    roles: [
      {
        title: 'Software Engineer II',
        org: 'HireLoop',
        start: '2021-03',
        end: null,
        lines: [
          'Built the interview kit builder recruiters use to assemble scorecards, in React, TypeScript and GraphQL.',
          'Owned the candidate scheduling flow end to end, including the rollout plan.',
          'Ran usability sessions with recruiters before each release.',
        ],
      },
      {
        title: 'Junior Developer',
        org: 'Patchwork',
        start: '2019-07',
        end: '2020-12',
        lines: ['Built internal tools in Node.js and PostgreSQL.'],
      },
    ],
    applications: [
      {
        job: 'Senior Product Engineer',
        date: '2024-04',
        stage: 'Technical screen',
        reason: 'closed',
        detail: 'Hiring for the role was paused.',
        notes: [
          {
            kind: 'Technical screen',
            by: 'Senior engineer',
            rating: 'Strong yes',
            text: 'Grace’s walkthrough of the scorecard builder was the best take-home review we have had: clear trade-offs and real user feedback.',
          },
        ],
      },
    ],
  },
  {
    id: 'C-034',
    name: 'Hannah Schultz',
    location: 'Kitchener, ON',
    school: { name: 'Hollis Institute of Technology', degree: 'BSc, Computer Science', prestige: 'elite', year: 2015 },
    roles: [
      {
        title: 'Senior Frontend Engineer',
        org: 'Orbit CRM',
        start: '2023-09',
        end: null,
        lines: [
          'Rebuilt the deal timeline in React and TypeScript and owned it from spec to launch.',
          'Added Node.js endpoints and PostgreSQL migrations for the timeline feed.',
        ],
      },
      {
        title: 'Software Engineer',
        org: 'Tidewater Fleet',
        start: '2015-09',
        end: '2021-04',
        lines: ['Built React dashboards for fleet managers and ran user interviews with drivers.'],
      },
    ],
    applications: [
      {
        job: 'Senior Product Engineer',
        date: '2024-02',
        stage: 'Onsite',
        reason: 'skills',
        detail: 'Close second; the other finalist had more back-end depth.',
        notes: [
          {
            kind: 'Onsite: product',
            by: 'Hiring manager',
            rating: 'Yes',
            text: 'Hannah’s spec for the timeline was the clearest written document in the loop.',
          },
          {
            kind: 'Onsite: system design',
            by: 'Staff engineer',
            rating: 'Mixed',
            text: 'Comfortable with Node and Postgres but has not designed a service from scratch.',
          },
        ],
      },
    ],
  },
  // Senior Product Engineer: decoys a keyword search loves
  {
    id: 'C-019',
    name: 'Marcus Bennett',
    location: 'Toronto, ON',
    school: { name: 'Hollis Institute of Technology', degree: 'BSc, Computer Science', prestige: 'elite', year: 2019 },
    roles: [
      {
        title: 'Full-stack Developer',
        org: 'Vantage Digital',
        start: '2020-03',
        end: null,
        lines: [
          'Skills: TypeScript, React, Node.js, PostgreSQL, GraphQL, full-stack, AWS, Docker, Kubernetes.',
          'Worked on full-stack features for client projects using React, Node.js and GraphQL.',
          'Contributed to scheduling dashboards in React and TypeScript.',
        ],
      },
      {
        title: 'Intern',
        org: 'Northbeam',
        start: '2019-05',
        end: '2019-12',
        lines: ['Wrote unit tests for a React app.'],
      },
    ],
    applications: [
      {
        job: 'Senior Product Engineer',
        date: '2025-03',
        stage: 'Technical screen',
        reason: 'skills',
        detail: 'Could not go deeper than the tool names in the screen.',
        notes: [
          {
            kind: 'Technical screen',
            by: 'Senior engineer',
            rating: 'No',
            text: 'Marcus could not explain how the React app on the resume manages state, and the PostgreSQL questions stayed at buzzword level.',
          },
        ],
      },
    ],
  },
  {
    id: 'C-046',
    name: 'Liam O’Connell',
    location: 'Victoria, BC',
    school: { name: 'Westbridge University', degree: 'BA, Interactive Media', prestige: 'elite', year: 2017 },
    roles: [
      {
        title: 'Senior Frontend Engineer',
        org: 'Pixelyard',
        start: '2018-02',
        end: null,
        lines: [
          'Built the TypeScript and React design system used across six apps.',
          'Led the migration from Redux to React Query.',
          'Some Node.js and GraphQL work on the backend-for-frontend layer.',
        ],
      },
    ],
    applications: [
      {
        job: 'Senior Product Engineer',
        date: '2024-08',
        stage: 'Hiring manager screen',
        reason: 'role',
        detail: 'Wants to stay purely front end; not interested in back-end work or customer calls.',
        notes: [
          {
            kind: 'Hiring manager screen',
            by: 'Hiring manager',
            rating: 'Mixed',
            text: 'Liam was clear about wanting to stay on the front end and does not want to join customer calls or own back-end work.',
          },
        ],
      },
    ],
  },
  {
    id: 'C-070',
    name: 'Rafael Duarte',
    location: 'Toronto, ON',
    school: { name: 'Westbridge University', degree: 'MEng, Computer Science', prestige: 'elite', year: 2015 },
    roles: [
      {
        title: 'Engineering Manager',
        org: 'Corvid Systems',
        start: '2021-06',
        end: null,
        lines: [
          'Manage nine engineers across two teams shipping TypeScript, React and Node.js services.',
          'Run hiring and quarterly planning for the scheduling product.',
        ],
      },
      {
        title: 'Senior Software Engineer',
        org: 'Corvid Systems',
        start: '2016-01',
        end: '2021-05',
        lines: ['Built the GraphQL gateway and the PostgreSQL sharding plan.'],
      },
    ],
    applications: [
      {
        job: 'Senior Product Engineer',
        date: '2025-05',
        stage: 'Hiring manager screen',
        reason: 'role',
        detail: 'Wants to stay a manager; has not written production code in about four years.',
        notes: [
          {
            kind: 'Hiring manager screen',
            by: 'Hiring manager',
            rating: 'Mixed',
            text: 'Rafael has not written production code in about four years and would want a path back to managing within a year.',
          },
        ],
      },
    ],
  },
  {
    id: 'C-085',
    name: 'Sofia Marchetti',
    location: 'Hamilton, ON',
    school: { name: 'Northgate College', degree: 'Diploma, Software Engineering Technology', prestige: 'regional', year: 2018 },
    roles: [
      {
        title: 'Software Engineer',
        org: 'Brookfield Mutual',
        start: '2019-01',
        end: null,
        lines: [
          'Maintain the claims portal in AngularJS and Java.',
          'Wrote PostgreSQL stored procedures for nightly reports.',
        ],
      },
    ],
    applications: [
      {
        job: 'Senior Product Engineer',
        date: '2025-06',
        stage: 'Technical screen',
        reason: 'skills',
        detail: 'No production TypeScript or React; strong Java.',
        notes: [
          {
            kind: 'Technical screen',
            by: 'Senior engineer',
            rating: 'Mixed',
            text: 'Sofia knows the claims domain well but has not used React or TypeScript beyond tutorials.',
          },
        ],
      },
    ],
  },
  {
    id: 'C-022',
    name: 'Ethan Clarke',
    location: 'Saskatoon, SK',
    school: { name: 'Ironleaf Coding Bootcamp', degree: 'Certificate, Web Development', prestige: 'none', year: 2023 },
    roles: [
      {
        title: 'Software Engineer',
        org: 'Nimbus Pay',
        start: '2023-07',
        end: null,
        lines: [
          'Built React and TypeScript forms for merchant onboarding.',
          'Fixed bugs in the Node.js webhook service.',
        ],
      },
    ],
    applications: [
      {
        job: 'Senior Product Engineer',
        date: '2025-02',
        stage: 'Technical screen',
        reason: 'level',
        detail: 'About 18 months of experience; the role needs 5+ years.',
        notes: [
          {
            kind: 'Technical screen',
            by: 'Senior engineer',
            rating: 'Yes',
            text: 'Ethan is sharp and quick in TypeScript, just early in the career.',
          },
        ],
      },
    ],
  },

  // Staff Data Engineer: the ones to find
  {
    id: 'C-016',
    name: 'Olumide Adeyemi',
    location: 'Mississauga, ON',
    school: { name: 'Prairie State University', degree: 'BSc, Statistics', prestige: 'state', year: 2016 },
    roles: [
      {
        title: 'Data Platform Lead',
        org: 'Meridian Energy',
        start: '2023-02',
        end: null,
        lines: [
          'Lead a team of five building the batch and streaming pipelines behind customer billing.',
          'Set the data modeling standards for the Snowflake warehouse and review every new model.',
          'Run the weekly design review for the data org.',
        ],
      },
      {
        title: 'Senior Data Engineer',
        org: 'Meridian Energy',
        start: '2019-04',
        end: '2023-01',
        lines: ['Built Spark jobs in Python for meter data, 2 billion rows a day.'],
      },
      {
        title: 'Data Engineer',
        org: 'Halcyon Ads',
        start: '2016-08',
        end: '2019-03',
        lines: ['Built Airflow DAGs for campaign reporting.'],
      },
    ],
    applications: [
      {
        job: 'Staff Data Engineer',
        date: '2022-10',
        stage: 'Onsite',
        reason: 'level',
        detail: 'Very strong senior, but had not led other engineers yet.',
        notes: [
          {
            kind: 'Onsite: system design',
            by: 'Principal engineer',
            rating: 'Yes',
            text: 'Olumide’s late-arriving-data design for the billing pipeline was the best answer we heard. Has not led a team yet.',
          },
        ],
      },
    ],
  },
  {
    id: 'C-032',
    name: 'Mei Lin Zhou',
    location: 'Burnaby, BC',
    school: { name: 'Westbridge University', degree: 'MSc, Computer Science', prestige: 'elite', year: 2017 },
    roles: [
      {
        title: 'Senior Data Engineer',
        org: 'Ardent Health',
        start: '2020-06',
        end: null,
        lines: [
          'Own the Kafka ingestion from 40 clinic systems and the Flink jobs that clean it.',
          'Wrote the dbt project that replaced 300 hand-written SQL reports.',
          'Tech lead for a three-person pipeline squad.',
        ],
      },
      {
        title: 'Data Engineer',
        org: 'Ardent Health',
        start: '2017-09',
        end: '2020-05',
        lines: ['Python ETL jobs and the first warehouse schema.'],
      },
    ],
    applications: [
      {
        job: 'Staff Data Engineer',
        date: '2024-01',
        stage: 'Onsite',
        reason: 'timing',
        detail: 'Could not relocate to Toronto; the role was office-based then.',
        notes: [
          {
            kind: 'Onsite: data modeling',
            by: 'Staff engineer',
            rating: 'Strong yes',
            text: 'Mei Lin modelled the subscription events cleanly and caught the double-counting trap in the exercise.',
          },
        ],
      },
    ],
  },
  {
    id: 'C-048',
    name: 'Samir Khalil',
    location: 'London, ON',
    school: { name: 'Coastal Technical Institute', degree: 'BTech, Information Systems', prestige: 'regional', year: 2015 },
    roles: [
      {
        title: 'Staff Engineer, Data',
        org: 'Cobalt Freight',
        start: '2021-01',
        end: null,
        lines: [
          'Designed the event backbone on Pub/Sub and the Beam jobs that compute shipment ETAs every minute.',
          'Moved 140 batch jobs to Dagster with lineage and alerts.',
          'Wrote the BigQuery modeling guide that four teams follow.',
        ],
      },
      {
        title: 'Backend Engineer',
        org: 'Cobalt Freight',
        start: '2015-05',
        end: '2020-12',
        lines: ['Go and Python services for carrier integrations.'],
      },
    ],
    applications: [
      {
        job: 'Senior Data Engineer',
        date: '2023-05',
        stage: 'Recruiter screen',
        reason: 'comp',
        detail: 'Expected CA$250K; our senior band capped at CA$185K.',
        notes: [
          {
            kind: 'Recruiter screen',
            by: 'Recruiter',
            rating: 'Yes',
            text: 'Samir has been running data at a freight company and is well above the senior level we had open.',
          },
        ],
      },
    ],
  },
  {
    id: 'C-059',
    name: 'Yusuf Demir',
    location: 'Edmonton, AB',
    school: { name: 'Prairie State University', degree: 'BSc, Computing Science', prestige: 'state', year: 2016 },
    roles: [
      {
        title: 'Senior Data Engineer',
        org: 'Tillpoint',
        start: '2024-05',
        end: null,
        lines: [
          'Built our first streaming pipeline: Kafka into the warehouse, with exactly-once checks.',
          'Added data quality tests and freshness alerts to every critical table.',
        ],
      },
      {
        title: 'Data Engineer',
        org: 'Ledgerline',
        start: '2017-02',
        end: '2024-04',
        lines: [
          'Built nightly batch pipelines in Python and Airflow for usage-based billing.',
          'Owned the finance data model in Redshift.',
          'Led the migration to dbt with two other engineers.',
        ],
      },
    ],
    applications: [
      {
        job: 'Staff Data Engineer',
        date: '2024-03',
        stage: 'Onsite',
        reason: 'skills',
        detail: 'No streaming experience; everything batch.',
        notes: [
          {
            kind: 'Onsite: system design',
            by: 'Staff engineer',
            rating: 'Mixed',
            text: 'Yusuf’s batch design was solid, but nothing streaming yet, and Yusuf said so.',
          },
        ],
      },
    ],
  },
  {
    id: 'C-073',
    name: 'Isabel Navarro',
    location: 'Québec City, QC',
    school: { name: 'Northgate College', degree: 'BBA, Business Analytics', prestige: 'regional', year: 2015 },
    roles: [
      {
        title: 'Staff Analytics Engineer',
        org: 'Peregrine Retail',
        start: '2022-04',
        end: null,
        lines: [
          'Lead the data modeling layer: 600 dbt models, data contracts and code review for 20 contributors.',
          'Built the Airflow and Python framework that runs every pipeline in the company.',
          'Mentor four engineers; two have been promoted.',
        ],
      },
      {
        title: 'Analytics Engineer',
        org: 'Peregrine Retail',
        start: '2018-01',
        end: '2022-03',
        lines: ['SQL and dbt models for merchandising.'],
      },
      {
        title: 'Data Analyst',
        org: 'Fable Books',
        start: '2015-06',
        end: '2017-12',
        lines: ['Reports and dashboards for the sales team.'],
      },
    ],
    applications: [
      {
        job: 'Staff Data Engineer',
        date: '2023-11',
        stage: 'Onsite',
        reason: 'skills',
        detail: 'Strong modeling; thin on streaming and infrastructure.',
        notes: [
          {
            kind: 'Onsite: architecture',
            by: 'Staff engineer',
            rating: 'Yes',
            text: 'Isabel’s data contracts proposal was excellent. Streaming knowledge is shallow.',
          },
        ],
      },
    ],
  },
  {
    id: 'C-087',
    name: 'Noah Gagnon',
    location: 'Sherbrooke, QC',
    school: { name: 'Hollis Institute of Technology', degree: 'BEng, Electrical', prestige: 'elite', year: 2016 },
    roles: [
      {
        title: 'Senior ML Platform Engineer',
        org: 'Aurora Robotics',
        start: '2021-08',
        end: null,
        lines: [
          'Built the feature pipeline: Kafka streams and Spark batch jobs feeding model training.',
          'Tech lead for the feature store; review designs across three teams.',
        ],
      },
      {
        title: 'Data Engineer',
        org: 'Prism Telecom',
        start: '2016-03',
        end: '2021-07',
        lines: ['Python and SQL pipelines for network usage data, billed per minute.'],
      },
    ],
    applications: [
      {
        job: 'Staff Data Engineer',
        date: '2025-04',
        stage: 'Technical screen',
        reason: 'withdrew',
        detail: 'Withdrew to stay for a promotion cycle.',
        notes: [
          {
            kind: 'Technical screen',
            by: 'Staff engineer',
            rating: 'Strong yes',
            text: 'Noah answered the streaming deep-dive better than our own team would.',
          },
        ],
      },
    ],
  },
  // Staff Data Engineer: decoys
  {
    id: 'C-024',
    name: 'Zoe Papadopoulos',
    location: 'Toronto, ON',
    school: { name: 'Westbridge University', degree: 'BA, Economics', prestige: 'elite', year: 2018 },
    roles: [
      {
        title: 'Senior Data Analyst',
        org: 'Coral Bank',
        start: '2019-01',
        end: null,
        lines: [
          'Built Tableau dashboards for the lending team.',
          'Skills: SQL, Python, Spark, Airflow, Kafka, data pipelines, Snowflake.',
        ],
      },
    ],
    applications: [
      {
        job: 'Staff Data Engineer',
        date: '2025-01',
        stage: 'Recruiter screen',
        reason: 'skills',
        detail: 'Analyst background; never owned a pipeline in production.',
        notes: [
          {
            kind: 'Recruiter screen',
            by: 'Recruiter',
            rating: 'No',
            text: 'Zoe has used Airflow to schedule reports but has not built or run pipelines. Wants to move into engineering.',
          },
        ],
      },
    ],
  },
  {
    id: 'C-038',
    name: 'Arjun Mehta',
    location: 'Waterloo, ON',
    school: { name: 'Hollis Institute of Technology', degree: 'PhD, Statistics', prestige: 'elite', year: 2018 },
    roles: [
      {
        title: 'Senior Data Scientist',
        org: 'Quanta Insurance',
        start: '2018-05',
        end: null,
        lines: [
          'Built pricing models in Python and Spark.',
          'Wrote SQL feature pipelines for the risk team.',
        ],
      },
    ],
    applications: [
      {
        job: 'Staff Data Engineer',
        date: '2024-09',
        stage: 'Hiring manager screen',
        reason: 'role',
        detail: 'Wants to stay in modeling; not interested in platform work.',
        notes: [
          {
            kind: 'Hiring manager screen',
            by: 'Hiring manager',
            rating: 'Mixed',
            text: 'Arjun was candid about wanting to build models, not data platforms.',
          },
        ],
      },
    ],
  },
  {
    id: 'C-066',
    name: 'Leah Goldberg',
    location: 'Ottawa, ON',
    school: { name: 'Prairie State University', degree: 'BSc, Mathematics', prestige: 'state', year: 2022 },
    roles: [
      {
        title: 'Data Engineer',
        org: 'Bramble Marketing',
        start: '2022-06',
        end: null,
        lines: [
          'Built Airflow pipelines in Python and Spark for marketing data.',
          'Added Kafka consumers for click events.',
        ],
      },
    ],
    applications: [
      {
        job: 'Staff Data Engineer',
        date: '2025-08',
        stage: 'Technical screen',
        reason: 'level',
        detail: 'About 3 years of experience; the role is staff level.',
        notes: [
          {
            kind: 'Technical screen',
            by: 'Staff engineer',
            rating: 'Yes',
            text: 'Leah is strong for the level; not staff yet.',
          },
        ],
      },
    ],
  },

  // Founding Product Designer: the ones to find
  {
    id: 'C-020',
    name: 'Chloe Tremblay',
    location: 'Montréal, QC',
    school: { name: 'Northgate College', degree: 'Diploma, Graphic Design', prestige: 'regional', year: 2017 },
    roles: [
      {
        title: 'Senior Product Designer',
        org: 'Gather',
        start: '2021-03',
        end: null,
        lines: [
          'First designer at a 12-person startup: built the design system and ran all user research for two years.',
          'Designed the approval workflows for enterprise admins, from interviews to shipped UI.',
          'Prototype in Figma, and in React code when the interaction needs it.',
        ],
      },
      {
        title: 'Product Designer',
        org: 'Wildcard Studio',
        start: '2017-09',
        end: '2021-02',
        lines: ['Designed onboarding flows for B2B clients.'],
      },
    ],
    applications: [
      {
        job: 'Product Designer',
        date: '2023-02',
        stage: 'Portfolio review',
        reason: 'timing',
        detail: 'Wanted to stay until the equity vested.',
        notes: [
          {
            kind: 'Portfolio review',
            by: 'Head of product',
            rating: 'Strong yes',
            text: 'Chloe’s approval-workflow case study showed the research, three discarded concepts and the shipped result. Exactly the bar.',
          },
        ],
      },
    ],
  },
  {
    id: 'C-044',
    name: 'Nadia Haddad',
    location: 'Toronto, ON',
    school: { name: 'Westbridge University', degree: 'BDes, Interaction Design', prestige: 'elite', year: 2018 },
    roles: [
      {
        title: 'Lead Product Designer',
        org: 'Clerkly',
        start: '2023-01',
        end: null,
        lines: [
          'Lead design for the scheduling and payroll workflows used by 4,000 small businesses.',
          'Run monthly usability tests and keep the research repository.',
          'Built the component library in Figma with our front-end lead.',
        ],
      },
      {
        title: 'Product Designer',
        org: 'Clerkly',
        start: '2020-06',
        end: '2022-12',
        lines: ['Designed the shift-planning grid.'],
      },
      {
        title: 'Junior Designer',
        org: 'Hatch Agency',
        start: '2018-09',
        end: '2020-05',
        lines: ['Marketing sites and brand work.'],
      },
    ],
    applications: [
      {
        job: 'Senior Product Designer',
        date: '2022-04',
        stage: 'Onsite',
        reason: 'level',
        detail: 'Talented, but 3.5 years and mostly execution; the role needed someone to lead.',
        notes: [
          {
            kind: 'Onsite: design critique',
            by: 'Design lead',
            rating: 'Yes',
            text: 'Nadia’s shift-planning grid is excellent interaction design. Needs more experience leading.',
          },
        ],
      },
    ],
  },
  {
    id: 'C-061',
    name: 'Ji-woo Park',
    location: 'Vancouver, BC',
    school: { name: 'Coastal Technical Institute', degree: 'Diploma, Digital Media', prestige: 'regional', year: 2016 },
    roles: [
      {
        title: 'Senior Product Designer',
        org: 'Tandem HR',
        start: '2020-02',
        end: null,
        lines: [
          'Designed the interview scheduling and candidate portal flows for 900 companies.',
          'Ran more than 60 interviews with recruiters and hiring managers to rebuild the scorecard flow.',
          'Partnered with the founders on the roadmap as the first designer on the hiring product.',
        ],
      },
      {
        title: 'UX Designer',
        org: 'Nova Telecom',
        start: '2016-05',
        end: '2020-01',
        lines: ['Self-serve account flows.'],
      },
    ],
    applications: [
      {
        job: 'Product Designer',
        date: '2024-10',
        stage: 'Hiring manager screen',
        reason: 'closed',
        detail: 'Role cancelled after a reorg.',
        notes: [
          {
            kind: 'Hiring manager screen',
            by: 'Head of product',
            rating: 'Strong yes',
            text: 'Ji-woo knows recruiting workflows better than we do. Would hire tomorrow if the role were open.',
          },
        ],
      },
    ],
  },
  {
    id: 'C-076',
    name: 'Fatima Rahimi',
    location: 'Regina, SK',
    school: { name: 'Ironleaf Coding Bootcamp', degree: 'Certificate, Front-end Development', prestige: 'none', year: 2018 },
    roles: [
      {
        title: 'Product Designer',
        org: 'Ploughshare',
        start: '2022-05',
        end: null,
        lines: [
          'Design complex permission flows in Figma, then build coded prototypes in React to test them.',
          'Set up the team’s usability testing cadence.',
        ],
      },
      {
        title: 'Front-end Engineer',
        org: 'Ploughshare',
        start: '2018-03',
        end: '2022-04',
        lines: ['Built the HTML and CSS component library.'],
      },
    ],
    applications: [
      {
        job: 'Senior Product Designer',
        date: '2025-02',
        stage: 'Portfolio review',
        reason: 'skills',
        detail: 'Portfolio light on end-to-end research.',
        notes: [
          {
            kind: 'Portfolio review',
            by: 'Design lead',
            rating: 'Mixed',
            text: 'Fatima’s prototypes are outstanding; the case studies skip the research part, so it is hard to judge.',
          },
        ],
      },
    ],
  },
  {
    id: 'C-088',
    name: 'Leila Moreau',
    location: 'Gatineau, QC',
    school: { name: 'Hollis Institute of Technology', degree: 'BDes, Industrial Design', prestige: 'elite', year: 2014 },
    roles: [
      {
        title: 'Product Designer',
        org: 'Northstar Logistics',
        start: '2019-07',
        end: null,
        lines: [
          'Designed the carrier onboarding workflow from the first sketch to launch.',
          'Started the company’s user research practice: recruiting panel, scripts and synthesis.',
          'Created the first design system and wrote its contribution guide.',
        ],
      },
      {
        title: 'Designer',
        org: 'Foundry Labs',
        start: '2014-04',
        end: '2017-06',
        lines: ['Interaction design for an analytics product.'],
      },
    ],
    applications: [
      {
        job: 'Product Designer',
        date: '2023-07',
        stage: 'Onsite',
        reason: 'timing',
        detail: 'Moving to Europe for a year; asked us to stay in touch.',
        notes: [
          {
            kind: 'Onsite: portfolio',
            by: 'Head of product',
            rating: 'Strong yes',
            text: 'Leila presented the carrier onboarding work with real usability-test clips. Strong hire, bad timing.',
          },
        ],
      },
    ],
  },
  // Founding Product Designer: decoys
  {
    id: 'C-030',
    name: 'Ava Sinclair',
    location: 'Toronto, ON',
    school: { name: 'Westbridge University', degree: 'BFA, Visual Communication', prestige: 'elite', year: 2018 },
    roles: [
      {
        title: 'Senior Designer',
        org: 'Brightside Agency',
        start: '2019-01',
        end: null,
        lines: [
          'Brand identity, Figma design systems and marketing sites for SaaS clients.',
          'Skills: Figma, design system, UX, prototyping, user research, SaaS, product designer.',
        ],
      },
    ],
    applications: [
      {
        job: 'Product Designer',
        date: '2024-05',
        stage: 'Portfolio review',
        reason: 'skills',
        detail: 'Portfolio is mostly brand and marketing; little product workflow work.',
        notes: [
          {
            kind: 'Portfolio review',
            by: 'Design lead',
            rating: 'No',
            text: 'Ava’s work is beautiful brand design, but there is no complex product workflow in the portfolio.',
          },
        ],
      },
    ],
  },
  {
    id: 'C-052',
    name: 'Ben Hartley',
    location: 'Kingston, ON',
    school: { name: 'Hollis Institute of Technology', degree: 'MA, Human Factors', prestige: 'elite', year: 2017 },
    roles: [
      {
        title: 'Senior UX Researcher',
        org: 'Plinth Analytics',
        start: '2018-06',
        end: null,
        lines: [
          'Lead user research and usability testing for a SaaS analytics product.',
          'Run prototyping workshops in Figma with the product designer.',
        ],
      },
    ],
    applications: [
      {
        job: 'Product Designer',
        date: '2024-11',
        stage: 'Recruiter screen',
        reason: 'role',
        detail: 'A researcher, not a designer; wants to stay in research.',
        notes: [
          {
            kind: 'Recruiter screen',
            by: 'Recruiter',
            rating: 'Mixed',
            text: 'Ben is a researcher and was clear about not wanting to design.',
          },
        ],
      },
    ],
  },
  {
    id: 'C-080',
    name: 'Owen Fraser',
    location: 'Moncton, NB',
    school: { name: 'Coastal Technical Institute', degree: 'Diploma, Graphic Design', prestige: 'regional', year: 2021 },
    roles: [
      {
        title: 'Product Designer',
        org: 'Kitebox',
        start: '2021-09',
        end: null,
        lines: ['Designed landing pages and settings screens in Figma.'],
      },
    ],
    applications: [
      {
        job: 'Senior Product Designer',
        date: '2025-07',
        stage: 'Portfolio review',
        reason: 'skills',
        detail: 'Interaction design depth: has not designed a complex workflow.',
        notes: [
          {
            kind: 'Portfolio review',
            by: 'Design lead',
            rating: 'Mixed',
            text: 'Owen’s craft is clean, but every project is a simple screen; nothing with real workflow complexity.',
          },
        ],
      },
    ],
  },
];

// --- Generated candidates --------------------------------------------------------------------
// Everyone else who applied over the years: other functions and a few adjacent engineers.
// Deterministic (fixed seed), so the pool, the line ids and the labels never drift.

function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = [
  'Amara', 'Ben', 'Carmen', 'Dev', 'Elena', 'Femi', 'Gabriel', 'Hana', 'Ivan', 'Jasmine', 'Kofi', 'Lucia', 'Mateo',
  'Nora', 'Omar', 'Paula', 'Quinn', 'Rosa', 'Sanjay', 'Tara', 'Uma', 'Victor', 'Wren', 'Xavier', 'Yara', 'Zain',
  'Anika', 'Bruno', 'Celine', 'Diego', 'Esme', 'Farid', 'Greta', 'Hugo', 'Ines', 'Jonah', 'Kira', 'Luca', 'Mira',
  'Nikhil', 'Olga', 'Pierre', 'Rhea', 'Stefan', 'Talia', 'Viktor', 'Willa', 'Yosef', 'Zara', 'Andre', 'Bianca',
  'Cyrus', 'Dalia', 'Emil', 'Freya', 'Goran', 'Helena', 'Idris', 'Juno', 'Kai',
];
const LAST = [
  'Abara', 'Bergstrom', 'Castillo', 'Dubois', 'Eriksen', 'Fonseca', 'Gill', 'Horvat', 'Ibrahim', 'Jensen', 'Kaur',
  'Laurent', 'Mbeki', 'Novak', 'Oyelaran', 'Pereira', 'Quispe', 'Rossi', 'Sato', 'Tan', 'Ueda', 'Vasquez', 'Walsh',
  'Yilmaz', 'Zielinski', 'Achebe', 'Brandt', 'Chen', 'Dimitrov', 'Esposito', 'Fischer', 'Grant', 'Hassan', 'Ito',
  'Juarez', 'Kim', 'Lopez', 'Moretti', 'Nguyen', 'Osei', 'Patel', 'Reyes', 'Singh', 'Tran', 'Varga', 'Wong',
];
const CITIES = [
  'Toronto, ON', 'Vancouver, BC', 'Montréal, QC', 'Calgary, AB', 'Ottawa, ON', 'Edmonton, AB', 'Winnipeg, MB',
  'Halifax, NS', 'Victoria, BC', 'Waterloo, ON', 'Québec City, QC', 'Saskatoon, SK', 'London, ON', 'Kelowna, BC',
];
const SCHOOLS = [
  { name: 'Westbridge University', prestige: 'elite' },
  { name: 'Hollis Institute of Technology', prestige: 'elite' },
  { name: 'Prairie State University', prestige: 'state' },
  { name: 'Lakeshore Polytechnic', prestige: 'regional' },
  { name: 'Northgate College', prestige: 'regional' },
  { name: 'Coastal Technical Institute', prestige: 'regional' },
  { name: 'Ironleaf Coding Bootcamp', prestige: 'none' },
];
const ORGS = [
  'Bluefin Systems', 'Copperleaf', 'Driftwood Labs', 'Elmstead', 'Fairlane Software', 'Glasshouse', 'Harbourline',
  'Inkwell', 'Juniper Pay', 'Keystone Health', 'Larkspur', 'Mossrock', 'Nettle', 'Oakhurst Insurance', 'Pinecrest',
  'Quarry Analytics', 'Redwater', 'Stonebridge Retail', 'Thistle', 'Upland Energy', 'Verdant', 'Willowbrook Bank',
];

// Each archetype: two titles (earlier, later), resume lines, why they were passed on, a note.
// Many mention the same tools as the three roles (React, Kafka, Figma...), as a real pool does:
// that is what makes a keyword search noisy.
const ARCHETYPES = [
  {
    titles: ['QA Analyst', 'Senior QA Engineer'],
    degree: 'Diploma, Computer Science',
    lines: [
      'Wrote the end-to-end test suite in Playwright and TypeScript for the checkout flow.',
      'Cut release regressions by half with a nightly smoke-test run against the React app.',
      'Manual and exploratory testing for the mobile app.',
    ],
    jobs: ['Senior Product Engineer', 'Software Engineer'],
    reasons: [['skills', 'Testing background; little feature development.']],
    note: 'Careful tester with a good eye for edge cases; has not built product features.',
  },
  {
    titles: ['Junior Developer', 'Software Developer'],
    degree: 'Certificate, Web Development',
    junior: true,
    lines: [
      'Built admin screens in React and Node.js.',
      'Wrote the CSV import into PostgreSQL.',
      'Fixed bugs across the TypeScript monolith.',
    ],
    jobs: ['Senior Product Engineer', 'Software Engineer'],
    reasons: [['level', 'Early career; the role needed a senior.']],
    note: 'Eager and learns fast; early in the career and has not owned a feature yet.',
  },
  {
    titles: ['Freelance Developer', 'Contract Full-stack Developer'],
    degree: 'Diploma, Web Development',
    lines: [
      'Built client sites in React, Node and PostgreSQL.',
      'Short contracts, mostly three to six months each.',
      'Some GraphQL and TypeScript work for an agency client.',
    ],
    jobs: ['Senior Product Engineer', 'Full-stack Engineer'],
    reasons: [['skills', 'Broad but shallow; no feature owned past a short contract.']],
    note: 'Knows many tools a little; could not describe owning a feature after launch.',
  },
  {
    titles: ['Web Developer', 'Frontend Engineer'],
    degree: 'Diploma, Web Development',
    lines: [
      'Built marketing pages and the pricing calculator in Vue and TypeScript.',
      'Maintain a few React widgets embedded in the CMS.',
      'Improved Lighthouse scores from 60 to 95 on the main site.',
    ],
    jobs: ['Senior Product Engineer', 'Frontend Engineer'],
    reasons: [['level', 'Marketing-site work; not yet at senior product scope.']],
    note: 'Fast and tidy on marketing pages; has not owned an application feature.',
  },
  {
    titles: ['Software Engineer', 'Senior Backend Engineer'],
    degree: 'BSc, Computer Science',
    lines: [
      'Built order routing services in Go with gRPC and PostgreSQL.',
      'Designed the data pipeline that syncs orders to the warehouse through Kafka.',
      'Mentored two engineers through their first on-call rotations.',
    ],
    jobs: ['Senior Product Engineer', 'Backend Engineer', 'Staff Data Engineer'],
    reasons: [['skills', 'Back end only; no front-end experience.'], ['level', 'Below the level the role needed at the time.']],
    note: 'Strong Go engineer; has not touched front-end code and is not keen to.',
  },
  {
    titles: ['iOS Developer', 'Senior iOS Engineer'],
    degree: 'BSc, Computer Science',
    lines: [
      'Built the offline mode for the iPad app in Swift, synced over GraphQL.',
      'Shipped SwiftUI widgets and push notification settings.',
      'Profiled and fixed scrolling jank in the feed.',
    ],
    jobs: ['Senior Product Engineer', 'Mobile Engineer'],
    reasons: [['skills', 'Native iOS only; the role needed web.'], ['closed', 'Mobile role was cancelled.']],
    note: 'Strong Swift engineer; has not worked on the web stack.',
  },
  {
    titles: ['Systems Administrator', 'Site Reliability Engineer'],
    degree: 'Diploma, Network Engineering',
    lines: [
      'Run Terraform and Kubernetes for 40 services, including the PostgreSQL and Kafka clusters.',
      'Built the on-call runbooks and cut paging noise by 60%.',
      'Wrote Python and Node tooling for deploys.',
    ],
    jobs: ['Site Reliability Engineer', 'Staff Data Engineer'],
    reasons: [['role', 'Infrastructure focus; wants to stay in operations.']],
    note: 'Calm under pressure in the incident exercise; infrastructure through and through.',
  },
  {
    titles: ['Junior Data Engineer', 'Data Engineer'],
    degree: 'BSc, Information Systems',
    junior: true,
    lines: [
      'Built Airflow DAGs in Python for marketing reports.',
      'Maintain Spark jobs written by a former teammate.',
      'SQL cleanup of the customer tables.',
    ],
    jobs: ['Staff Data Engineer', 'Data Engineer'],
    reasons: [['level', 'Early career; the role is staff level.']],
    note: 'Follows existing patterns well; has not designed a pipeline from scratch.',
  },
  {
    titles: ['Data Analyst', 'Senior Data Analyst'],
    degree: 'BSc, Economics',
    lines: [
      'Built the weekly revenue dashboard in Looker.',
      'Wrote SQL and Python for the churn analysis the board saw.',
      'Scheduled report refreshes with Airflow.',
    ],
    jobs: ['Staff Data Engineer', 'Analytics Engineer'],
    reasons: [['skills', 'Analysis background; has not built pipelines.']],
    note: 'Sharp with SQL and the business questions; has not built production pipelines.',
  },
  {
    titles: ['Research Assistant', 'Machine Learning Engineer'],
    degree: 'MSc, Machine Learning',
    lines: [
      'Trained ranking models in PyTorch and Spark for search.',
      'Logged training features through Kafka.',
      'Served models behind a Python FastAPI service.',
    ],
    jobs: ['Machine Learning Engineer', 'Staff Data Engineer'],
    reasons: [['role', 'Wants to stay in modeling.']],
    note: 'Strong on models and evaluation; little interest in data platform work.',
  },
  {
    titles: ['Graphic Designer', 'Marketing Designer'],
    degree: 'BFA, Graphic Design',
    lines: [
      'Designed campaign assets and landing pages in Figma for SaaS launches.',
      'Maintain the brand design system and the illustration library.',
      'Prototyping motion for launch videos in After Effects.',
    ],
    jobs: ['Founding Product Designer', 'Brand Designer'],
    reasons: [['skills', 'Marketing and brand work; no product design.']],
    note: 'Lovely visual craft; the portfolio has no product or workflow design.',
  },
  {
    titles: ['UX Designer', 'Senior UX Designer'],
    degree: 'Diploma, Interactive Design',
    lines: [
      'Wireframes and prototyping in Figma for client SaaS sites.',
      'Ran a few user research sessions per project.',
      'Contributed components to a client design system.',
    ],
    jobs: ['Founding Product Designer', 'Product Designer'],
    reasons: [['skills', 'Agency projects of a few weeks each; no product owned over time.']],
    note: 'Polished agency work; every project ended at handoff, so no sense of what shipped.',
  },
  {
    titles: ['Associate Product Manager', 'Product Manager'],
    degree: 'BCom, Management',
    lines: [
      'Ran user research and discovery interviews, and wrote PRDs for three SaaS launches.',
      'Owned the roadmap for the scheduling suite.',
      'Prototyping in Figma to test ideas with customers.',
    ],
    jobs: ['Product Manager', 'Founding Product Designer'],
    reasons: [['role', 'Product management background; not a hands-on designer or engineer.']],
    note: 'Good at framing problems; does not design or code day to day.',
  },
  {
    titles: ['Support Engineer', 'Solutions Engineer'],
    degree: 'BA, Communications',
    lines: [
      'Ran technical demos of our GraphQL API for SaaS prospects.',
      'Wrote integration guides and sample scripts in Python and Node.',
      'Triage escalations with the engineering team.',
    ],
    jobs: ['Solutions Engineer', 'Senior Product Engineer'],
    reasons: [['skills', 'Customer-facing technical role; limited production engineering.']],
    note: 'Excellent communicator with customers; light on production code.',
  },
  {
    titles: ['Security Analyst', 'Application Security Engineer'],
    degree: 'BSc, Information Security',
    lines: [
      'Run the threat modeling sessions for new features.',
      'Built the dependency scanning pipeline for 120 TypeScript and Python repositories.',
      'Led the SOC 2 evidence collection.',
    ],
    jobs: ['Security Engineer'],
    reasons: [['closed', 'Security role filled internally.']],
    note: 'Thorough and practical about risk; a security specialist.',
  },
  {
    titles: ['Android Developer', 'Senior Android Engineer'],
    degree: 'BSc, Software Engineering',
    lines: [
      'Built the booking flow in Kotlin with Jetpack Compose.',
      'Led the move to a modular Gradle build.',
      'Added a GraphQL client and fixed the top 20 crashes.',
    ],
    jobs: ['Mobile Engineer', 'Senior Product Engineer'],
    reasons: [['closed', 'Mobile hiring paused.'], ['skills', 'Android only; no web stack.']],
    note: 'Solid Android engineer who cares about users; no web work yet.',
  },
  {
    titles: ['Customer Success Manager', 'Senior Customer Success Manager'],
    degree: 'BA, Psychology',
    lines: [
      'Own renewals for 45 mid-market SaaS accounts.',
      'Ran onboarding for new customers and wrote the playbook.',
      'Bring user research from customer calls to the product team every sprint.',
    ],
    jobs: ['Customer Success Manager', 'Product Manager'],
    reasons: [['timing', 'Accepted another offer.']],
    note: 'Warm, organised and close to customers.',
  },
  {
    titles: ['Technical Writer', 'Senior Technical Writer'],
    degree: 'BA, English',
    lines: [
      'Own the public API reference, including the GraphQL schema docs.',
      'Set up docs-as-code with review from engineers.',
      'Wrote release notes for every launch.',
    ],
    jobs: ['Technical Writer'],
    reasons: [['closed', 'Writing role was not backfilled.']],
    note: 'Clear writer; understands APIs well enough to document them.',
  },
  {
    titles: ['Salesforce Administrator', 'Salesforce Developer'],
    degree: 'BCom, Information Systems',
    lines: [
      'Built Apex triggers and Flows for the sales team.',
      'Integrated the CRM with the billing system.',
      'Ran the data cleanup before the migration.',
    ],
    jobs: ['Software Engineer'],
    reasons: [['skills', 'CRM platform work; no general application development.']],
    note: 'Knows the CRM platform inside out; general engineering is thin.',
  },
  {
    titles: ['Embedded Developer', 'Firmware Engineer'],
    degree: 'BEng, Electrical Engineering',
    lines: [
      'Wrote firmware in C for battery management boards.',
      'Built the hardware-in-the-loop test rig.',
      'Cut boot time from 4 s to 900 ms.',
    ],
    jobs: ['Backend Engineer'],
    reasons: [['skills', 'Embedded background; no web services experience.']],
    note: 'Very rigorous engineer; the gap to web services is large.',
  },
];

const STAGES = ['Application review', 'Recruiter screen', 'Technical screen', 'Hiring manager screen', 'Onsite'];
const RATINGS = ['Mixed', 'Yes', 'No', 'Mixed'];
const NOTE_BY = { 'Recruiter screen': 'Recruiter', 'Technical screen': 'Senior engineer', 'Hiring manager screen': 'Hiring manager', Onsite: 'Interview panel', 'Application review': 'Recruiter' };
const REASON_DETAIL = { timing: 'Accepted another offer.', closed: 'The role was closed.' };

const ym = (year, month) => `${year}-${String(month).padStart(2, '0')}`;

function generate() {
  const used = new Set(PLANTED.map(candidate => candidate.id));
  const names = new Set(PLANTED.map(candidate => candidate.name));
  const random = rng(20261121);
  const pick = list => list[Math.floor(random() * list.length)];
  const out = [];
  for (let number = 1; number <= 92; number++) {
    const id = `C-${String(number).padStart(3, '0')}`;
    if (used.has(id)) continue;
    const archetype = ARCHETYPES[out.length % ARCHETYPES.length];
    let name;
    do name = `${pick(FIRST)} ${pick(LAST)}`;
    while (names.has(name));
    names.add(name);
    const school = pick(SCHOOLS);
    const firstYear = archetype.junior ? 2021 + Math.floor(random() * 3) : 2012 + Math.floor(random() * 10);
    const switchYear = Math.min(2024, firstYear + 1 + Math.floor(random() * (archetype.junior ? 2 : 4)));
    const orgA = pick(ORGS);
    let orgB = pick(ORGS);
    if (orgB === orgA) orgB = ORGS[(ORGS.indexOf(orgA) + 3) % ORGS.length];
    const lines = [...archetype.lines].sort(() => random() - 0.5);
    const appliedYear = Math.min(2025, Math.max(switchYear, 2022) + Math.floor(random() * 3));
    const appliedMonth = 1 + Math.floor(random() * 12);
    const stage = pick(STAGES);
    const [reason, detail] = pick(archetype.reasons);
    out.push({
      id,
      name,
      location: pick(CITIES),
      school: { name: school.name, degree: archetype.degree, prestige: school.prestige, year: firstYear },
      roles: [
        { title: archetype.titles[1], org: orgB, start: ym(switchYear, 1 + Math.floor(random() * 12)), end: null, lines: lines.slice(0, 2) },
        { title: archetype.titles[0], org: orgA, start: ym(firstYear, 1 + Math.floor(random() * 12)), end: ym(switchYear, 1), lines: lines.slice(2) },
      ],
      applications: [
        {
          job: pick(archetype.jobs),
          date: ym(appliedYear, appliedMonth),
          stage,
          reason,
          detail: detail || REASON_DETAIL[reason],
          notes: [
            {
              kind: stage === 'Application review' ? 'Recruiter screen' : stage,
              by: NOTE_BY[stage] || 'Recruiter',
              rating: pick(RATINGS),
              text: archetype.note,
            },
          ],
        },
      ],
      generated: true,
    });
  }
  return out;
}

export const CANDIDATES = [...PLANTED, ...generate()].sort((a, b) => a.id.localeCompare(b.id));

export const candidateById = id => CANDIDATES.find(candidate => candidate.id === id);

// --- Derived facts, computed in code -------------------------------------------------------

const monthIndex = value => {
  const [year, month] = String(value).split('-').map(Number);
  return year * 12 + (month - 1);
};

/** Months between two YYYY-MM values (b defaults to today). */
export const monthsBetween = (a, b = TODAY) => monthIndex(b) - monthIndex(a);

/** Years of experience at a date: the sum of role durations up to it (gaps are not counted, nor penalised). */
export function yearsAt(candidate, at = TODAY) {
  const limit = monthIndex(at);
  let months = 0;
  for (const role of candidate.roles) {
    const start = monthIndex(role.start);
    const end = Math.min(role.end ? monthIndex(role.end) + 1 : monthIndex(TODAY) + 1, limit);
    if (end > start) months += end - start;
  }
  return Math.round((months / 12) * 10) / 10;
}

export const lastApplication = candidate =>
  [...candidate.applications].sort((a, b) => monthIndex(b.date) - monthIndex(a.date))[0];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const formatMonth = value => {
  const [year, month] = String(value).split('-').map(Number);
  return `${MONTHS[month - 1]} ${year}`;
};

export const REASON_LABELS = {
  level: 'Level',
  skills: 'Skills',
  timing: 'Timing',
  comp: 'Compensation',
  role: 'Role scope',
  closed: 'Role closed',
  withdrew: 'Withdrew',
};

// --- What the models read --------------------------------------------------------------------
// Lines get stable ids (r1.. for resume lines, n1.. for interview notes). The redacted view drops
// the name (and replaces it inside notes), employer, school, location and every date, so neither
// the LLM nor the decision model can read them, and no gap can show.

export function redactText(text, candidate) {
  const words = candidate.name.split(' ');
  const tokens = [...new Set([candidate.name, words.slice(0, -1).join(' '), words[0]])].filter(Boolean);
  let out = String(text);
  for (const token of tokens) {
    out = out
      .replace(new RegExp(`^${token}(’s|'s)`, 'g'), 'The candidate’s')
      .replace(new RegExp(`^${token}\\b`, 'g'), 'The candidate')
      .replace(new RegExp(`${token}(’s|'s)`, 'g'), 'the candidate’s')
      .replace(new RegExp(`\\b${token}\\b`, 'g'), 'the candidate');
  }
  for (const role of candidate.roles) out = out.split(role.org).join('[employer]');
  return out.replace(/^the candidate/, 'The candidate');
}

/** Every line of evidence a candidate has, with ids, sources and the redacted text the models see. */
export function evidenceLines(candidate) {
  const application = lastApplication(candidate);
  const lines = [];
  let r = 0;
  for (const role of candidate.roles) {
    const fresh = application && monthIndex(role.start) > monthIndex(application.date);
    for (const text of role.lines) {
      r += 1;
      lines.push({
        id: `r${r}`,
        source: 'resume',
        label: `${role.title}${role.end ? '' : ', current'}`,
        fresh,
        text: redactText(text, candidate),
      });
    }
  }
  let n = 0;
  for (const app of candidate.applications) {
    for (const note of app.notes) {
      n += 1;
      lines.push({
        id: `n${n}`,
        source: 'note',
        label: `${note.kind} · ${note.rating}`,
        when: app.date,
        text: redactText(note.text, candidate),
      });
    }
  }
  return lines;
}

/** The redacted profile as plain text, for prompts and for the page's "what the model read" view. */
export function redactedProfile(candidate) {
  const application = lastApplication(candidate);
  const lines = evidenceLines(candidate);
  const years = yearsAt(candidate);
  const out = [`${candidate.id} · ${years} yrs experience`];
  let r = 0;
  for (const role of candidate.roles) {
    const months = monthsBetween(role.start, role.end || TODAY) + 1;
    const fresh = application && monthIndex(role.start) > monthIndex(application.date);
    out.push(`Role: ${role.title} (${Math.round((months / 12) * 10) / 10} yrs${role.end ? '' : ', current'}${fresh ? ', new since last application' : ''})`);
    for (let index = 0; index < role.lines.length; index++) {
      const line = lines[r++];
      out.push(`[${line.id}] ${line.text}`);
    }
  }
  if (application) {
    out.push(
      `Last application: ${application.job}, ${monthsBetween(application.date)} months ago, reached ${application.stage}; passed on for ${REASON_LABELS[application.reason] || application.reason}: ${redactText(application.detail, candidate)}`
    );
  }
  for (const line of lines.filter(item => item.source === 'note')) out.push(`[${line.id}] ${line.label}: ${line.text}`);
  return out.join('\n');
}

/** Fields the ranking never reads; the page lists them and the invariance checks permute them. */
export const IGNORED_FIELDS = [
  { id: 'name', label: 'Name', why: 'replaced in notes too' },
  { id: 'school', label: 'School and its prestige', why: 'never sent to a model' },
  { id: 'year', label: 'Graduation year', why: 'an age proxy' },
  { id: 'gaps', label: 'Gaps between jobs', why: 'no dates are sent' },
  { id: 'employer', label: 'Employer names', why: 'brand is not skill' },
  { id: 'location', label: 'Location', why: 'every role here is remote' },
];

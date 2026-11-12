To edit info go to
`src/layouts/Home/AllInfo.js`

For profile go to
`src/layouts/Home/Profile.js`

When making new component make sure to wrap in `<Section>` from `import { Section } from 'components/Section';`
and for navbar: `src/components/Navbar/navData.js`


credit - hamishw.com


## Deploys

Hosted on Vercel (project linked to this repo). Every push to `main` deploys to haiderb.com;
other branches get preview URLs. `npm run build` is a normal `next build`; `npm run export`
still produces a static copy in `build/` if you ever need one.

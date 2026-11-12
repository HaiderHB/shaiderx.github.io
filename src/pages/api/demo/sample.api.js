// Reference demo API route: POST /api/demo/sample/
// It calls no paid model (cost: COST.free), so it needs no demo key. A real demo route
// sets a cost, which makes the guard require the visitor's key and count the budget:
//   export default demoApi(handler, { cost: COST.llm })
import { COST, demoApi, startStream } from 'demos/api';

export const config = { api: { bodyParser: { sizeLimit: '100kb' } } };

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export default demoApi(async (req, res) => {
  const message = String(req.body?.message || '').slice(0, 2000);
  const order = message.match(/#\d+/)?.[0] || 'the order';
  const stream = startStream(res);

  const steps = [
    'Step 1 · classify: damaged item, replacement requested, deadline Friday\n',
    `Step 2 · tool call: lookup_order(${order}) → shipped, eligible for replacement\n`,
    'Step 3 · tool call: create_replacement(express) → arrives Thursday\n\n',
    `Draft reply:\nSorry ${order} arrived damaged. I've sent a replacement by express shipping, so it should reach you Thursday, ahead of your Friday deadline. No need to return the damaged one.`,
  ];

  for (const step of steps) {
    for (const word of step.split(/(?<= )/)) {
      stream.write(word);
      await sleep(25);
    }
  }
  stream.end();
}, { cost: COST.free });

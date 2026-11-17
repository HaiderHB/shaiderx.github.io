// POST /api/demo/truss/ledger/  { session } -> { charges, requests }: this session's payments and
// every request /pay received (charged, replayed, refused), oldest first. No model calls: free.
import { COST, demoApi } from 'demos/api';
import { readLedger } from 'pages/demo/truss/payments';
import { readSession, store } from './server';

export const config = { api: { bodyParser: { sizeLimit: '1kb' } } };

export default demoApi(
  async (req, res) => {
    const session = readSession(req.body?.session);
    if (!session) return res.status(400).json({ error: 'bad_request', message: 'Missing session.' });
    res.status(200).json(await readLedger(store, session));
  },
  { cost: COST.free, requireKey: true }
);

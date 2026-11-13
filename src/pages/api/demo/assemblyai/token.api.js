// POST /api/demo/assemblyai/token/ -> { token }
// Mints a short-lived, streaming-only AssemblyAI token for the live captions button.
// Only works when ASSEMBLYAI_API_KEY is set; the page hides the button otherwise.
import { COST, demoApi } from 'demos/api';

export const config = { api: { bodyParser: { sizeLimit: '1kb' } } };

const TOKEN_URL = () => process.env.ASSEMBLYAI_TOKEN_URL || 'https://token.assemblyai.com/v1/token';

export default demoApi(
  async (req, res) => {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      return res
        .status(503)
        .json({ error: 'Live captions are off: no AssemblyAI key is configured.', code: 'no_assemblyai_key' });
    }

    const response = await fetch(TOKEN_URL(), {
      method: 'POST',
      headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product: 'streaming',
        expires_in_seconds: 60,
        max_session_duration_seconds: 120,
        access: {
          tts: { enabled: false },
          speech_to_speech: { enabled: false },
          llm_gateway: { enabled: false },
          sync: { enabled: false },
          dictation: { enabled: false },
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error('[assemblyai token]', response.status, body.slice(0, 300));
      return res.status(502).json({ error: 'AssemblyAI did not issue a token. Try again in a minute.', code: 'token' });
    }

    const { token } = await response.json();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ token });
  },
  { cost: COST.voice }
);

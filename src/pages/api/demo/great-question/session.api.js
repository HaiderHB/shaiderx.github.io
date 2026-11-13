// POST /api/demo/great-question/session/
// Mints a short-lived OpenAI Realtime client secret for one voice interview. The whole
// session (model, moderator instructions, voice, transcription, turn detection) is fixed
// here on the server; the browser only gets the ephemeral secret and the SDP endpoint.
// Docs: https://developers.openai.com/api/docs/guides/voice-webrtc?voice-api=realtime
import crypto from 'crypto';
import { COST, demoApi, requireEnv } from 'demos/api';
import {
  MAX_VOICE_SECONDS,
  moderatorInstructions,
} from 'pages/demo/great-question/study';

export const config = { api: { bodyParser: { sizeLimit: '2kb' } } };

const OPENAI_URL = () => process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

// The secret only needs to live long enough for the browser's SDP exchange. The interview
// itself is capped at MAX_VOICE_SECONDS by the page, and billed up front below.
const SECRET_TTL_SECONDS = 60;

export default demoApi(
  async (req, res, { ip, key }) => {
    const model = process.env.DEMO_REALTIME_MODEL || 'gpt-realtime-2.1';
    const session = {
      type: 'realtime',
      model,
      instructions: moderatorInstructions('voice'),
      output_modalities: ['audio'],
      audio: {
        input: {
          transcription: {
            model: process.env.DEMO_TRANSCRIBE_MODEL || 'gpt-live-transcribe',
          },
          // Server VAD with a longer silence window: participants pause to think mid-answer.
          turn_detection: {
            type: 'server_vad',
            threshold: 0.55,
            prefix_padding_ms: 300,
            silence_duration_ms: 800,
            create_response: true,
            interrupt_response: true,
          },
          noise_reduction: { type: 'near_field' },
        },
        output: { voice: process.env.DEMO_REALTIME_VOICE || 'marin' },
      },
    };

    const safetyId = crypto
      .createHash('sha256')
      .update(`${key?.id || 'nokey'}:${ip}`)
      .digest('hex')
      .slice(0, 32);

    const response = await fetch(`${OPENAI_URL()}/realtime/client_secrets`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${requireEnv('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
        'OpenAI-Safety-Identifier': safetyId,
      },
      body: JSON.stringify({
        expires_after: { anchor: 'created_at', seconds: SECRET_TTL_SECONDS },
        session,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error('[great-question/session]', response.status, body.slice(0, 400));
      return res
        .status(502)
        .json({
          error: 'The voice service did not start a session. Try "Type instead".',
          code: 'upstream',
        });
    }

    const data = await response.json();
    const clientSecret = data.value || data.client_secret?.value;
    if (!clientSecret) throw new Error('No client secret in the Realtime response');

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      clientSecret,
      expiresAt: data.expires_at || data.client_secret?.expires_at || null,
      callsUrl: `${OPENAI_URL()}/realtime/calls`,
      model,
      maxSeconds: MAX_VOICE_SECONDS,
    });
  },
  // Billed for the full capped interview when the secret is minted.
  { cost: COST.realtimeMinute * Math.ceil(MAX_VOICE_SECONDS / 60) }
);

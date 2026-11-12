// Browser helpers for demo pages. Every request carries the visitor's demo key
// (from ?k= in the link, kept for the tab session) in the x-demo-key header.
// Keep the trailing slash on API paths (this site uses trailingSlash: true).

export function getDemoKey() {
  if (typeof window === 'undefined') return null;
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('k');
    if (fromUrl) sessionStorage.setItem('demoKey', fromUrl);
    return fromUrl || sessionStorage.getItem('demoKey');
  } catch {
    return new URLSearchParams(window.location.search).get('k');
  }
}

async function request(path, body) {
  const key = getDemoKey();
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(key && { 'x-demo-key': key }) },
    body: JSON.stringify(body ?? {}),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.code = data.code;
    throw error;
  }
  return response;
}

/** POSTs JSON and returns the JSON reply. */
export async function postJson(path, body) {
  return (await request(path, body)).json();
}

/** POSTs JSON and streams the text reply into onChunk(chunk, fullTextSoFar). */
export async function streamFromApi(path, body, onChunk) {
  const response = await request(path, body);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    text += chunk;
    onChunk?.(chunk, text);
  }

  return text;
}

/** Polls a job-status route ({ jobId } -> { status, result }) until it is done. */
export async function pollJob(path, jobId, { intervalMs = 2000, timeoutMs = 300_000, onStatus } = {}) {
  const started = Date.now();
  for (;;) {
    const job = await postJson(path, { jobId });
    onStatus?.(job.status);
    if (job.status === 'done') return job.result;
    if (job.status === 'failed' || job.status === 'unknown') throw new Error('Generation failed.');
    if (Date.now() - started > timeoutMs) throw new Error('Generation is taking too long.');
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
}

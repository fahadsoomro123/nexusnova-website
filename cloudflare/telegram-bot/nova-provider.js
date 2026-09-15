const DEFAULT_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'];

export async function askGemini(prompt, env) {
  const key = String(env.GEMINI_API_KEY || '').trim();
  if (!key) return { ok: false, code: 'provider-not-configured' };

  const configured = String(env.GEMINI_MODEL || '').trim();
  const models = [...new Set([configured, ...DEFAULT_MODELS].filter(Boolean))];
  let lastCode = 'provider-failed';

  for (const model of models) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1200 }
        })
      });
      if (!response.ok) {
        lastCode = response.status === 429 || response.status >= 500 ? 'provider-retryable' : `provider-http-${response.status}`;
        if (response.status === 400 || response.status === 401 || response.status === 403 || response.status === 404) continue;
        continue;
      }
      const payload = await response.json();
      const answer = (payload.candidates || [])
        .flatMap(candidate => candidate.content?.parts || [])
        .filter(part => part.thought !== true && typeof part.text === 'string')
        .map(part => part.text)
        .join('\n')
        .trim();
      if (answer) return { ok: true, provider: 'gemini', model, answer };
      lastCode = 'provider-empty';
    } catch (_) {
      lastCode = 'provider-network';
    }
  }
  return { ok: false, code: lastCode };
}

export function providerStatus(env) {
  return {
    gemini: Boolean(String(env.GEMINI_API_KEY || '').trim()),
    openai: Boolean(String(env.OPENAI_API_KEY || '').trim())
  };
}

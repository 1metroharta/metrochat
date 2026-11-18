const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');

initializeApp();
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

exports.metroAi = onCall({
  region: 'europe-west1',
  secrets: [OPENAI_API_KEY],
  maxInstances: 10,
  timeoutSeconds: 60,
  memory: '256MiB'
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Войдите в MetroChat.');
  const data = request.data || {};
  const instructions = String(data.instructions || 'Ты — Metro AI. Отвечай на языке пользователя.').slice(0, 5000);
  if (!Array.isArray(data.messages) || data.messages.length < 1 || data.messages.length > 16) {
    throw new HttpsError('invalid-argument', 'Некорректная история диалога.');
  }
  const messages = data.messages.map((item) => {
    const role = item && (item.role === 'assistant' ? 'assistant' : 'user');
    const content = String(item && item.content || '').slice(0, 5000);
    return { role, content };
  });
  const totalChars = messages.reduce((n, item) => n + item.content.length, 0);
  if (totalChars > 24000) throw new HttpsError('invalid-argument', 'Слишком длинный запрос.');

  let response;
  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY.value()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-6.2-sol',
        instructions,
        input: messages,
        reasoning: { effort: 'low' },
        max_output_tokens: 700
      })
    });
  } catch (error) {
    console.error('OpenAI network error:', error);
    throw new HttpsError('unavailable', 'AI-сервис временно недоступен.');
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('OpenAI response error:', response.status, payload && payload.error && payload.error.message);
    throw new HttpsError('unavailable', 'Не удалось получить ответ AI. Проверьте ключ и доступность модели.');
  }
  const outputText = Array.isArray(payload.output)
    ? payload.output.flatMap((item) => Array.isArray(item && item.content) ? item.content : [])
        .filter((item) => item && item.type === 'output_text')
        .map((item) => String(item.text || '')).join('\n')
    : '';
  const text = String(payload.output_text || outputText).trim();
  if (!text) throw new HttpsError('unavailable', 'AI вернул пустой ответ.');
  return { text };
});

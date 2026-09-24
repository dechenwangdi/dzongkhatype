export const feedbackEndpoint = import.meta.env.VITE_FEEDBACK_ENDPOINT?.trim() ?? '';

export function validFeedbackEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch { return false; }
}

export async function sendFeedback(message: string, endpoint = feedbackEndpoint): Promise<void> {
  if (!validFeedbackEndpoint(endpoint)) throw new Error('Feedback is not configured yet. Please try again later.');
  const trimmed = message.trim();
  if (!trimmed || trimmed.length > 2000) throw new Error('Please enter feedback between 1 and 2,000 characters.');
  const response = await fetch(endpoint, {
    method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ message: trimmed }), signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('Feedback could not be sent. Please try again.');
}

export const feedbackEndpoint = import.meta.env.VITE_FEEDBACK_ENDPOINT?.trim() ?? '';

/**
 * Where feedback goes. VITE_FEEDBACK_ENDPOINT is either:
 * - a Google Form pre-filled link (…/forms/d/e/<id>/viewform?…&entry.<n>=…):
 *   the message is posted to that form's formResponse URL as field entry.<n>; or
 * - any other public HTTPS URL accepting JSON { "message": "..." }.
 */
export type FeedbackTarget =
  | { kind: 'json'; url: string }
  | { kind: 'google-form'; url: string; field: string };

export function feedbackTarget(endpoint: string): FeedbackTarget | null {
  let url: URL;
  try { url = new URL(endpoint); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  if (url.hostname === 'docs.google.com') {
    const form = url.pathname.match(/^\/forms\/d\/e\/([\w-]+)\/(?:viewform|formResponse)\/?$/);
    const field = [...url.searchParams.keys()].find(key => /^entry\.\d+$/.test(key));
    if (!form || !field) return null;
    return { kind: 'google-form', url: `https://docs.google.com/forms/d/e/${form[1]}/formResponse`, field };
  }
  return { kind: 'json', url: url.href };
}

export function validFeedbackEndpoint(endpoint: string): boolean {
  return feedbackTarget(endpoint) !== null;
}

export async function sendFeedback(message: string, endpoint = feedbackEndpoint): Promise<void> {
  const target = feedbackTarget(endpoint);
  if (!target) throw new Error('Feedback is not configured yet. Please try again later.');
  const trimmed = message.trim();
  if (!trimmed || trimmed.length > 2000) throw new Error('Please enter feedback between 1 and 2,000 characters.');
  const common = { method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(15000) } as const;
  if (target.kind === 'google-form') {
    // Google Forms does not send CORS headers, so the reply is unreadable
    // ("no-cors"). A network failure still rejects; otherwise Google received it.
    await fetch(target.url, { ...common, mode: 'no-cors', body: new URLSearchParams({ [target.field]: trimmed }) });
    return;
  }
  const response = await fetch(target.url, {
    ...common,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ message: trimmed }),
  });
  if (!response.ok) throw new Error('Feedback could not be sent. Please try again.');
}

import { useState, type FormEvent } from 'react';
import { feedbackEndpoint, sendFeedback, validFeedbackEndpoint } from './feedback';

export function FeedbackForm() {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const configured = validFeedbackEndpoint(feedbackEndpoint);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setStatus('');
    try { await sendFeedback(message); setMessage(''); setStatus('Thank you for your feedback.'); }
    catch (cause) { setError(cause instanceof Error && cause.name !== 'TypeError' && cause.name !== 'TimeoutError' ? cause.message : 'Unable to send feedback. Please check your connection and try again.'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit}>
    <p className="mb-4 text-sm text-[var(--muted-foreground)]">Share a suggestion or report a problem. Please leave out personal information. Only your message is sent.</p>
    {!configured && <p role="status" className="mb-4 text-sm">Feedback is not available yet. You can continue typing practice.</p>}
    <label htmlFor="feedback-message" className="block text-sm font-bold">Your feedback</label>
    <textarea id="feedback-message" value={message} onChange={event=>setMessage(event.target.value)} required maxLength={2000} rows={5} disabled={busy} className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-[var(--foreground)]"/>
    <p className="text-right text-xs text-[var(--muted-foreground)]">{message.length}/2000</p>
    {error && <p role="alert" className="my-3 text-sm text-[var(--destructive)]">{error}</p>}
    {status && <p role="status" className="my-3 text-sm">{status}</p>}
    <button disabled={!configured || busy || !message.trim()} className="mt-3 rounded-lg bg-[var(--primary)] px-4 py-2 font-bold text-[var(--primary-foreground)]">{busy ? 'Sending…' : 'Send feedback'}</button>
  </form>;
}

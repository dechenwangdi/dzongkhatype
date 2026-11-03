import { useEffect, useState } from 'react';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}
type IOSNavigator = Navigator & { standalone?: boolean };
export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as IOSNavigator).standalone === true;
}

// The browser's install offer can arrive before React renders. Capture it as
// soon as this module loads so the Install button can use it straight away.
let earlyPrompt: InstallPromptEvent | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); earlyPrompt = event as InstallPromptEvent; });
}

/**
 * One-click install through the browser's own install prompt (Chrome, Edge,
 * Android browsers). Browsers without that prompt (Safari, Firefox) cannot be
 * installed from a page, so the button is offered only when a prompt exists.
 * Installation is confirmed only by appinstalled or standalone display mode.
 */
export function usePwaInstall() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(() => earlyPrompt);
  const [installed, setInstalled] = useState(isStandalone);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const beforeInstall = (event: Event) => { event.preventDefault(); earlyPrompt = event as InstallPromptEvent; setPromptEvent(earlyPrompt); };
    const appInstalled = () => { earlyPrompt = null; setInstalled(true); setPromptEvent(null); setBusy(false); setMessage('Dzongkha Typing has been installed.'); };
    const display = window.matchMedia('(display-mode: standalone)');
    const displayChanged = () => { if (isStandalone()) { setInstalled(true); setPromptEvent(null); } };
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', appInstalled);
    display.addEventListener('change', displayChanged);
    return () => { window.removeEventListener('beforeinstallprompt', beforeInstall); window.removeEventListener('appinstalled', appInstalled); display.removeEventListener('change', displayChanged); };
  }, []);
  async function install() {
    if (installed || busy || !promptEvent) return;
    setBusy(true); setMessage('');
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
      // Only appinstalled or standalone mode confirms successful installation.
    } catch { /* The browser refused to show its prompt; the button hides below. */ }
    finally { earlyPrompt = null; setPromptEvent(null); setBusy(false); }
  }
  return { installed, busy, message, dismissMessage: () => setMessage(''), install,
    canInstall: !installed && !busy && promptEvent !== null };
}

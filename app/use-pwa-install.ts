import { useEffect, useState } from 'react';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}
type IOSNavigator = Navigator & { standalone?: boolean };
export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as IOSNavigator).standalone === true;
}
export function usePwaInstall() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const iosSafari = (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
    && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);
  useEffect(() => {
    const beforeInstall = (event: Event) => { event.preventDefault(); setPromptEvent(event as InstallPromptEvent); setMessage(''); };
    const appInstalled = () => { setInstalled(true); setPromptEvent(null); setBusy(false); setMessage('Dzongkha Typing has been installed.'); };
    const display = window.matchMedia('(display-mode: standalone)');
    const displayChanged = () => { if (isStandalone()) { setInstalled(true); setPromptEvent(null); } };
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', appInstalled);
    display.addEventListener('change', displayChanged);
    return () => { window.removeEventListener('beforeinstallprompt', beforeInstall); window.removeEventListener('appinstalled', appInstalled); display.removeEventListener('change', displayChanged); };
  }, []);
  async function install() {
    if (installed || busy) return;
    if (iosSafari && !promptEvent) { setMessage('To install: tap Share, then Add to Home Screen.'); return; }
    if (!promptEvent) return;
    setBusy(true); setMessage('');
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'dismissed') setMessage('Installation was cancelled. You can keep practising here.');
      // Only appinstalled or standalone mode confirms successful installation.
    } catch { setMessage('Installation is not available right now. You can keep practising here.'); }
    finally { setPromptEvent(null); setBusy(false); }
  }
  return { installed, busy, message, dismissMessage: () => setMessage(''), install,
    canInstall: !installed && !busy && (promptEvent !== null || iosSafari), iosSafari };
}

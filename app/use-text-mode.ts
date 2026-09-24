import { useState } from 'react';
import { readTextMode, TEXT_MODE_KEY, type TextMode } from './typing-content';

export function useTextMode() {
  const [mode, setMode] = useState<TextMode>(() => { try { return readTextMode(localStorage); } catch { return 'sequential'; } });
  const [modeWarning, setWarning] = useState('');
  function changeMode(next: TextMode) {
    setMode(next);
    try { localStorage.setItem(TEXT_MODE_KEY, next); setWarning(''); }
    catch { setWarning('Text selection changes cannot be saved on this device.'); }
  }
  return { mode, changeMode, modeWarning };
}

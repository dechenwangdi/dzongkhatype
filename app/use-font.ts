import { useLayoutEffect, useState } from 'react';

export const FONT_KEY = 'dzongkha_typing_font';
export type DzongkhaFont = 'joyig' | 'tsuyig';
export function readFont(storage: Storage): DzongkhaFont {
  return storage.getItem(FONT_KEY) === 'tsuyig' ? 'tsuyig' : 'joyig';
}

export function useFont() {
  const [font, setFont] = useState<DzongkhaFont>(() => {
    try { return readFont(localStorage); } catch { return 'joyig'; }
  });
  const [fontWarning, setWarning] = useState('');
  useLayoutEffect(() => {
    document.documentElement.dataset.font = font;
    try { localStorage.setItem(FONT_KEY, font); setWarning(''); }
    catch { setWarning('Font changes cannot be saved on this device.'); }
  }, [font]);
  return { font, setFont, fontWarning };
}

import { useLayoutEffect, useState } from 'react';
export const THEME_KEY = 'dzongkha_typing_theme';
export type Theme = 'light' | 'dark' | 'bhutan';
export function readTheme(storage: Storage): Theme {
  const value = storage.getItem(THEME_KEY);
  return value === 'light' || value === 'dark' || value === 'bhutan' ? value : 'bhutan';
}
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => { try { return readTheme(localStorage); } catch { return 'bhutan'; } });
  const [themeWarning, setWarning] = useState('');
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'bhutan' ? '#944312' : theme === 'light' ? '#f5f3ed' : '#202224');
    try { localStorage.setItem(THEME_KEY, theme); setWarning(''); }
    catch { setWarning('Theme changes cannot be saved on this device.'); }
  }, [theme]);
  return { theme, setTheme, themeWarning };
}

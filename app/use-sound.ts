import { useRef, useState } from 'react';

export const SOUND_KEY = 'dzongkha_typing_sound';
export type KeySound = 'correct' | 'wrong';

export function readSound(storage: Storage): boolean {
  return storage.getItem(SOUND_KEY) !== 'off';
}

/**
 * Key-press sounds synthesised with the Web Audio API: no audio files, so they
 * work offline and add nothing to the bundle. The context is created on the
 * first key press, which satisfies browser autoplay rules.
 */
export function useSound() {
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    try { return readSound(localStorage); } catch { return true; }
  });
  const [soundWarning, setWarning] = useState('');
  const context = useRef<AudioContext | null>(null);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    try { localStorage.setItem(SOUND_KEY, next ? 'on' : 'off'); setWarning(''); }
    catch { setWarning('Sound changes cannot be saved on this device.'); }
  }

  function play(kind: KeySound) {
    if (!soundOn) return;
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = context.current ??= new Ctx();
      if (ctx.state === 'suspended') void ctx.resume();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      // Correct: a short, soft high tick. Wrong: a lower, longer buzz.
      const [type, from, to, length, volume]: [OscillatorType, number, number, number, number] =
        kind === 'correct' ? ['triangle', 1500, 900, 0.045, 0.08] : ['square', 190, 120, 0.14, 0.05];
      osc.type = type;
      osc.frequency.setValueAtTime(from, now);
      osc.frequency.exponentialRampToValueAtTime(to, now + length);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + length + 0.02);
    } catch { /* Audio is optional; typing must never fail because of it. */ }
  }

  return { soundOn, toggleSound, play, soundWarning };
}

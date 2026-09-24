import { useRef, useState } from 'react';
import { addSession, emptyProgress, newId, PROGRESS_KEY, readProgress, type Progress, type TypingSession } from './progress-storage';
export function useTypingProgress() {
  const [initial] = useState(() => {
    try { return { progress: readProgress(localStorage), warning: '' }; }
    catch { return { progress: emptyProgress(`dz_user_${newId()}`), warning: 'Device storage is unavailable. Progress will last only while this page is open.' }; }
  });
  const [progress, setProgress] = useState(initial.progress);
  const [storageWarning, setWarning] = useState(initial.warning);
  const current = useRef(progress);
  function persist(next: Progress) {
    current.current = next; setProgress(next);
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(next)); setWarning(''); }
    catch { setWarning('Progress could not be saved on this device. Check browser storage settings.'); }
  }
  return { progress, storageWarning,
    saveSession(session: TypingSession) { persist(addSession(current.current, session)); },
    saveLevel(level: Progress['currentLevel']) { persist({ ...current.current, currentLevel: level }); },
    resetProgress() { persist(emptyProgress(current.current.userId, current.current.currentLevel)); },
  };
}

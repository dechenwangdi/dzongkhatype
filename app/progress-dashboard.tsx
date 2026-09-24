import { useState } from 'react';
import type { Progress } from './progress-storage';
import { TEST_DURATION_SECONDS } from '../shared/typing-config';
export function ProgressDashboard({ progress, reset }: { progress: Progress; reset: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const stats = [ ['Tests Completed', progress.totalTests], ['Best WPM', progress.bestWpm],
    ['Average WPM', Math.round(progress.averageWpm)], ['Average Accuracy', `${Math.round(progress.averageAccuracy)}%`],
    ['Best Accuracy', `${progress.bestAccuracy}%`],
    ['Total Words Typed', progress.totalWordsTyped], ['Total Typing Time', `${Math.floor(progress.totalTypingTimeSeconds / 60)}m ${Math.floor(progress.totalTypingTimeSeconds % 60)}s`],
    ['Current Level', progress.currentLevel] ];
  return <>
    <p className="mb-4 text-sm text-[var(--muted-foreground)]">Your progress is stored on this device.</p>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{stats.map(([label, value]) => <div key={label} className="rounded-lg bg-[var(--secondary)] p-3"><span className="block text-xs text-[var(--muted-foreground)]">{label}</span><b className="text-lg capitalize">{value}</b></div>)}</div>
    <p className="my-3 text-xs text-[var(--muted-foreground)]">Best WPM uses completed {TEST_DURATION_SECONDS}-second tests. Averages include saved unfinished attempts. Words count groups separated by Tibetan punctuation or spaces.</p>
    <h3 className="my-3 font-bold">Recent sessions</h3>
    {progress.sessions.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Date</th><th>Difficulty</th><th>WPM</th><th>Accuracy</th></tr></thead><tbody>{progress.sessions.map(session => <tr key={session.id} className="border-b border-[var(--border)]"><td className="py-2">{new Date(session.date).toLocaleString()}<small className="block text-[var(--muted-foreground)]">{session.completed ? 'Completed' : 'Unfinished'}</small></td><td className="capitalize">{session.level}</td><td>{session.wpm}</td><td>{session.accuracy}%</td></tr>)}</tbody></table></div> : <p className="py-4 text-sm">Start typing to build your progress.</p>}
    {confirm ? <div role="alertdialog" aria-label="Reset Progress" aria-describedby="reset-description" className="mt-4 rounded-lg border border-[var(--border)] p-3"><p id="reset-description">Are you sure you want to reset your typing progress? This cannot be undone.</p><div className="mt-2 flex gap-2"><button autoFocus className="tool" onClick={() => setConfirm(false)}>Cancel</button><button className="tool" onClick={() => { reset(); setConfirm(false); }}>Confirm reset</button></div></div> : <button className="tool mt-4" onClick={() => setConfirm(true)}>Reset Progress</button>}
  </>;
}

import { z } from 'zod';
import { metrics } from '../shared/metrics';
import { TEST_DURATION_SECONDS } from '../shared/typing-config';
export const USER_KEY = 'dzongkha_typing_user_id';
export const PROGRESS_KEY = 'dzongkha_typing_progress';
const count = z.number().finite().nonnegative();
const level = z.enum(['beginner', 'intermediate', 'expert']);
const sessionSchema = z.object({ id: z.string(), date: z.string().datetime(), level,
  wpm: count, accuracy: count.max(100), correctCharacters: count, incorrectCharacters: count,
  totalCharacters: count, durationSeconds: count.max(TEST_DURATION_SECONDS), completed: z.boolean(), wordsTyped: count });
const progressSchema = z.object({ userId: z.string(), totalTests: count, totalWordsTyped: count,
  totalCharactersTyped: count, totalTypingTimeSeconds: count, averageWpm: count, bestWpm: count,
  averageAccuracy: count.max(100), bestAccuracy: count.max(100), currentLevel: level,
  recordedSessions: count, sessions: z.array(sessionSchema).max(100) });
export type TypingSession = z.infer<typeof sessionSchema>;
export type Progress = z.infer<typeof progressSchema>;
export function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}
export function emptyProgress(userId: string, currentLevel: Progress['currentLevel'] = 'beginner'): Progress {
  return { userId, totalTests: 0, totalWordsTyped: 0, totalCharactersTyped: 0,
    totalTypingTimeSeconds: 0, averageWpm: 0, bestWpm: 0, averageAccuracy: 0,
    bestAccuracy: 0, currentLevel, recordedSessions: 0, sessions: [] };
}
export function readProgress(storage: Storage): Progress {
  let userId = storage.getItem(USER_KEY);
  if (!userId) { userId = `dz_user_${newId()}`; storage.setItem(USER_KEY, userId); }
  try {
    const parsed = progressSchema.safeParse(JSON.parse(storage.getItem(PROGRESS_KEY) ?? 'null'));
    if (parsed.success && parsed.data.userId === userId) return parsed.data;
  } catch { /* Corrupt data must not prevent practice. */ }
  return emptyProgress(userId);
}
export function addSession(progress: Progress, session: TypingSession): Progress {
  if (!session.totalCharacters || !session.durationSeconds) return progress;
  const old = progress.sessions.find(item => item.id === session.id);
  const n = progress.recordedSessions + (old ? 0 : 1);
  return { ...progress, sessions: [session, ...progress.sessions.filter(item => item.id !== session.id)].slice(0, 100), recordedSessions: n,
    totalTests: progress.totalTests + Number(session.completed) - Number(old?.completed ?? false),
    totalWordsTyped: progress.totalWordsTyped + session.wordsTyped - (old?.wordsTyped ?? 0),
    totalCharactersTyped: progress.totalCharactersTyped + session.totalCharacters - (old?.totalCharacters ?? 0),
    totalTypingTimeSeconds: progress.totalTypingTimeSeconds + session.durationSeconds - (old?.durationSeconds ?? 0),
    averageWpm: (progress.averageWpm * progress.recordedSessions + session.wpm - (old?.wpm ?? 0)) / n,
    averageAccuracy: (progress.averageAccuracy * progress.recordedSessions + session.accuracy - (old?.accuracy ?? 0)) / n,
    bestWpm: Math.max(progress.bestWpm, session.completed ? session.wpm : 0),
    bestAccuracy: Math.max(progress.bestAccuracy, session.completed ? session.accuracy : 0),
  };
}
export function makeSession(input: Omit<TypingSession, 'wpm' | 'accuracy' | 'totalCharacters'>): TypingSession {
  return { ...input, ...metrics(input.correctCharacters, input.incorrectCharacters, input.durationSeconds),
    totalCharacters: input.correctCharacters + input.incorrectCharacters };
}

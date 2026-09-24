import { z } from 'zod';
import data from './data/dzongkha-texts.json';
import type { Level } from './typing-core';

const passageSchema = z.object({ id: z.string().min(1), text: z.string().refine(text => text.trim().length > 0, 'Passages must not be empty') });
const passagesSchema = z.array(passageSchema).min(1).refine(items => new Set(items.map(item => item.id)).size === items.length, 'Passage IDs must be unique within a level');
export const content = z.object({ beginner: passagesSchema, intermediate: passagesSchema, expert: passagesSchema }).parse(data);
export const practice: Record<Level, string[]> = {
  beginner: content.beginner.map(item => item.text.normalize('NFC')),
  intermediate: content.intermediate.map(item => item.text.normalize('NFC')),
  expert: content.expert.map(item => item.text.normalize('NFC')),
};
export const TEXT_MODE_KEY = 'dzongkha_typing_text_mode';
export type TextMode = 'sequential' | 'random';
export function readTextMode(storage: Storage): TextMode {
  return storage.getItem(TEXT_MODE_KEY) === 'random' ? 'random' : 'sequential';
}
export function selectPassage(length: number, current: number, mode: TextMode, random = Math.random): number {
  if (length <= 1) return 0;
  if (mode === 'sequential') return (current + 1) % length;
  if (current < 0 || current >= length) return Math.floor(random() * length);
  const choice = Math.floor(random() * (length - 1));
  return choice >= current ? choice + 1 : choice;
}

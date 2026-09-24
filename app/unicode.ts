const segmenter = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter('bo', { granularity: 'grapheme' })
  : null;

export const normalizeText = (value: string) => value.normalize('NFC');

// Code points are useful for individual key guidance and deleting one mark.
// They are not visible characters and must not be used for scoring/rendering.
export const points = (value: string) => Array.from(normalizeText(value));

// Tibetan subjoined letters and vowel signs are Unicode marks. Keep them with
// their base on browsers without Segmenter. This is a Tibetan-focused fallback,
// not a complete implementation of Unicode segmentation for every script.
export function fallbackGraphemes(value: string): string[] {
  const result: string[] = [];
  for (const point of points(value)) {
    if (result.length && (/\p{Mark}/u.test(point) || point === '\u200d' || result[result.length - 1].endsWith('\u200d'))) {
      result[result.length - 1] += point;
    } else {
      result.push(point);
    }
  }
  return result;
}

export function graphemes(value: string): string[] {
  const normalized = normalizeText(value);
  return segmenter
    ? Array.from(segmenter.segment(normalized), item => item.segment)
    : fallbackGraphemes(normalized);
}

export function limitInput(value: string, target: string): string {
  // Never cut a committed IME stack in the middle, including its final marks.
  return graphemes(value).slice(0, graphemes(target).length).join('');
}

export function usesNativeTextInput(key: string): boolean {
  // Detection only, not sanitisation: let the browser insert native Unicode,
  // dead-key and IME text instead of translating its physical key a second time.
  return /[^\u0000-\u007f]/u.test(key) || ['Process', 'Dead', 'Unidentified'].includes(key);
}

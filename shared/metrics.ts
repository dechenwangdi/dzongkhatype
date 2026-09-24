export function metrics(correct: number, incorrect: number, seconds: number) {
 return { wpm: Math.round(correct / 5 / Math.max(seconds / 60, 1 / 60)), accuracy: correct + incorrect ? Math.round(correct / (correct + incorrect) * 100) : 100 };
}

export type Finger =
  | "left-pinky" | "left-ring" | "left-middle" | "left-index"
  | "right-index" | "right-middle" | "right-ring" | "right-pinky"
  | "thumb";

/** How a key press was judged: green for correct, red for wrong, neutral for Backspace, Tab etc. */
export type PressResult = "correct" | "wrong" | "neutral";

/**
 * Standard touch-typing finger for each physical key, keyed like typing-core
 * `latin` (and physicalKey()). The characters themselves always come from the
 * fixed standard Dzongkha layout in typing-core.ts.
 */
export const fingers: Record<string, Finger> = {
  "`": "left-pinky", "1": "left-pinky", "2": "left-ring", "3": "left-middle", "4": "left-index", "5": "left-index",
  "6": "right-index", "7": "right-index", "8": "right-middle", "9": "right-ring", "0": "right-pinky", "-": "right-pinky", "=": "right-pinky",
  Q: "left-pinky", W: "left-ring", E: "left-middle", R: "left-index", T: "left-index",
  Y: "right-index", U: "right-index", I: "right-middle", O: "right-ring", P: "right-pinky", "[": "right-pinky", "]": "right-pinky", "\\": "right-pinky",
  A: "left-pinky", S: "left-ring", D: "left-middle", F: "left-index", G: "left-index",
  H: "right-index", J: "right-index", K: "right-middle", L: "right-ring", ";": "right-pinky", "'": "right-pinky",
  Z: "left-pinky", X: "left-ring", C: "left-middle", V: "left-index", B: "left-index",
  N: "right-index", M: "right-index", ",": "right-middle", ".": "right-ring", "/": "right-pinky",
  Space: "thumb",
};

/** Home-row keys where the fingertips rest. */
export const HOME_KEYS = new Set(["A", "S", "D", "F", "J", "K", "L", ";"]);

export function fingerName(finger: Finger) {
  return finger === "thumb" ? "either thumb" : `${finger.replace("-", " ")} finger`;
}

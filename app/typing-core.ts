import { graphemes, points } from './unicode';
export { graphemes, points } from './unicode';
export type KeyDef = { latin:string; normal:string; shift:string };
export type Level = "beginner" | "intermediate" | "expert";
export const rows:KeyDef[][] = [
  [
    {latin:"`",normal:"༉",shift:"༊"},{latin:"1",normal:"༡",shift:"༅"},{latin:"2",normal:"༢",shift:"༄"},{latin:"3",normal:"༣",shift:"༆"},{latin:"4",normal:"༤",shift:"༈"},{latin:"5",normal:"༥",shift:"༴"},{latin:"6",normal:"༦",shift:"༼"},{latin:"7",normal:"༧",shift:"༽"},{latin:"8",normal:"༨",shift:"༺"},{latin:"9",normal:"༩",shift:"༻"},{latin:"0",normal:"༠",shift:"༾"},{latin:"-",normal:"༔",shift:"༚"},{latin:"=",normal:"།",shift:"༎"}
  ],
  [
    {latin:"Q",normal:"ཀ",shift:"ྐ"},{latin:"W",normal:"ཁ",shift:"ྑ"},{latin:"E",normal:"ག",shift:"ྒ"},{latin:"R",normal:"ང",shift:"ྔ"},{latin:"T",normal:"ི",shift:"ྀ"},{latin:"Y",normal:"ུ",shift:"྄"},{latin:"U",normal:"ེ",shift:"ཻ"},{latin:"I",normal:"ོ",shift:"ཽ"},{latin:"O",normal:"ཅ",shift:"ྕ"},{latin:"P",normal:"ཆ",shift:"ྖ"},{latin:"[",normal:"ཇ",shift:"ྗ"},{latin:"]",normal:"ཉ",shift:"ྙ"},{latin:"\\",normal:"ཝ",shift:"ྭ"}
  ],
  [
    {latin:"A",normal:"ཏ",shift:"ྟ"},{latin:"S",normal:"ཐ",shift:"ྠ"},{latin:"D",normal:"ད",shift:"ྡ"},{latin:"F",normal:"ན",shift:"ྣ"},{latin:"G",normal:"པ",shift:"ྤ"},{latin:"H",normal:"ཕ",shift:"ྥ"},{latin:"J",normal:"བ",shift:"ྦ"},{latin:"K",normal:"མ",shift:"ྨ"},{latin:"L",normal:"ཙ",shift:"ྩ"},{latin:";",normal:"ཚ",shift:"ྪ"},{latin:"'",normal:"ཛ",shift:"ྫ"}
  ],
  [
    {latin:"Z",normal:"ཞ",shift:"ྞ"},{latin:"X",normal:"ཟ",shift:"ྵ"},{latin:"C",normal:"འ",shift:"ྰ"},{latin:"V",normal:"ཡ",shift:"ྱ"},{latin:"B",normal:"ར",shift:"ྲ"},{latin:"N",normal:"ལ",shift:"ླ"},{latin:"M",normal:"ཤ",shift:"ྴ"},{latin:",",normal:"ས",shift:"ྶ"},{latin:".",normal:"ཧ",shift:"ྷ"},{latin:"/",normal:"ཨ",shift:"ྸ"}
  ]
];



export function units(value:string){let start=0;return graphemes(value).map(text=>{const len=points(text).length;const unit={text,start,end:start+len};start+=len;return unit;});}


export function visibleStartFor(target:string[], enteredLength:number) {
  let start = enteredLength > 50 ? enteredLength - 32 : 0;
  while(start > 0 && !['་','།','༎'].includes(target[start-1])) start--;
  return start;
}
const punctuation:Record<string,string> = { Backquote:'`', Minus:'-', Equal:'=', BracketLeft:'[', BracketRight:']', Backslash:'\\', Semicolon:';', Quote:"'", Comma:',', Period:'.', Slash:'/' };
export function physicalKey(code:string) { return code.startsWith('Key') ? code.slice(3) : code.startsWith('Digit') ? code.slice(5) : punctuation[code] ?? code; }
export function compareTyping(target: string, typed: string) {
  const expected = units(target);
  const entered = graphemes(typed);
  const last = entered.length - 1;
  const lastTarget = expected[last]?.text;
  // A stack can arrive one mark at a time. Keep the caret on an unfinished
  // stack; once another grapheme arrives, align the following stack by index.
  const pending = lastTarget !== undefined && points(entered[last]).length < points(lastTarget).length;
  const cursorIndex = pending ? last : entered.length;
  const offset = pending ? points(entered[last]).length : 0;
  const position = (expected[cursorIndex]?.start ?? points(target).length) + offset;
  const highlighted = expected.map((unit, index) => {
    const actual = entered[index];
    const status = actual === undefined ? 'upcoming'
      : actual === unit.text ? 'correct'
      : index === last && unit.text.startsWith(actual) ? 'partial' : 'incorrect';
    return { ...unit, status, cursor: index === cursorIndex };
  });
  const correct = highlighted.filter(unit => unit.status === 'correct').length;
  return {
    units: highlighted, position, cursorIndex,
    expected: points(expected[cursorIndex]?.text ?? '')[offset] ?? '',
    correct, incorrect: entered.length - correct,
    complete: entered.length === expected.length && correct === expected.length,
  };
}

export function scoreCharacters(target: string, typed: string) {
  const { correct, incorrect } = compareTyping(target, typed);
  return { correct, incorrect };
}

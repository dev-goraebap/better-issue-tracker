/** The last syllable's final consonant (0 for none), or null when the word does not end in Hangul. */
const final = (word: string) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 ? code % 28 : null;
};

/** The word with 이 or 가 as its last syllable asks (업무가, 일정이), or 이(가) when that cannot be told. */
export const subject = (word: string, shown = word) => {
  const end = final(word);
  return end === null ? `${shown}이(가)` : end === 0 ? `${shown}가` : `${shown}이`;
};
/** The word with 을/를, or 을(를) when that cannot be told. */
export const object = (word: string, shown = word) => {
  const end = final(word);
  return end === null ? `${shown}을(를)` : end === 0 ? `${shown}를` : `${shown}을`;
};
/** The word with 으로 or 로 (로 after a vowel or ㄹ), or (으)로 when that cannot be told. */
export const toward = (word: string, shown = word) => {
  const end = final(word);
  return end === null ? `${shown}(으)로` : end === 0 || end === 8 ? `${shown}로` : `${shown}으로`;
};

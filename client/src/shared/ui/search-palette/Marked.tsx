import styles from './search-palette.module.css';

/** The text with every place it holds the words marked, ignoring case, as a search shows why something was found. */
export function Marked({ text, words }: { text: string; words: string }) {
  if (!words) return <>{text}</>;
  const lower = text.toLowerCase();
  const target = words.toLowerCase();
  const parts: { text: string; marked: boolean }[] = [];
  let from = 0;
  for (let at = lower.indexOf(target); at >= 0; at = lower.indexOf(target, from)) {
    if (at > from) parts.push({ text: text.slice(from, at), marked: false });
    parts.push({ text: text.slice(at, at + target.length), marked: true });
    from = at + target.length;
  }
  if (from < text.length) parts.push({ text: text.slice(from), marked: false });
  return <>{parts.map((part, index) => (part.marked ? <mark key={index} className={styles.mark}>{part.text}</mark> : <span key={index}>{part.text}</span>))}</>;
}

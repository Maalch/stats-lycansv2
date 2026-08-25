interface HighlightTextProps {
  text: string;
  terms: string[];
}

/** Wraps substrings of `text` matching any of `terms` (case-insensitive) in <mark>. */
export function HighlightText({ text, terms }: HighlightTextProps) {
  const escaped = terms.filter(Boolean).map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (escaped.length === 0) return <>{text}</>;

  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        // split() with a capturing group interleaves matches at odd indices
        i % 2 === 1 ? <mark key={i} className="ref-highlight">{part}</mark> : part
      )}
    </>
  );
}

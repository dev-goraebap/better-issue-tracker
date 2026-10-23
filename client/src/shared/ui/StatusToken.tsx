import { Token, type TokenColor } from '@astryxdesign/core';

// Astryx draws a Token with square-ish corners and has no shape prop; its atomic classes outrank a class, so the radius goes inline.
// A state never gives way to the text beside it: a long title is cut short instead of the token.
const pill = { borderRadius: 'var(--radius-full)', flexShrink: 0 } as const;

/**
 * Where something stands (결재 중, 승인, 임시저장, 전달됨…) as a small coloured pill, so a state reads apart from the
 * tags and labels drawn as plain Tokens beside it.
 */
export function StatusToken({ label, color }: { label: string; color?: TokenColor }) {
  return <Token size="sm" color={color} label={label} style={pill} />;
}

import type { Appearance, ColorTheme } from '@/shared/lib/appearance';

/**
 * The looks a member picks from, shown as swatches: system (follows the device), light and dark, then BIT's own colour
 * themes made to rest the eyes over a long day, light ones before dark ones (app/styles/color-themes.css). preview is
 * the swatch's own picture.
 */
export type LookChoice = { id: string; label: string; description: string; preview: string; apply: Pick<Appearance, 'mode' | 'color'> };

const color = (id: Exclude<ColorTheme, 'none'>, mode: 'light' | 'dark', label: string, description: string, preview: string): LookChoice =>
  ({ id, label, description, preview, apply: { mode, color: id } });

export const LOOK_CHOICES: readonly LookChoice[] = [
  { id: 'system', label: '시스템', description: '기기의 라이트·다크 설정을 따릅니다.', preview: 'linear-gradient(135deg, #ffffff 0 50%, #2b2b30 50% 100%)', apply: { mode: 'system', color: 'none' } },
  { id: 'light', label: '라이트', description: '기본 밝은 화면', preview: '#ffffff', apply: { mode: 'light', color: 'none' } },
  { id: 'dark', label: '다크', description: '기본 어두운 화면', preview: '#2b2b30', apply: { mode: 'dark', color: 'none' } },
  color('apricot', 'light', '살구', '미색에서 살구빛으로 번지는 바탕에 세피아 글자', 'linear-gradient(172deg, #f8f0dd 0%, #f3e3c9 50%, #f0d0b6 100%)'),
  color('sprout', 'light', '새싹', '연둣빛 민트에서 레몬빛으로 번지는 바탕에 녹회색 글자', 'linear-gradient(172deg, #e7f4e2 0%, #e1efd3 50%, #eef0c2 100%)'),
  color('cotton-candy', 'light', '솜사탕', '분홍에서 복숭아빛으로 번지는 바탕에 따뜻한 회갈색 글자', 'linear-gradient(172deg, #f9dbe7 0%, #f9dee2 50%, #fae2d9 100%)'),
  color('dawn-mist', 'light', '새벽안개', '푸른 회색 안개에 옅은 라일락 기운이 도는 바탕', 'linear-gradient(172deg, #e0e9f5 0%, #e1e6f3 50%, #e5e4f3 100%)'),
  color('night-sea', 'dark', '밤바다', '깊은 남색에 부드러운 흰 글자', 'linear-gradient(160deg, #1d2636, #18202e 60%, #222c3d)'),
  color('campfire', 'dark', '모닥불', '따뜻한 숯빛에 호박색 강조', 'linear-gradient(160deg, #2a2420, #221d1a 60%, #302823)'),
];

/** The choice a look is: a colour theme by its id, else the mode. */
export const lookOf = ({ mode, color: theme }: Pick<Appearance, 'mode' | 'color'>) => (theme !== 'none' ? theme : mode);

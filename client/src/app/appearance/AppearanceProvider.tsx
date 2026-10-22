import type { ReactNode } from 'react';
import { Theme } from '@astryxdesign/core/theme';
import { stoneTheme } from '@astryxdesign/theme-stone/built';
import { useAppearance } from '@/shared/lib/appearance';
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const { mode } = useAppearance();
  return <Theme theme={stoneTheme} mode={mode}>{children}</Theme>;
}

import { useEffect, type ReactNode } from 'react';
import { Theme } from '@astryxdesign/core/theme';
import { stoneTheme } from '@astryxdesign/theme-stone/built';
import { useAppearance } from '@/shared/lib/appearance';
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const { mode, color } = useAppearance();
  // A colour theme paints over the stone theme from the root (app/styles/color-themes.css), dialogs and popovers included.
  useEffect(() => {
    const root = document.documentElement;
    if (color === 'none') delete root.dataset.colorTheme; else root.dataset.colorTheme = color;
  }, [color]);
  return <Theme theme={stoneTheme} mode={mode}>{children}</Theme>;
}

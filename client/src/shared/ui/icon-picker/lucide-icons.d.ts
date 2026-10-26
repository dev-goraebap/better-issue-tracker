// lucide-react's module of every icon by its component name (LayoutList, GitBranch…), loaded only when a mark needs
// an icon beyond the app's own (catalog.ts). The package declares only its entry, which this mirrors.
declare module 'lucide-react/dist/esm/icons/index.mjs' {
  import type { LucideIcon } from 'lucide-react';
  const icons: Record<string, LucideIcon>;
  export = icons;
}

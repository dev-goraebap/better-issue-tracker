import { createContext } from 'react';
export const PageChromeContext = createContext<{ actions: HTMLElement | null; tools: HTMLElement | null; rows: HTMLElement | null } | null>(null);

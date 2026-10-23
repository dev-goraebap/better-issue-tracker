import { createContext } from 'react';

/** The width of the page in view (PageFrame's width), so its foot row lines its content up with the page. */
export type PageWidth = 'narrow' | 'default' | 'wide' | 'full';
export const PageWidthContext = createContext<PageWidth>('default');

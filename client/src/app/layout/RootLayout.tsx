import { Outlet } from '@tanstack/react-router';
import { FirstVisit } from './FirstVisit';

/** Every screen, with the first visit's loader over it until the first one is drawn. */
export function RootLayout() { return <FirstVisit><Outlet /></FirstVisit>; }

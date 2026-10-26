import { queryOptions } from '@tanstack/react-query';
import { command, createAt, readJson, type components } from '@/shared/api';

export type ServerView = components['schemas']['IssueView'];
export type ServerTweak = components['schemas']['IssueViewTweak'];
const viewBase = (w: string) => `/api/v1/workspaces/${encodeURIComponent(w)}/views`;
const tweakBase = (w: string) => `/api/v1/workspaces/${encodeURIComponent(w)}/view-tweaks`;

/** The workspace's views the member sees (the shared ones and their own personal ones), by position (D-068). */
export const viewsQuery = (w: string) => queryOptions({ queryKey: ['workspace', w, 'views'], queryFn: ({ signal }) => readJson<ServerView[]>(viewBase(w), signal), retry: false });
/** The member's own adjustments to views ("all" for 전체 이슈). */
export const tweaksQuery = (w: string) => queryOptions({ queryKey: ['workspace', w, 'view-tweaks'], queryFn: ({ signal }) => readJson<ServerTweak[]>(tweakBase(w), signal), retry: false });

export const createView = (w: string, body: components['schemas']['CreateIssueView']) => createAt(viewBase(w), body);
export const patchView = (w: string, id: string, body: components['schemas']['UpdateIssueView']) => command('PATCH', `${viewBase(w)}/${encodeURIComponent(id)}`, body);
export const deleteView = (w: string, id: string, expectedVersion: number) => command('DELETE', `${viewBase(w)}/${encodeURIComponent(id)}?expectedVersion=${expectedVersion}`);
export const putTweak = (w: string, viewKey: string, body: components['schemas']['PutIssueViewTweak']) => command('PUT', `${tweakBase(w)}/${encodeURIComponent(viewKey)}`, body);
export const deleteTweak = (w: string, viewKey: string) => command('DELETE', `${tweakBase(w)}/${encodeURIComponent(viewKey)}`);

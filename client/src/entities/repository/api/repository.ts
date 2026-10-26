import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { command, readJson, type components } from '@/shared/api';

export type Integration = components['schemas']['RepositoryIntegration'];
export type Provider = Integration['provider'];
export type IntegrationRule = components['schemas']['IntegrationRule'];
export type RuleEvent = IntegrationRule['event'];
export type CodeLink = components['schemas']['CodeLink'];
export type PullBadge = components['schemas']['PullRequestBadge'];
export type Imported = components['schemas']['IssueImport'];

const projectPath = (w: string, p: string) => `/api/v1/workspaces/${encodeURIComponent(w)}/projects/${encodeURIComponent(p)}`;
export const integrationsKey = (w: string, p: string) => ['workspace', w, 'project', p, 'integrations'] as const;

/** A project's repository connections (D-087); the webhook secret only for those who manage it. */
export const integrationsQuery = (w: string, p: string) => queryOptions({
  queryKey: integrationsKey(w, p), retry: false,
  queryFn: ({ signal }) => readJson<Integration[]>(`${projectPath(w, p)}/integrations`, signal),
});
export const rulesQuery = (w: string, p: string) => queryOptions({
  queryKey: [...integrationsKey(w, p), 'rules'], retry: false,
  queryFn: ({ signal }) => readJson<{ items: IntegrationRule[] }>(`${projectPath(w, p)}/integration-rules`, signal).then(page => page.items),
});
/** What in the project's repositories a work item is tied to: its mirrored issue, branches, pull requests, commits. */
export const codeLinksQuery = (w: string, p: string, workItemId: string) => queryOptions({
  queryKey: ['workspace', w, 'code-links', workItemId], retry: false,
  queryFn: ({ signal }) => readJson<CodeLink[]>(`${projectPath(w, p)}/work-items/${encodeURIComponent(workItemId)}/code-links`, signal),
});
/** The pull requests of the work items on screen, for their badges; nothing is asked when no project has a repository. */
export const pullBadgesQuery = (w: string, projectIds: readonly string[], workItemIds: readonly string[]) => queryOptions({
  queryKey: ['workspace', w, 'pull-requests', [...projectIds].sort().join(','), [...workItemIds].sort().join(',')], retry: false, staleTime: 30_000,
  enabled: projectIds.length > 0 && workItemIds.length > 0,
  queryFn: ({ signal }) => readJson<PullBadge[]>(
    `/api/v1/workspaces/${encodeURIComponent(w)}/pull-requests?${new URLSearchParams({ projects: projectIds.join(','), workItems: workItemIds.slice(0, 500).join(',') })}`, signal),
});

export const connectRepository = (w: string, p: string, body: components['schemas']['ConnectRepository']) =>
  command<Integration>('POST', `${projectPath(w, p)}/integrations`, body);
export const reviseIntegration = (w: string, p: string, id: string, body: components['schemas']['ReviseRepositoryIntegration']) =>
  command<Integration>('PATCH', `${projectPath(w, p)}/integrations/${encodeURIComponent(id)}`, body);
export const disconnectRepository = (w: string, p: string, id: string) =>
  command('DELETE', `${projectPath(w, p)}/integrations/${encodeURIComponent(id)}`);
export const importOpenIssues = (w: string, p: string, id: string) =>
  command<Imported>('POST', `${projectPath(w, p)}/integrations/${encodeURIComponent(id)}/import`);
export const setRules = (w: string, p: string, items: components['schemas']['SetIntegrationRule'][]) =>
  command<{ items: IntegrationRule[] }>('PATCH', `${projectPath(w, p)}/integration-rules`, { items });

export const refreshIntegrations = (client: QueryClient, w: string, p: string) => client.invalidateQueries({ queryKey: integrationsKey(w, p) }).catch(() => {});

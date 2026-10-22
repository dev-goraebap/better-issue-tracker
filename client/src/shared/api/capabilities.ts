import { queryOptions } from '@tanstack/react-query';
import { readJson } from './http';
import type { components } from './schema';

export const capabilitiesQueryOptions = queryOptions({
  queryKey: ['capabilities'],
  queryFn: ({ signal }) => readJson<components['schemas']['Capabilities']>('/api/v1/capabilities', signal),
  staleTime: 60_000,
});

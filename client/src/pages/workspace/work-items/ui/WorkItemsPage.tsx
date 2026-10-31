import { useRouterState } from '@tanstack/react-router';
import { IssuesPage } from './IssuesPage';
import { SchedulesPage } from './SchedulesPage';

export function WorkItemsPage() {
  const path = useRouterState({ select: state => state.location.pathname });
  return path.endsWith('/schedules') ? <SchedulesPage /> : <IssuesPage />;
}

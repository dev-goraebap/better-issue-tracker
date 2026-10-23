import { StatusToken } from '@/shared/ui';
import { STATUS_COLORS, STATUS_LABELS, type Status } from '../model/mock';

/** Where a work item stands, as a status pill (StatusToken), apart from the plain label tokens. */
export function StatusBadge({ status }: { status: Status }) {
  return <StatusToken label={STATUS_LABELS[status]} color={STATUS_COLORS[status]} />;
}

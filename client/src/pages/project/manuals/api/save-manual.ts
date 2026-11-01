import { ApiError } from '@/shared/api';
import type { Manual } from '../model/manual';
import { readManual, storeManual } from './manuals';

/** A confirmed write and its later reads have different outcomes; neither replays the write. */
export async function saveManualAndRefresh(workspaceId: string, projectId: string | undefined, item: Manual,
  publish: (saved: Manual) => Promise<void>): Promise<'refreshed' | 'saved'> {
  let complete = item;
  if (item.pageCount !== undefined) {
    const latest = await readManual(workspaceId, item.id);
    if (latest.version !== item.version) throw new ApiError(409, 'MANUAL_VERSION_CONFLICT');
    complete = { ...latest, title: item.title, description: item.description, icon: item.icon, color: item.color };
  }
  await storeManual(workspaceId, projectId, complete);
  try {
    const saved = await readManual(workspaceId, complete.id);
    await publish(saved);
    return 'refreshed';
  } catch {
    return 'saved';
  }
}

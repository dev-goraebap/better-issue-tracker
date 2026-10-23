import type { WorkItem } from '@/entities/work-item';
import type { components } from '@/shared/api';
export type WorkItemDraft = Pick<WorkItem, 'title' | 'description' | 'priority' | 'triggerType' | 'assigneeId' | 'startDate' | 'dueDate'>;
export const emptyDraft = (): WorkItemDraft => ({ title: '', description: '', priority: null, triggerType: null, assigneeId: null, startDate: null, dueDate: null });
export function draftPayload(value: WorkItemDraft): components['schemas']['CreateWorkItem'] { return { title: value.title.trim(), description: value.description?.trim() || null, priority: value.priority, triggerType: value.triggerType, assigneeId: value.assigneeId, startDate: value.startDate || null, dueDate: value.dueDate || null }; }

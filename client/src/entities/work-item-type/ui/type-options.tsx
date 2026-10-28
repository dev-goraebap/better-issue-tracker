import type { PropertyOption } from '@/shared/ui';
import type { WorkItemType } from '../api/work-item-type';
import { TypeMark } from './TypeMark';

/** The 유형 menu (PropertyPicker), wherever a task is made or changed: each type with its mark, in the workspace's order. */
export const typeOptions = (types: readonly WorkItemType[]): PropertyOption[] =>
  types.map(type => ({ value: type.id, label: type.name, icon: <TypeMark type={type} /> }));

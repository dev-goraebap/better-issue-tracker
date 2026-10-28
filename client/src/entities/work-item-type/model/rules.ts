import type { WorkItemType } from '../api/work-item-type';

/** The icons a member picks for a type's mark (NavIcon names, each with what it reads as): the defaults' first (에픽, 스토리, 작업, 버그). */
export const TYPE_ICONS: readonly { value: string; name: string }[] = [
  { value: 'epic', name: '에픽' }, { value: 'story', name: '스토리' }, { value: 'tasks', name: '작업' }, { value: 'bug', name: '버그' },
  { value: 'idea', name: '아이디어' }, { value: 'target', name: '목표' }, { value: 'rocket', name: '출시' }, { value: 'wrench', name: '정비' },
  { value: 'milestone', name: '마일스톤' }, { value: 'decision', name: '결정' }, { value: 'document', name: '문서' }, { value: 'shield', name: '보안' },
];
/** The mark a type without an icon (one an agent made) shows. */
export const DEFAULT_TYPE_ICON = 'tasks';

type Rule = Pick<WorkItemType, 'parentRequired' | 'allowedParentTypeIds'>;

/** The types a type may sit under, in the workspace's order. */
export const parentTypesOf = (type: Rule, types: readonly WorkItemType[]) => types.filter(each => type.allowedParentTypeIds.includes(each.id));

/** The types a work item of this type may be made under, in the workspace's order. */
export const childTypesOf = (parentTypeId: string, types: readonly WorkItemType[]) => types.filter(each => each.allowedParentTypeIds.includes(parentTypeId));

/** The type a subtask starts as: the workspace's default when it may sit there, else the first that may; none when no type may. */
export function childTypeOf(parentTypeId: string, types: readonly WorkItemType[]): WorkItemType | undefined {
  const allowed = childTypesOf(parentTypeId, types);
  return allowed.find(each => each.isDefault) ?? allowed[0];
}

/**
 * A type's rule as the settings say it: 최상위에만 둘 수 있습니다, 에픽 밑에만 둘 수 있습니다, or 에픽·스토리·작업 밑에 둘
 * 수 있고, 혼자 있어도 됩니다.
 */
export function ruleText(type: Rule, types: readonly WorkItemType[]): string {
  const parents = parentTypesOf(type, types).map(each => each.name).join('·');
  if (!parents) return '최상위에만 둘 수 있습니다';
  return type.parentRequired ? `${parents} 밑에만 둘 수 있습니다` : `${parents} 밑에 둘 수 있고, 혼자 있어도 됩니다`;
}

/**
 * A built-in issue template (D-077): its name, the mark of its pill, the Markdown it puts in the description, and the
 * label it adds when the workspace has it (the system label for a decision; else by any of its names, ignoring case).
 */
export type IssueTemplate = { id: string; name: string; icon: string; body: string; label: { system?: boolean; names?: readonly string[] } };

/**
 * The templates a new issue starts from, as Linear's issue templates: a decision that later work must follow, with its
 * context and what was turned down (BIT's 결정기록, D-085), a bug report that can be reproduced, and meeting notes ending in what was decided and
 * who does what. Each is headings over empty lines to fill, the tasks as boxes.
 */
export const ISSUE_TEMPLATES: readonly IssueTemplate[] = [
  {
    id: 'decision', name: '결정기록', icon: 'decision', label: { system: true },
    body: `## 맥락

무엇 때문에 정해야 했는지(문제, 요청, 제약)와 이 결정이 나온 이슈를 적습니다.

## 결정

무엇을 하기로 했고 어디까지 적용하는지 적습니다.

## 검토한 대안

- 고르지 않은 안 (그 까닭)`,
  },
  {
    id: 'bug', name: '버그 리포트', icon: 'bug', label: { names: ['버그', 'bug'] },
    body: `## 현상

## 재현 순서

1. 첫 단계

## 기대한 동작

## 실제 동작

## 환경

- 기기·브라우저:
- 버전:`,
  },
  {
    id: 'meeting', name: '회의록', icon: 'people', label: { names: ['회의록', '회의', 'meeting'] },
    body: `## 참석자

## 안건

## 논의

## 결정 사항

## 할 일

- [ ] 담당자 · 할 일`,
  },
];

/** The label a template adds, of the workspace's: the system one, or the first whose name it knows; none if it has neither. */
export function templateLabel(template: IssueTemplate, labels: readonly { id: string; name: string; system: boolean }[]): string | undefined {
  if (template.label.system) return labels.find(label => label.system)?.id;
  const names = template.label.names?.map(name => name.toLowerCase()) ?? [];
  return labels.find(label => names.includes(label.name.trim().toLowerCase()))?.id;
}

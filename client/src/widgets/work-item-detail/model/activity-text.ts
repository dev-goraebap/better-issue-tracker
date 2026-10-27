import { beforeText, dateText } from '@/shared/lib/date-text';
import type { TimelineEntry } from '../api/timeline';

/** The names an activity's values are read with: people, the project's columns, the workspace's labels, the priorities. */
export type ActivityNames = {
  people: ReadonlyMap<string, string>; columns: ReadonlyMap<string, string>; labels: ReadonlyMap<string, string>; priorities: Readonly<Record<string, string>>;
  /** What the timeline is of: 업무 (the default) or 문서 (D-093). */
  noun?: '업무' | '문서';
};

/** How long one person's description edits in a row read as one line. */
const FOLD_MS = 30 * 60 * 1000;

/** Who did it, with the agent that did it for them when one did (D-021). */
export const actorText = (entry: TimelineEntry) => `${entry.actorName ?? '알 수 없음'}${entry.actorAgent ? ` · ${entry.actorAgent}` : ''}`;

const ids = (value: string | null) => (value ? value.split(',') : []);
/** A moment as the member's own day and time: 10월 28일 10:00. */
const timeText = (moment: string) => {
  const at = new Date(moment);
  return `${at.getMonth() + 1}월 ${at.getDate()}일 ${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
};
const listOf = (values: string[]) => values.map(value => `'${value}'`).join(', ');
/** The last syllable's final consonant (0 for none), or null when the word does not end in Hangul. */
const final = (word: string) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 ? code % 28 : null;
};
/** The word with 으로 or 로 as its last syllable asks (로 after a vowel or ㄹ), or (으)로 when that cannot be told. */
const toward = (word: string, shown = word) => {
  const end = final(word);
  return end === null ? `${shown}(으)로` : end === 0 || end === 8 ? `${shown}로` : `${shown}으로`;
};
/** The word with 을/를, or 을(를) when that cannot be told. */
const object = (word: string, shown = word) => {
  const end = final(word);
  return end === null ? `${shown}을(를)` : end === 0 ? `${shown}를` : `${shown}을`;
};

/**
 * What a work item's activity says, after the person's name (D-078), as Linear words it: 업무를 만들었습니다, 상태를 할 일에서
 * 진행 중으로 옮겼습니다, 라벨 '버그'를 달았습니다 (the particle fitting the word). A value nobody can name any more (a column removed) reads as 지워진 ….
 */
export function activityText(entry: TimelineEntry, names: ActivityNames): string {
  const { action, field, before, after } = entry;
  const noun = names.noun ?? '업무';
  if (action === 'created') return `${noun}를 만들었습니다`;
  if (action === 'deleted') return `${noun}를 삭제했습니다`;
  if (action === 'restored') return `${noun}를 되살렸습니다`;
  switch (field) {
    case 'title': return `제목을 ${toward(after ?? '', `'${after ?? ''}'`)} 바꿨습니다`;
    case 'description': return '설명을 고쳤습니다';
    case 'body': return '본문을 고쳤습니다';
    case 'place': return '다른 폴더로 옮겼습니다';
    case 'priority': return after ? `우선순위를 ${toward(names.priorities[after] ?? after)} 바꿨습니다` : '우선순위를 지웠습니다';
    case 'assignee':
      if (!after) return '담당자를 비웠습니다';
      return after === entry.actorId ? '스스로 맡았습니다' : `${names.people.get(after) ?? '지워진 구성원'}에게 맡겼습니다`;
    case 'people': {
      const was = ids(before);
      const now = ids(after);
      const person = (id: string) => names.people.get(id) ?? '지워진 구성원';
      const added = now.filter(id => !was.includes(id)).map(person);
      const removed = was.filter(id => !now.includes(id)).map(person);
      if (added.length && removed.length) return `${listOf(added)}을(를) 넣고 ${listOf(removed)}을(를) 뺐습니다`;
      return added.length ? `${listOf(added)}을(를) 넣었습니다` : `${listOf(removed)}을(를) 뺐습니다`;
    }
    case 'kind': return after === 'event' ? '일정으로 바꿨습니다' : '작업으로 바꿨습니다';
    case 'startsAt': return after ? `시작 시각을 ${toward(timeText(after))} 정했습니다` : '시작 시각을 지웠습니다';
    case 'endsAt': return after ? `끝 시각을 ${toward(timeText(after))} 정했습니다` : '끝 시각을 지웠습니다';
    case 'allDay': return after === 'true' ? '종일 일정으로 바꿨습니다' : '시각 일정으로 바꿨습니다';
    case 'reminder': return after === null ? '알림을 껐습니다' : `알림을 ${Number(after) === 0 ? '시작할 때' : beforeText(Number(after))}로 정했습니다`;
    case 'startDate': return after ? `시작일을 ${toward(dateText(after))} 정했습니다` : '시작일을 지웠습니다';
    case 'dueDate': return after ? `기한을 ${toward(dateText(after))} 정했습니다` : '기한을 지웠습니다';
    case 'column': {
      const name = (id: string | null) => (id ? names.columns.get(id) ?? ({ todo: '할 일', doing: '진행 중', done: '완료' } as Record<string, string>)[id] ?? '이전 상태' : '상태 없음');
      return `상태를 ${name(before)}에서 ${toward(name(after))} 옮겼습니다`;
    }
    case 'labels': {
      const was = ids(before);
      const now = ids(after);
      const label = (id: string) => names.labels.get(id) ?? '지워진 라벨';
      const added = now.filter(id => !was.includes(id)).map(label);
      const removed = was.filter(id => !now.includes(id)).map(label);
      const named = (labels: string[]) => object(labels.at(-1) ?? '', listOf(labels));
      if (added.length && removed.length) return `라벨 ${named(added)} 달고 ${named(removed)} 뗐습니다`;
      return added.length ? `라벨 ${named(added)} 달았습니다` : `라벨 ${named(removed)} 뗐습니다`;
    }
    case 'project': return after ? '프로젝트를 변경했습니다' : '프로젝트 연결을 해제했습니다';
    case 'attachments': return after === 'added' ? '파일을 첨부했습니다' : '첨부 파일을 삭제했습니다';
    case 'relations': return after === 'added' ? '연결을 추가했습니다' : '연결을 해제했습니다';
    case 'archived': return after === 'true' ? '보관했습니다' : '보관을 풀었습니다';
    default: return `${noun}를 고쳤습니다`;
  }
}

/**
 * The timeline as it reads: a description written in place saves as it is typed, so one person's edits within half an
 * hour of each other read as one line, at the last of them.
 */
export function foldTimeline(entries: readonly TimelineEntry[]): TimelineEntry[] {
  const lines: TimelineEntry[] = [];
  for (const entry of entries) {
    const last = lines.at(-1);
    const isEdit = (line?: TimelineEntry) => line?.kind === 'activity' && (line.field === 'description' || line.field === 'body');
    if (isEdit(entry) && isEdit(last) && last!.actorId === entry.actorId && Date.parse(entry.at) - Date.parse(last!.at) < FOLD_MS) lines[lines.length - 1] = entry;
    else lines.push(entry);
  }
  return lines;
}

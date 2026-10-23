import { Button } from '@astryxdesign/core';
import { PRIORITIES, TRIGGERS } from '@/entities/work-item';
import { activeFilterKeys, emptyTaskSearch, type TaskSearch } from '../model/search';
const labels: Record<keyof TaskSearch, string> = { q: '검색', priority: '우선순위', triggerType: '트리거', assigneeId: '담당자', column: '컬럼', mode: '표시', closed: '완료', from: '마감일 이후', to: '마감일 이전', order: '정렬' };
export function ActiveTaskFilters({ value, onChange }: { value: TaskSearch; onChange: (value: TaskSearch) => void }) {
  const display = (key: keyof TaskSearch) => key === 'priority' ? PRIORITIES[value.priority as keyof typeof PRIORITIES] : key === 'triggerType' ? TRIGGERS[value.triggerType as keyof typeof TRIGGERS] : key === 'mode' ? (value.mode === 'archived' ? '보관' : '삭제') : key === 'closed' ? (value.closed === 'true' ? '완료' : '미완료') : key === 'assigneeId' || key === 'column' ? '선택됨' : key === 'order' ? (value.order === 'createdAt_asc' ? '먼저 생성순' : '보드 순서') : value[key];
  return <>{activeFilterKeys(value).map(key => <Button key={key} label={`${labels[key]}: ${display(key)} ×`} variant="ghost" size="sm" onClick={() => onChange({ ...value, [key]: emptyTaskSearch()[key] })} />)}<Button label="모든 필터 지우기" variant="ghost" size="sm" onClick={() => onChange(emptyTaskSearch())} /></>;
}

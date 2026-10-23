import { useState } from 'react';
import { Button, HStack, TextInput } from '@astryxdesign/core';

export function ProjectSearchForm({ query, onSearch }: { query: string; onSearch: (value: string) => void }) {
  const [draft, setDraft] = useState(query);
  return <form onSubmit={event => { event.preventDefault(); onSearch(draft.trim()); }}><HStack gap={3} vAlign="center" data-action-row><TextInput label="프로젝트 검색" isLabelHidden value={draft} onChange={setDraft} placeholder="이름 또는 키로 검색" /><Button type="submit" label="검색" /></HStack></form>;
}

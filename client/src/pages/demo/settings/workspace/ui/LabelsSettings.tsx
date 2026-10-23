import { useState } from 'react';
import { Button, IconButton, TextInput, VStack } from '@astryxdesign/core';
import { CompactDialog, ConfirmDialog, NavIcon, SettingsCard, SettingsHead, SettingsRow } from '@/shared/ui';
import { LABELS, WORK_ITEMS, type Workspace } from '@/entities/demo-sample';
import styles from './workspace-settings.module.css';

/** The colours a label may take, as the calendar's kinds and Astryx's icon colours. */
const COLORS = ['blue', 'green', 'orange', 'purple', 'pink', 'red', 'teal', 'gray'] as const;
const COLOR_NAMES: Record<(typeof COLORS)[number], string> = { blue: '파랑', green: '초록', orange: '주황', purple: '보라', pink: '분홍', red: '빨강', teal: '청록', gray: '회색' };
type Label = { name: string; color: (typeof COLORS)[number] };

/**
 * 라벨: the workspace's labels, shared by all its projects, each its colour and name with how many work items wear it;
 * 새 라벨 and 고치기 open the same short dialog (a name required and not taken, a colour), 삭제 asks first and takes the
 * label off its work.
 */
export function LabelsSettings({ workspace: _workspace }: { workspace: Workspace }) {
  const [labels, setLabels] = useState<Label[]>(() => LABELS.map((name, index) => ({ name, color: COLORS[index % COLORS.length]! })));
  const [editing, setEditing] = useState<{ from?: string; name: string; color: Label['color'] } | null>(null);
  const [isChecked, setChecked] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const uses = (name: string) => WORK_ITEMS.filter(item => item.labels.includes(name)).length;
  const taken = !!editing && labels.some(label => label.name === editing.name.trim() && label.name !== editing.from);
  const nameError = isChecked && editing ? (!editing.name.trim() ? '라벨 이름을 입력해 주세요.' : taken ? '같은 이름의 라벨이 있습니다.' : undefined) : undefined;
  const close = () => { setEditing(null); setChecked(false); };
  const save = () => {
    setChecked(true);
    if (!editing || !editing.name.trim() || taken) return;
    const next = { name: editing.name.trim(), color: editing.color };
    setLabels(editing.from ? labels.map(label => (label.name === editing.from ? next : label)) : [...labels, next]);
    close();
  };
  return <VStack gap={8}>
    <SettingsHead title="라벨" description="이 워크스페이스의 모든 프로젝트가 같은 라벨을 씁니다." />
    <SettingsCard title={`라벨 ${labels.length}개`} id="labels-list"
      actions={<Button label="새 라벨" variant="secondary" size="sm" icon={<NavIcon name="plus" />} onClick={() => setEditing({ name: '', color: 'blue' })} />}>
      {labels.map(label => <SettingsRow key={label.name} lead={<span className={styles.swatch} data-color={label.color} aria-hidden="true" />}
        label={label.name} description={`작업 ${uses(label.name)}개`}>
        <span className={styles.rowActions}>
          <IconButton label={`${label.name} 고치기`} tooltip="고치기" variant="ghost" size="sm" icon={<NavIcon name="edit" />}
            onClick={() => setEditing({ from: label.name, name: label.name, color: label.color })} />
          <IconButton label={`${label.name} 삭제`} tooltip="삭제" variant="ghost" size="sm" icon={<NavIcon name="delete" />} onClick={() => setDeleting(label.name)} />
        </span>
      </SettingsRow>)}
    </SettingsCard>
    <CompactDialog isOpen={!!editing} title={editing?.from ? '라벨 고치기' : '새 라벨'} width={420} onClose={close} onSubmit={save}
      footer={<><Button label="취소" variant="ghost" onClick={close} /><Button type="submit" label={editing?.from ? '저장' : '라벨 만들기'} variant="primary" /></>}>
      <TextInput label="이름" value={editing?.name ?? ''} onChange={name => editing && setEditing({ ...editing, name })} isRequired hasAutoFocus
        placeholder="예: 성능" status={nameError ? { type: 'error', message: nameError } : undefined} />
      <fieldset className={styles.colors}>
        <legend className={styles.colorsLegend}>색</legend>
        {COLORS.map(color => <button key={color} type="button" className={styles.colorChoice} data-color={color} aria-label={COLOR_NAMES[color]}
          aria-pressed={editing?.color === color} onClick={() => editing && setEditing({ ...editing, color })} />)}
      </fieldset>
    </CompactDialog>
    {deleting && <ConfirmDialog title={`'${deleting}' 라벨을 삭제할까요?`} description={`작업 ${uses(deleting)}개에서 이 라벨이 빠집니다.`} confirmLabel="삭제" variant="destructive"
      onClose={() => setDeleting(null)} onConfirm={() => { setLabels(labels.filter(label => label.name !== deleting)); setDeleting(null); }} />}
  </VStack>;
}

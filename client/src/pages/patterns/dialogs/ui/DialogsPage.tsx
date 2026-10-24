import { useState } from 'react';
import { Button, Text, TextInput, VStack } from '@astryxdesign/core';
import { CompactDialog, ConfirmDialog, ItemList, ItemMeta, ItemRow, PageFrame, SectionHeader } from '@/shared/ui';
import styles from './dialogs.module.css';

type Open = 'form' | 'confirm' | 'delete' | 'typed' | undefined;

/**
 * PATTERN · 대화상자 (짧은 창). Copy these for a short task that needs no address of its own.
 *
 * - A desktop shows a small dialog in the middle, a phone a bottom sheet; both draw the same ruled head, body and foot
 *   (취소 then the main action at the foot's end).
 * - CompactDialog with onSubmit wraps body and foot in a form, so Enter submits. ConfirmDialog asks before acting;
 *   destructive actions use variant="destructive", and weighty ones ask for a typed word.
 * - Anything longer (a reason to write, steps, a whole form) is a page with its own address instead (see 작성 양식).
 */
export function DialogsPage() {
  const [open, setOpen] = useState<Open>();
  const [name, setName] = useState('');
  const close = () => setOpen(undefined);
  const examples: { key: Exclude<Open, undefined>; title: string; when: string }[] = [
    { key: 'form', title: '짧은 입력', when: '이름 하나, 라벨 하나를 받을 때' },
    { key: 'confirm', title: '확인', when: '되돌릴 수 있는 동작 전에 한 번 물을 때' },
    { key: 'delete', title: '삭제 확인', when: '가벼운 것(댓글, 라벨)을 지울 때' },
    { key: 'typed', title: '입력해서 확인', when: '딸린 것이 많거나 되돌릴 수 없는 것을 지울 때' },
  ];
  return <PageFrame title="대화상자" icon="comment">
    <VStack gap={6} className={styles.flush}>
      <section aria-labelledby="dialogs-list">
        <SectionHeader id="dialogs-list" title="짧은 창" />
        <ItemList label="대화상자 예시">{examples.map(example => <ItemRow key={example.key}
          title={<button type="button" className={styles.rowButton} onClick={() => setOpen(example.key)}>{example.title}</button>}
          meta={<><ItemMeta><span className={styles.clip}>{example.when}</span></ItemMeta><ItemMeta><Button label="열기" variant="secondary" size="sm" onClick={() => setOpen(example.key)} /></ItemMeta></>} />)}
        </ItemList>
      </section>
      <Text type="supporting" color="secondary">휴대폰 너비로 줄이면 같은 창이 바텀시트로 열립니다.</Text>
    </VStack>
    <CompactDialog isOpen={open === 'form'} title="라벨 만들기" subtitle="작업에 붙일 라벨의 이름" onClose={close} onSubmit={close}
      footer={<><Button label="취소" variant="ghost" onClick={close} /><Button type="submit" label="만들기" variant="primary" isDisabled={!name.trim()} /></>}>
      <TextInput label="이름" value={name} onChange={setName} hasAutoFocus placeholder="예: 성능" />
    </CompactDialog>
    {open === 'confirm' && <ConfirmDialog title="작업을 보관할까요?" description="보관한 작업은 보드에서 빠지고 보관함에서 다시 꺼낼 수 있습니다." confirmLabel="보관" onClose={close} onConfirm={close} />}
    {open === 'delete' && <ConfirmDialog title="댓글을 삭제할까요?" description="삭제한 댓글은 목록에서 사라집니다." confirmLabel="삭제" variant="destructive" onClose={close} onConfirm={close} />}
    {open === 'typed' && <ConfirmDialog title="워크스페이스를 삭제할까요?" description="프로젝트 3개와 작업 120개가 함께 사라지며 되돌릴 수 없습니다." confirmLabel="삭제" variant="destructive" word="삭제" onClose={close} onConfirm={close} />}
  </PageFrame>;
}

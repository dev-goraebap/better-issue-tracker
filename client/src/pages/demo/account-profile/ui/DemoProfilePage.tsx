import { useState } from 'react';
import { Button, TextInput, VStack } from '@astryxdesign/core';
import { ConfirmDialog, DefaultAvatar, NavIcon, PageFrame, SettingsCard, SettingsRow } from '@/shared/ui';
import { personOf, ME } from '@/entities/demo-sample';

/**
 * PATTERN · 설정 카드, /demo/settings/profile (account settings, outside any workspace). Copy this page for a page of
 * settings whose lines each set one thing.
 *
 * - PageFrame width="narrow" with SettingsCard sections: the section's quiet name, then a ruled card of SettingsRow lines
 *   (what it sets at the start, its control at the end). A phone stacks the control under the label.
 * - A field saves when it loses focus or with Enter; nothing waits for a page-wide 저장. What cannot change here says so
 *   in the row's description (이메일).
 * - The danger zone is the last card, in the danger tone, its action behind ConfirmDialog with a typed word.
 */
export function DemoProfilePage() {
  const me = personOf(ME)!;
  const [name, setName] = useState(me.name);
  const [isDeleting, setDeleting] = useState(false);
  return <PageFrame title="프로필" icon="person" width="narrow">
    <VStack gap={8}>
      <SettingsCard title="세부 정보" id="profile-details">
        <SettingsRow lead={<DefaultAvatar seed={me.id} name={me.name} size={40} />} label="프로필 사진" description="정사각형 이미지가 가장 잘 보입니다.">
          <Button label="업로드" variant="secondary" size="sm" icon={<NavIcon name="attach" />} />
        </SettingsRow>
        <SettingsRow label="이름" description="팀원과 에이전트 기록에 이 이름으로 보입니다.">
          <TextInput label="이름" isLabelHidden size="sm" value={name} onChange={setName} />
        </SettingsRow>
        <SettingsRow label="이메일" description="이 주소로 로그인합니다. 바꾸려면 관리자에게 요청하세요.">{me.email}</SettingsRow>
      </SettingsCard>
      <SettingsCard title="위험 구역" id="profile-danger" tone="danger">
        <SettingsRow label="계정 삭제" description="나만 속한 워크스페이스는 함께 지워집니다. 다른 곳의 작업은 남고 담당자가 비워지며, 댓글은 지워집니다.">
          <Button label="계정 삭제" variant="destructive" size="sm" onClick={() => setDeleting(true)} />
        </SettingsRow>
      </SettingsCard>
    </VStack>
    {isDeleting && <ConfirmDialog title="계정을 삭제할까요?" description="되돌릴 수 없습니다. 나만 속한 워크스페이스와 그 안의 작업도 함께 사라집니다."
      confirmLabel="계정 삭제" variant="destructive" word="삭제" onClose={() => setDeleting(false)} onConfirm={() => setDeleting(false)} />}
  </PageFrame>;
}

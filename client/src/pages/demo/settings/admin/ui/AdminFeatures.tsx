import { VStack } from '@astryxdesign/core';
import { NavIcon, SettingsCard, SettingsHead, SettingsRow, StatusToken } from '@/shared/ui';

/** The server's optional features (D-030): each on or off from the server's own settings, read here, not changed. */
const FEATURES = [
  { id: 'mail', icon: 'mail', label: '메일', isOn: false, how: 'BIT_MAIL_HOST가 비어 있어 초대·알림 메일을 보내지 않습니다.' },
  { id: 'git', icon: 'branch', label: 'Git 연동', isOn: true, how: '웹훅을 받아 커밋과 MR을 작업에 잇습니다.' },
  { id: 'files', icon: 'attach', label: '파일 저장소', isOn: true, how: '로컬 디스크 /data/files에 둡니다.' },
  { id: 'convert', icon: 'documents', label: '문서 변환', isOn: false, how: '변환기가 없어 올린 문서의 미리보기와 PDF를 만들지 않습니다.' },
] as const;

/**
 * 서버 기능: what the server has on. A feature off hides its buttons everywhere and the app runs without it (AGENTS
 * 원칙 6); it is turned on in the server's settings, so this page only reads.
 */
export function AdminFeatures() {
  return <VStack gap={8}>
    <SettingsHead title="서버 기능" description="서버 설정 파일에서 켜고 끕니다. 꺼진 기능의 버튼은 화면에 나타나지 않습니다." />
    <SettingsCard title="선택 기능" id="admin-features">
      {FEATURES.map(feature => <SettingsRow key={feature.id} lead={<NavIcon name={feature.icon} />}
        label={<>{feature.label} {feature.isOn ? <StatusToken label="켜짐" color="green" /> : <StatusToken label="꺼짐" />}</>} description={feature.how} />)}
    </SettingsCard>
  </VStack>;
}

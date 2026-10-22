import { Button, HStack, Selector, Text, VStack } from '@astryxdesign/core';
import { setAppearance, useAppearance } from '@/shared/lib/appearance';
import { PageFrame, SectionHeader } from '@/shared/ui';
import styles from './appearance.module.css';
export function AppearancePage() {
  const { mode, layout } = useAppearance();
  return <PageFrame title="화면" width="narrow"><VStack gap={6}>
    <SectionHeader title="화면 모드" /><Selector label="밝기" value={mode} onChange={value => setAppearance({ mode: value as typeof mode })} options={[{ value: 'system', label: '시스템' }, { value: 'light', label: '라이트' }, { value: 'dark', label: '다크' }]} />
    <SectionHeader title="레이아웃" /><Text color="secondary">변경 사항은 바로 적용되고 이 브라우저에 저장됩니다. 데스크톱에서는 사이드바 가장자리를 드래그하거나 방향키로 너비를 조절할 수 있습니다.</Text>
    <HStack gap={4} wrap="wrap">
      {(['inset', 'split'] as const).map(value => <section key={value} className={styles.option} data-selected={layout === value || undefined}>
        <section className={styles.preview} data-layout={value} aria-hidden="true"><i className={styles.nav} /><i className={styles.content} /><i className={styles.status} /></section>
        <VStack gap={3}><Button label={value === 'inset' ? '인셋 (기본)' : '분할형'} variant={layout === value ? 'primary' : 'ghost'} aria-pressed={layout === value} onClick={() => setAppearance({ layout: value })} /><Text type="supporting">{value === 'inset' ? '여백과 둥근 카드로 콘텐츠를 구분합니다.' : '구분선으로 사이드바·콘텐츠·상태 영역을 나눕니다.'}</Text></VStack>
      </section>)}
    </HStack>
    <SectionHeader title="색상 테마" /><Text>스톤 · 차분한 무채색</Text>
  </VStack></PageFrame>;
}

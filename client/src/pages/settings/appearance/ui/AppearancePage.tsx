import { SegmentedControl, SegmentedControlItem, VStack } from '@astryxdesign/core';
import { setAppearance, useAppearance } from '@/shared/lib/appearance';
import { NavIcon, PageFrame, SettingsCard, SettingsHead, SettingsRow } from '@/shared/ui';
import { ThemeSwatches } from './ThemeSwatches';
import styles from './appearance.module.css';

/**
 * PATTERN · 견본으로 고르는 설정, /settings/appearance. The look applies at once and stays in this browser
 * (shared/lib/appearance): 색상 테마 as Discord's swatches (시스템·라이트·다크, then the colour themes), the layout as a
 * SegmentedControl at its row's end.
 */
export function AppearancePage() {
  const { layout } = useAppearance();
  return <PageFrame title="디스플레이" icon="grid" width="narrow">
    <VStack gap={8}>
      <SettingsHead title="디스플레이" description="BIT가 이 브라우저에서 어떻게 보일지 고릅니다." />
      <SettingsCard title="색상 테마" id="appearance-theme">
        <div className={styles.themes}>
          <ThemeSwatches />
        </div>
      </SettingsCard>
      <SettingsCard title="레이아웃" id="appearance-layout">
        <SettingsRow label="메뉴와 내용" description="인셋은 여백과 둥근 카드로, 분할형은 구분선으로 메뉴와 내용을 나눕니다.">
          <SegmentedControl label="레이아웃" size="sm" value={layout} onChange={value => setAppearance({ layout: value as typeof layout })}>
            <SegmentedControlItem value="inset" label="인셋" icon={<NavIcon name="grid" />} />
            <SegmentedControlItem value="split" label="분할형" icon={<NavIcon name="rows" />} />
          </SegmentedControl>
        </SettingsRow>
      </SettingsCard>
    </VStack>
  </PageFrame>;
}

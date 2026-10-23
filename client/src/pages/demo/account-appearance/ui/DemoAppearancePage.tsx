import { SegmentedControl, SegmentedControlItem, VStack } from '@astryxdesign/core';
import { setAppearance, useAppearance } from '@/shared/lib/appearance';
import { NavIcon, PageFrame, SettingsCard, SettingsRow } from '@/shared/ui';

/**
 * PATTERN · 바로 적용되는 설정, /demo/settings/appearance (the real /settings/appearance). The screen's mode and layout
 * apply at once and stay in this browser (shared/lib/appearance, the real preference, so the demo's frame changes too);
 * a two- or three-way choice is a SegmentedControl at the row's end.
 */
export function DemoAppearancePage() {
  const { mode, layout } = useAppearance();
  return <PageFrame title="디스플레이" icon="grid" width="narrow">
    <VStack gap={8}>
      <SettingsCard title="화면" id="appearance-screen">
        <SettingsRow label="화면 모드" description="시스템을 고르면 기기의 밝기 설정을 따릅니다.">
          <SegmentedControl label="화면 모드" size="sm" value={mode} onChange={value => setAppearance({ mode: value as typeof mode })}>
            <SegmentedControlItem value="system" label="시스템" />
            <SegmentedControlItem value="light" label="라이트" />
            <SegmentedControlItem value="dark" label="다크" />
          </SegmentedControl>
        </SettingsRow>
        <SettingsRow label="레이아웃" description="인셋은 여백과 둥근 카드로, 분할형은 구분선으로 메뉴와 내용을 나눕니다.">
          <SegmentedControl label="레이아웃" size="sm" value={layout} onChange={value => setAppearance({ layout: value as typeof layout })}>
            <SegmentedControlItem value="inset" label="인셋" icon={<NavIcon name="grid" />} />
            <SegmentedControlItem value="split" label="분할형" icon={<NavIcon name="rows" />} />
          </SegmentedControl>
        </SettingsRow>
        <SettingsRow label="색상 테마" description="지금은 한 가지 테마를 씁니다.">스톤 · 차분한 무채색</SettingsRow>
      </SettingsCard>
    </VStack>
  </PageFrame>;
}

import { useState } from 'react';
import { BottomSheet, Button, Calendar, Heading, HStack, Text, VStack } from '@astryxdesign/core';
import type { ISODateString } from '@astryxdesign/core/Calendar';
import { NavIcon } from '../NavIcon';
import { seoulToday } from './date-text';
import type { DateFieldProps } from './DateField';

export function SheetDateField({ label, value, onChange, isDisabled, min, max, hasClear, isOptional, description }: DateFieldProps) {
  const [open, setOpen] = useState(false); const today = seoulToday();
  const pick = (next?: string) => { onChange(next); setOpen(false); };
  return <VStack gap={2}><Text type="supporting">{label}</Text>{description && <Text type="supporting" color="secondary">{description}</Text>}
    <Button label={value || 'YYYY-MM-DD'} aria-label={`${label}: ${value || '날짜 선택'}`} icon={<NavIcon name="calendar" />} isDisabled={isDisabled} onClick={() => setOpen(true)} />
    <BottomSheet isOpen={open} onOpenChange={setOpen} label={`${label} 달력`} height="hug"><VStack padding={5} gap={4}><Heading level={2}>{label}</Heading>
      <Calendar value={value as ISODateString | undefined} min={min as ISODateString | undefined} max={max as ISODateString | undefined} onChange={pick} hasVariableRowCount />
      <HStack gap={3} data-action-row><Button label="오늘" variant="ghost" isDisabled={!!min && today < min || !!max && today > max} onClick={() => pick(today)} />{(hasClear || isOptional) && <Button label="지우기" variant="ghost" onClick={() => pick()} />}<Button label="닫기" onClick={() => setOpen(false)} /></HStack>
    </VStack></BottomSheet>
  </VStack>;
}

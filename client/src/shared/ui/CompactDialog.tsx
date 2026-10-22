import { useId, type ReactNode } from 'react';
import { BottomSheet, Dialog, IconButton, Text, VStack } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { MOBILE_QUERY } from '@/shared/config';
import { NavIcon } from './NavIcon';
import styles from './compact-dialog.module.css';
/** The ruled head/body/foot used by HOHO HR, with the same mobile bottom-sheet anatomy. */
export function CompactDialog({ isOpen, title, subtitle, width = 440, isBusy = false, onClose, onSubmit, footer, children }: {
  isOpen: boolean; title: string; subtitle?: string; width?: number; isBusy?: boolean; onClose: () => void; onSubmit?: () => void; footer: ReactNode; children: ReactNode;
}) {
  const mobile = useMediaQuery(MOBILE_QUERY); const titleId = useId();
  const close = () => { if (!isBusy) onClose(); };
  const parts = <><VStack gap={4} className={styles.body}>{children}</VStack><footer className={styles.foot} data-action-row>{footer}</footer></>;
  const content = <>
    <header className={styles.head}><VStack gap={0} className={styles.headText}><h2 id={titleId} className={styles.title} tabIndex={-1} data-autofocus>{title}</h2>{subtitle && <Text type="supporting" color="secondary">{subtitle}</Text>}</VStack>
      <section className={styles.close}><IconButton label="닫기" variant="ghost" size="sm" icon={<NavIcon name="close" />} onClick={close} isDisabled={isBusy} /></section>
    </header>
    {onSubmit ? <form className={styles.form} onSubmit={event => { event.preventDefault(); if (!isBusy) onSubmit(); }}>{parts}</form> : parts}
  </>;
  return mobile ? <BottomSheet isOpen={isOpen} onOpenChange={open => { if (!open) close(); }} label={title} height="hug" className={styles.sheet}>{content}</BottomSheet>
    : <Dialog isOpen={isOpen} onOpenChange={open => { if (!open) close(); }} purpose={onSubmit ? 'form' : 'info'} width={width} padding={0} aria-labelledby={titleId} className={styles.dialog}>{content}</Dialog>;
}

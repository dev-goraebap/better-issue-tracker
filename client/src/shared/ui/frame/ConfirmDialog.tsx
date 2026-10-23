import { Button, Text, TextInput } from '@astryxdesign/core';
import { useState } from 'react';
import { CompactDialog } from './CompactDialog';

/**
 * A question before something is done (짧은 창): what will happen, and the two answers at the foot, 취소 then the
 * action. A weighty one (much removed with it, or for good) asks for word to be typed first, so a stray press cannot
 * do it. The server's error, if it refuses, takes the description's place. isAlert keeps it open to the router's back
 * (the question before leaving unsaved work).
 */
export function ConfirmDialog({ title, description, confirmLabel, cancelLabel = '취소', variant = 'primary', word, isPending = false, isAlert = false, error, onConfirm, onClose }: {
  title: string; description: string; confirmLabel: string; cancelLabel?: string; variant?: 'primary' | 'destructive';
  /** When set, the action waits until this word is typed. */
  word?: string;
  isPending?: boolean; isAlert?: boolean; error?: Error | null; onConfirm: () => void; onClose: () => void;
}) {
  const [typed, setTyped] = useState('');
  const ready = !word || typed.trim() === word;
  return <CompactDialog title={title} width={420} isBusy={isPending} isAlert={isAlert} onClose={onClose} onSubmit={() => { if (ready && !isPending) onConfirm(); }}
    footer={<>
      <Button label={cancelLabel} variant="ghost" onClick={onClose} isDisabled={isPending} data-autofocus={isAlert || undefined} />
      <Button type="submit" label={confirmLabel} variant={variant} isLoading={isPending} isDisabled={!ready} />
    </>}>
    <Text role={error ? 'alert' : undefined} color={error ? undefined : 'secondary'}>{error ? error.message : description}</Text>
    {word && <TextInput label={`확인을 위해 '${word}'를 입력해 주세요`} placeholder={word} value={typed} onChange={setTyped} hasAutoFocus isDisabled={isPending} />}
  </CompactDialog>;
}

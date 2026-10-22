import { Text } from '@astryxdesign/core';
export function FormMessage({ message, isError = true }: { message: string; isError?: boolean }) {
  return message ? <section role={isError ? 'alert' : 'status'}><Text>{message}</Text></section> : null;
}

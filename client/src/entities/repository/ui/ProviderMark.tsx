import type { Provider } from '../api/repository';
import { PROVIDER_MARKS } from '../model/providers';

/** A host's logo at an icon's size (1em by default); decorative, its name is beside it. */
export function ProviderMark({ provider, size = '1em' }: { provider: Provider; size?: string }) {
  const mark = PROVIDER_MARKS[provider];
  return <svg viewBox="0 0 24 24" width={size} height={size} fill={mark.color} aria-hidden="true" focusable="false"><path d={mark.path} /></svg>;
}

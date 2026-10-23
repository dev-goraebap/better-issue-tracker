import { Selector, type SelectorOptionType, type SelectorProps } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { MOBILE_QUERY } from '@/shared/config';
import { SheetSelect } from './SheetSelect';

/**
 * The platform's one single-choice field, shaped by the layout as DateField and TimeField are: on a desktop the design
 * system's Selector, its options dropping under it; on a phone a box that opens them in a bottom sheet. It takes the
 * Selector's props, so a form names what to pick and never which way it opens. A toolbar's ghost selector, which a phone
 * folds into its filter sheet, stays a Selector.
 */
export function Select<T extends SelectorOptionType>(props: SelectorProps<T>) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  return isMobile ? <SheetSelect {...props} /> : <Selector {...props} />;
}

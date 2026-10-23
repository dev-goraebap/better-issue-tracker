import { Typeahead, type SearchableItem, type TypeaheadProps } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { MOBILE_QUERY } from '@/shared/config';
import { SheetSearchSelect } from './SheetSearchSelect';

/**
 * The platform's one field for picking from a list too long to show at once (people, events, tags): on a desktop the
 * design system's Typeahead, typing narrowing the list dropping under it; on a phone a box that opens a tall bottom
 * sheet with the search over the rows. It takes the Typeahead's props, so a form names its source and never which way
 * it opens.
 */
export function SearchSelect<T extends SearchableItem>(props: TypeaheadProps<T>) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  return isMobile ? <SheetSearchSelect {...props} /> : <Typeahead<T> {...props} />;
}

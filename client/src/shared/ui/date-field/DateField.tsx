import { useMediaQuery } from '@astryxdesign/core/hooks';
import { MOBILE_QUERY } from '@/shared/config';
import { PopoverDateField } from './PopoverDateField';
import { SheetDateField } from './SheetDateField';

export type DateFieldProps = {
  label: string;
  /** YYYY-MM-DD, or undefined when empty. */
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  description?: string;
  isLabelHidden?: boolean;
  isRequired?: boolean;
  isOptional?: boolean;
  isDisabled?: boolean;
  /** Offers a way to empty the field. */
  hasClear?: boolean;
  min?: string;
  max?: string;
  status?: { type: 'error' | 'warning' | 'success'; message?: string };
};

/** Date surface follows layout width; mobile avoids pointer-dependent native pickers. */
export function DateField(props: DateFieldProps) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  return isMobile ? <SheetDateField {...props} /> : <PopoverDateField {...props} />;
}

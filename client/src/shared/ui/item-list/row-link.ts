import styles from './item-list.module.css';

/** The class for the link that opens a row: it stretches over the whole row, under the row's own controls. */
export const ITEM_ROW_LINK = styles.rowLink ?? '';

/**
 * The class for a title that alone opens its row (BIT-123): underlined under the pointer, the rest of the row left to
 * its own controls.
 */
export const ITEM_TITLE_LINK = styles.titleLink ?? '';

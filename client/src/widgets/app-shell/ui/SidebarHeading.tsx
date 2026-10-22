import { Link } from '@tanstack/react-router';
import { PRODUCT_NAME } from '@/shared/config';
import { ProductMark } from '@/shared/ui';
import styles from './app-shell.module.css';
export function SidebarHeading({ folded, name }: { folded: boolean; name: string }) {
  return <header className={styles.sidebarHeading} data-folded={folded || undefined}>
    <Link to="/" className={styles.brand} aria-label={`${PRODUCT_NAME} 처음으로`}><ProductMark />{!folded && <strong>{PRODUCT_NAME}</strong>}</Link>
    {!folded && <><i className={styles.brandRule} aria-hidden="true" /><Link to="/workspaces" className={styles.spaceName} title={name}>{name}</Link></>}
  </header>;
}

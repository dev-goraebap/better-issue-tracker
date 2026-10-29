/** A Solar icon's drawing on its 24 grid (D-112), sized by its parent like any icon (NavIcon's class and sizes). */
export function SolarIcon({ body, size }: { body: string; size?: 'text' | 'navigation' | 'standalone' }) {
  return <svg className="bit-nav-icon" data-icon-set="solar" data-icon-size={size} width={16} height={16} viewBox="0 0 24 24" aria-hidden="true" focusable="false"
    dangerouslySetInnerHTML={{ __html: body }} />;
}

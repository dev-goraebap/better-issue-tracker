import { Button, Switch } from '@astryxdesign/core';
import { useDragOrder } from '@/shared/lib/drag-order';
import { CompactDialog, NavIcon } from '@/shared/ui';
import { HOME_WIDGETS, setHomeLayout, USUAL_HOME, useHomeLayout, type HomeWidget } from '@/entities/demo-sample';
import styles from './home.module.css';

/**
 * 홈 구성 (짧은 창): the home's widgets in the member's order, each row dragged by its handle to a new place (or moved
 * with the arrow keys on it) and switched on or off. It changes this member's home in this workspace only, as it goes;
 * 처음대로 puts the usual home back.
 */
export function HomeLayoutDialog({ workspaceId, isOpen, onClose }: { workspaceId: string; isOpen: boolean; onClose: () => void }) {
  const layout = useHomeLayout(workspaceId);
  const order = useDragOrder(layout.order, next => setHomeLayout(workspaceId, { ...layout, order: next }));
  const show = (key: HomeWidget, isShown: boolean) =>
    setHomeLayout(workspaceId, { ...layout, shown: isShown ? [...layout.shown, key] : layout.shown.filter(each => each !== key) });
  return <CompactDialog isOpen={isOpen} title="홈 구성" width={400} onClose={onClose}
    footer={<><Button label="처음대로" variant="ghost" onClick={() => setHomeLayout(workspaceId, USUAL_HOME)} /><Button label="닫기" variant="primary" onClick={onClose} /></>}>
    <ol ref={order.listRef} className={styles.layoutRows} aria-label="홈 위젯 순서">{layout.order.map((key, index) => {
      const widget = HOME_WIDGETS.find(each => each.key === key)!;
      const isShown = layout.shown.includes(key);
      return <li key={key} className={styles.layoutRow} data-hidden={!isShown || undefined} data-dragging={order.dragging === index || undefined}>
        <button type="button" className={styles.handle} data-handle aria-label={`${widget.label} 순서 옮기기`} {...order.handle(index)}><NavIcon name="grip" /></button>
        <span className={styles.layoutIcon}><NavIcon name={widget.icon} /></span>
        <span className={styles.layoutLabel}>{widget.label}</span>
        <Switch label={`${widget.label} 보이기`} isLabelHidden size="sm" value={isShown} onChange={value => show(key, value)} />
      </li>;
    })}</ol>
  </CompactDialog>;
}

import { useState, type DragEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { SideNavItem, useToast } from '@astryxdesign/core';
import { useQueryClient } from '@tanstack/react-query';
import { authError } from '@/shared/api';
import { refreshProjects, reorderProjects, type Project } from '@/entities/project';
import styles from './app-layout.module.css';

/** Where a dragged project would land: before or after the project under the pointer. */
type Drop = { id: string; isAfter: boolean };

/**
 * The menu's projects in the workspace's order (D-080). Someone who manages the workspace moves one by dragging it to
 * its place (a line shows where it lands) or, with it focused, Alt + ↑ / ↓; the new order shows at once and is the
 * workspace's for everyone. A refused change says so and the menu shows the order as saved.
 */
export function SidebarProjects({ workspaceId, projects, currentId, canReorder, href, mark, onGo }: {
  workspaceId: string; projects: Project[]; currentId?: string; canReorder: boolean; href: (project: Project) => string;
  mark: (project: Project) => ReactNode; onGo: (href: string) => (event: MouseEvent) => void;
}) {
  const client = useQueryClient();
  const toast = useToast();
  // The order just made, shown until the saved one comes back.
  const [moved, setMoved] = useState<string[] | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [drop, setDrop] = useState<Drop | null>(null);
  const shown = moved ? moved.flatMap(id => projects.filter(project => project.id === id)) : projects;
  const save = async (order: string[], focusId?: string) => {
    setMoved(order);
    if (focusId) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-project-row="${focusId}"] a`)?.focus());
    try { await reorderProjects(workspaceId, order); }
    catch (failure) { toast({ body: authError(failure) }); }
    finally { await refreshProjects(client, workspaceId); setMoved(null); }
  };
  const ids = shown.map(project => project.id);
  const place = (id: string, target: Drop) => {
    const rest = ids.filter(each => each !== id);
    const at = rest.indexOf(target.id) + (target.isAfter ? 1 : 0);
    return [...rest.slice(0, at), id, ...rest.slice(at)];
  };
  const over = (event: DragEvent<HTMLDivElement>, id: string) => {
    if (!dragging) return;
    event.preventDefault();
    const box = event.currentTarget.getBoundingClientRect();
    const isAfter = event.clientY > box.top + box.height / 2;
    if (drop?.id !== id || drop.isAfter !== isAfter) setDrop({ id, isAfter });
  };
  const land = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (dragging && drop && drop.id !== dragging) {
      const order = place(dragging, drop);
      if (order.join() !== ids.join()) void save(order);
    }
    setDragging(null); setDrop(null);
  };
  const keys = (event: KeyboardEvent<HTMLDivElement>, id: string) => {
    if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    event.preventDefault();
    const at = ids.indexOf(id);
    const to = event.key === 'ArrowUp' ? at - 1 : at + 1;
    if (to < 0 || to >= ids.length) return;
    const order = [...ids];
    [order[at], order[to]] = [order[to]!, order[at]!];
    void save(order, id);
  };
  return <>{shown.map(project => {
    const link = href(project);
    const item = <SideNavItem key={project.id} label={project.name} href={link} icon={mark(project)} isSelected={currentId === project.id} onClick={onGo(link)} />;
    if (!canReorder) return item;
    return <div key={project.id} data-project-row={project.id} className={styles.projectRow} draggable title="끌거나 Alt + ↑/↓로 순서를 바꿉니다"
      data-dragging={dragging === project.id || undefined} data-drop={drop?.id === project.id && dragging !== project.id ? (drop.isAfter ? 'after' : 'before') : undefined}
      onDragStart={event => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', project.name); setDragging(project.id); }}
      onDragOver={event => over(event, project.id)} onDrop={land} onDragEnd={() => { setDragging(null); setDrop(null); }}
      onKeyDown={event => keys(event, project.id)}>
      {item}
    </div>;
  })}</>;
}

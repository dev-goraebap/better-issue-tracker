/**
 * The views in a scope's own order (D-088): those its order names first, as it names them, then the rest in the
 * workspace's order (전체 이슈, then by position). The first is the scope's default view.
 */
export function orderViews<T extends { id: string }>(views: readonly T[], keys: readonly string[] | undefined): T[] {
  if (!keys?.length) return [...views];
  const named = keys.flatMap(key => views.filter(view => view.id === key));
  return [...named, ...views.filter(view => !keys.includes(view.id))];
}

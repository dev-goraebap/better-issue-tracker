package io.github.goraebap.bit;

import org.springframework.jdbc.core.JdbcTemplate;

/**
 * The default work item types (D-104) for a workspace a test inserts by SQL, the same rows V27 gives every workspace
 * and the service seeds for a new one, since such a workspace never sees WorkspaceCreatedEvent.
 */
final class WorkItemTypeSeeds {
    private WorkItemTypeSeeds() {}

    static void seed(JdbcTemplate jdbc, String workspaceId, String userId) {
        jdbc.update("""
                INSERT INTO work_item_type(work_item_type_id,workspace_id,name,icon,color,position,is_default,
                    parent_required,version,created_at,created_by,updated_at,updated_by)
                SELECT 't' || substr(lower(hex(randomblob(5))),1,9), ?, s.name, s.icon, s.color, s.position,
                    s.is_default, s.parent_required, 0,
                    strftime('%Y-%m-%dT%H:%M:%S','now') || substr(strftime('%f','now'),3) || '000Z', ?,
                    strftime('%Y-%m-%dT%H:%M:%S','now') || substr(strftime('%f','now'),3) || '000Z', ?
                FROM (SELECT '에픽' AS name, 'epic' AS icon, '#8b5cf6' AS color, 0 AS position, 0 AS is_default,
                        0 AS parent_required
                    UNION ALL SELECT '스토리', 'story', '#10b981', 1, 0, 1
                    UNION ALL SELECT '작업', 'tasks', '#3b82f6', 2, 1, 0
                    UNION ALL SELECT '버그', 'bug', '#ef4444', 3, 0, 0) s
                """, workspaceId, userId, userId);
        jdbc.update("""
                INSERT INTO work_item_type_parent(work_item_type_parent_id,work_item_type_id,parent_work_item_type_id,
                    created_at,created_by)
                SELECT 'p' || substr(lower(hex(randomblob(5))),1,9), child.work_item_type_id, parent.work_item_type_id,
                    child.created_at, child.created_by
                FROM work_item_type child JOIN work_item_type parent ON parent.workspace_id=child.workspace_id
                WHERE child.workspace_id=?
                  AND ((child.name='스토리' AND parent.name='에픽')
                    OR (child.name IN ('작업','버그') AND parent.name IN ('에픽','스토리','작업')))
                """, workspaceId);
    }
}

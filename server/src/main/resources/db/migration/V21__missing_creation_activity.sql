-- [jooq ignore start]
-- Existing imports/fixtures may predate activity recording. Recover only the known creation audit,
-- keeping its original actor, agent and time; normal API/MCP events are never duplicated.
INSERT INTO activity (activity_id, workspace_id, project_id, target_type, target_id, type,
                      actor_id, actor_agent, payload, occurred_at)
SELECT 'a' || substr(lower(hex(randomblob(5))), 1, 9), d.workspace_id, d.project_id,
       'document', d.document_id, 'created', d.created_by, d.created_by_agent,
       '{"version":0,"backfilled":true}', d.created_at
FROM document d
WHERE NOT EXISTS (SELECT 1 FROM activity a WHERE a.target_type = 'document'
                  AND a.target_id = d.document_id AND a.type = 'created');

INSERT INTO activity (activity_id, workspace_id, project_id, target_type, target_id, type,
                      actor_id, actor_agent, payload, occurred_at)
SELECT 'a' || substr(lower(hex(randomblob(5))), 1, 9), p.workspace_id, w.project_id,
       'work_item', w.work_item_id, 'created', w.created_by, w.created_by_agent,
       '{"version":0,"backfilled":true}', w.created_at
FROM work_item w JOIN project p ON p.project_id = w.project_id
WHERE NOT EXISTS (SELECT 1 FROM activity a WHERE a.target_type = 'work_item'
                  AND a.target_id = w.work_item_id AND a.type = 'created');

-- [jooq ignore stop]

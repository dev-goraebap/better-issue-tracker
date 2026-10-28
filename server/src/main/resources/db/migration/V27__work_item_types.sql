-- Work item types (D-104): a workspace names the kinds of task it tracks and which type may sit under which.
CREATE TABLE work_item_type (
    work_item_type_id varchar(10) NOT NULL, workspace_id varchar(10) NOT NULL,
    name varchar(32) NOT NULL, icon varchar(32), color varchar(7) NOT NULL,
    position integer NOT NULL DEFAULT 0, is_default boolean NOT NULL DEFAULT 0,
    parent_required boolean NOT NULL DEFAULT 0, version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL, created_by varchar(10) NOT NULL, created_by_agent varchar(64),
    updated_at timestamptz NOT NULL, updated_by varchar(10) NOT NULL, updated_by_agent varchar(64),
    deleted_at timestamptz, deleted_by varchar(10), deleted_by_agent varchar(64),
    CONSTRAINT work_item_type_pkey PRIMARY KEY(work_item_type_id)
    -- [jooq ignore start]
    , CONSTRAINT work_item_type_workspace_id_workspace_workspace_id_fk FOREIGN KEY(workspace_id) REFERENCES workspace(workspace_id)
    , CONSTRAINT work_item_type_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT work_item_type_updated_by_iam_user_iam_user_id_fk FOREIGN KEY(updated_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT work_item_type_deleted_by_iam_user_iam_user_id_fk FOREIGN KEY(deleted_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_work_item_type_name CHECK(length(trim(name)) BETWEEN 1 AND 32 AND name=trim(name))
    , CONSTRAINT ck_work_item_type_icon CHECK(icon IS NULL OR length(icon) BETWEEN 1 AND 32)
    , CONSTRAINT ck_work_item_type_color CHECK(length(color)=7 AND substr(color,1,1)='#' AND substr(color,2) NOT GLOB '*[^a-fA-F0-9]*')
    , CONSTRAINT ck_work_item_type_is_default CHECK(is_default IN (0,1))
    , CONSTRAINT ck_work_item_type_parent_required CHECK(parent_required IN (0,1))
    , CONSTRAINT ck_work_item_type_default_not_deleted CHECK(is_default=0 OR deleted_at IS NULL)
    , CONSTRAINT ck_work_item_type_default_top_or_optional CHECK(is_default=0 OR parent_required=0)
    , CONSTRAINT ck_work_item_type_version CHECK(version>=0)
    -- [jooq ignore stop]
);
-- [jooq ignore start]
CREATE UNIQUE INDEX ux_work_item_type_workspace_id_name ON work_item_type(workspace_id,lower(name)) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX ux_work_item_type_workspace_id_default ON work_item_type(workspace_id) WHERE is_default=1;
-- [jooq ignore stop]
CREATE INDEX ix_work_item_type_workspace_id_position ON work_item_type(workspace_id,position,work_item_type_id);

-- The types a type may sit under. A type with none is top-level.
CREATE TABLE work_item_type_parent (
    work_item_type_parent_id varchar(10) NOT NULL, work_item_type_id varchar(10) NOT NULL,
    parent_work_item_type_id varchar(10) NOT NULL,
    created_at timestamptz NOT NULL, created_by varchar(10) NOT NULL, created_by_agent varchar(64),
    CONSTRAINT work_item_type_parent_pkey PRIMARY KEY(work_item_type_parent_id)
    -- [jooq ignore start]
    , CONSTRAINT work_item_type_parent_work_item_type_id_work_item_type_work_item_type_id_fk
        FOREIGN KEY(work_item_type_id) REFERENCES work_item_type(work_item_type_id)
    , CONSTRAINT work_item_type_parent_parent_work_item_type_id_work_item_type_work_item_type_id_fk
        FOREIGN KEY(parent_work_item_type_id) REFERENCES work_item_type(work_item_type_id)
    , CONSTRAINT work_item_type_parent_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    -- [jooq ignore stop]
);
CREATE UNIQUE INDEX ux_work_item_type_parent_type_parent ON work_item_type_parent(work_item_type_id,parent_work_item_type_id);
CREATE INDEX ix_work_item_type_parent_parent_work_item_type_id ON work_item_type_parent(parent_work_item_type_id);

-- A task has exactly one type and an event none; the application keeps that, as SQLite cannot add the CHECK here.
ALTER TABLE work_item ADD COLUMN work_item_type_id varchar(10)
    CONSTRAINT work_item_work_item_type_id_work_item_type_work_item_type_id_fk REFERENCES work_item_type(work_item_type_id);
CREATE INDEX ix_work_item_work_item_type_id ON work_item(work_item_type_id,work_item_id);

-- [jooq ignore start]
-- Every workspace gets the four default types; existing tasks become 작업, which may sit under 작업, so the subtask
-- links already made stay valid.
INSERT INTO work_item_type(work_item_type_id,workspace_id,name,icon,color,position,is_default,parent_required,version,
    created_at,created_by,updated_at,updated_by)
SELECT 't' || substr(lower(hex(randomblob(5))),1,9), w.workspace_id, s.name, s.icon, s.color, s.position, s.is_default,
    s.parent_required, 0,
    strftime('%Y-%m-%dT%H:%M:%S','now') || substr(strftime('%f','now'),3) || '000Z', w.created_by,
    strftime('%Y-%m-%dT%H:%M:%S','now') || substr(strftime('%f','now'),3) || '000Z', w.created_by
FROM workspace w CROSS JOIN (
    SELECT '에픽' AS name, 'epic' AS icon, '#8b5cf6' AS color, 0 AS position, 0 AS is_default, 0 AS parent_required
    UNION ALL SELECT '스토리', 'story', '#10b981', 1, 0, 1
    UNION ALL SELECT '작업', 'tasks', '#3b82f6', 2, 1, 0
    UNION ALL SELECT '버그', 'bug', '#ef4444', 3, 0, 0
) s;
INSERT INTO work_item_type_parent(work_item_type_parent_id,work_item_type_id,parent_work_item_type_id,created_at,created_by)
SELECT 'p' || substr(lower(hex(randomblob(5))),1,9), child.work_item_type_id, parent.work_item_type_id,
    child.created_at, child.created_by
FROM work_item_type child JOIN work_item_type parent ON parent.workspace_id=child.workspace_id
WHERE (child.name='스토리' AND parent.name='에픽')
   OR (child.name IN ('작업','버그') AND parent.name IN ('에픽','스토리','작업'));
UPDATE work_item SET work_item_type_id=(SELECT t.work_item_type_id FROM work_item_type t
    WHERE t.workspace_id=work_item.workspace_id AND t.is_default=1)
WHERE kind='task';
-- [jooq ignore stop]

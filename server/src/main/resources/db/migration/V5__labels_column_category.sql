-- T-006 adds workspace labels, their links to work items and the column status category without changing V1-V4.
CREATE TABLE label (
    label_id uuid NOT NULL, workspace_id uuid NOT NULL,
    name varchar(32) NOT NULL, color varchar(7) NOT NULL,
    is_system boolean NOT NULL DEFAULT 0, system_key varchar(32),
    version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL, created_by uuid NOT NULL, created_by_agent varchar(64),
    updated_at timestamptz NOT NULL, updated_by uuid NOT NULL, updated_by_agent varchar(64),
    deleted_at timestamptz, deleted_by uuid, deleted_by_agent varchar(64),
    CONSTRAINT label_pkey PRIMARY KEY(label_id)
    -- [jooq ignore start]
    , CONSTRAINT label_workspace_id_workspace_workspace_id_fk FOREIGN KEY(workspace_id) REFERENCES workspace(workspace_id)
    , CONSTRAINT label_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT label_updated_by_iam_user_iam_user_id_fk FOREIGN KEY(updated_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT label_deleted_by_iam_user_iam_user_id_fk FOREIGN KEY(deleted_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_label_name CHECK(length(trim(name)) BETWEEN 1 AND 32 AND name=trim(name))
    , CONSTRAINT ck_label_color CHECK(length(color)=7 AND substr(color,1,1)='#' AND substr(color,2) NOT GLOB '*[^a-fA-F0-9]*')
    , CONSTRAINT ck_label_is_system CHECK(is_system IN (0,1))
    , CONSTRAINT ck_label_system_key CHECK((is_system=1 AND system_key IS NOT NULL AND length(system_key) BETWEEN 1 AND 32) OR (is_system=0 AND system_key IS NULL))
    , CONSTRAINT ck_label_system_not_deleted CHECK(is_system=0 OR deleted_at IS NULL)
    , CONSTRAINT ck_label_version CHECK(version>=0)
    -- [jooq ignore stop]
);
-- [jooq ignore start]
CREATE UNIQUE INDEX ux_label_workspace_id_name ON label(workspace_id,lower(name)) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX ux_label_workspace_id_system_key ON label(workspace_id,system_key) WHERE system_key IS NOT NULL;
-- [jooq ignore stop]
CREATE INDEX ix_label_workspace_id_name ON label(workspace_id,name,label_id);

CREATE TABLE work_item_label (
    work_item_label_id uuid NOT NULL, work_item_id uuid NOT NULL, label_id uuid NOT NULL,
    created_at timestamptz NOT NULL, created_by uuid NOT NULL, created_by_agent varchar(64),
    CONSTRAINT work_item_label_pkey PRIMARY KEY(work_item_label_id)
    -- [jooq ignore start]
    , CONSTRAINT work_item_label_work_item_id_work_item_work_item_id_fk FOREIGN KEY(work_item_id) REFERENCES work_item(work_item_id)
    , CONSTRAINT work_item_label_label_id_label_label_id_fk FOREIGN KEY(label_id) REFERENCES label(label_id)
    , CONSTRAINT work_item_label_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    -- [jooq ignore stop]
);
CREATE UNIQUE INDEX ux_work_item_label_work_item_id_label_id ON work_item_label(work_item_id,label_id);
CREATE INDEX ix_work_item_label_label_id_work_item_id ON work_item_label(label_id,work_item_id);

-- Existing rows start as 'doing'; the backfill below sets the real category before the application reads it.
-- SQLite appends the column text to the stored table definition, so the definition must not end in a comment.
ALTER TABLE board_column ADD COLUMN category varchar(8) NOT NULL
    -- [jooq ignore start]
    CONSTRAINT ck_board_column_category CHECK(category IN ('todo','doing','done'))
    -- [jooq ignore stop]
    DEFAULT 'doing';

-- [jooq ignore start]
UPDATE board_column SET category = CASE
    WHEN is_final=1 THEN 'done'
    WHEN board_column_id=(
        SELECT c.board_column_id FROM board_column c
        WHERE c.project_id=board_column.project_id AND c.is_final=0 AND c.deleted_at IS NULL
        ORDER BY c.position, c.board_column_id LIMIT 1
    ) THEN 'todo'
    ELSE 'doing'
END;

INSERT INTO label(label_id,workspace_id,name,color,is_system,system_key,version,created_at,created_by,updated_at,updated_by)
SELECT
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-'
        || substr('89ab',1+(abs(random())%4),1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))),
    w.workspace_id, '결정기록', '#5e6ad2', 1, 'decision', 0,
    strftime('%Y-%m-%dT%H:%M:%S','now') || substr(strftime('%f','now'),3) || '000Z', w.created_by,
    strftime('%Y-%m-%dT%H:%M:%S','now') || substr(strftime('%f','now'),3) || '000Z', w.created_by
FROM workspace w
WHERE NOT EXISTS (SELECT 1 FROM label l WHERE l.workspace_id=w.workspace_id AND l.system_key='decision');
-- [jooq ignore stop]

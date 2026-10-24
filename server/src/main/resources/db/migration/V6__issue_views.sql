-- T-006 stage 5 keeps the issue views (D-066, D-068) on the server without changing V1-V5.
CREATE TABLE issue_view (
    issue_view_id uuid NOT NULL, workspace_id uuid NOT NULL, owner_id uuid NOT NULL,
    is_personal boolean NOT NULL DEFAULT 0,
    name varchar(64) NOT NULL, description varchar(200), icon varchar(32) NOT NULL, color varchar(7) NOT NULL,
    layout varchar(16) NOT NULL, filters text NOT NULL, sort_key varchar(16) NOT NULL, sort_direction varchar(4) NOT NULL,
    columns text NOT NULL, position real NOT NULL,
    version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL, created_by uuid NOT NULL, created_by_agent varchar(64),
    updated_at timestamptz NOT NULL, updated_by uuid NOT NULL, updated_by_agent varchar(64),
    deleted_at timestamptz, deleted_by uuid, deleted_by_agent varchar(64),
    CONSTRAINT issue_view_pkey PRIMARY KEY(issue_view_id)
    -- [jooq ignore start]
    , CONSTRAINT issue_view_workspace_id_workspace_workspace_id_fk FOREIGN KEY(workspace_id) REFERENCES workspace(workspace_id)
    , CONSTRAINT issue_view_owner_id_iam_user_iam_user_id_fk FOREIGN KEY(owner_id) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT issue_view_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT issue_view_updated_by_iam_user_iam_user_id_fk FOREIGN KEY(updated_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT issue_view_deleted_by_iam_user_iam_user_id_fk FOREIGN KEY(deleted_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_issue_view_is_personal CHECK(is_personal IN (0,1))
    , CONSTRAINT ck_issue_view_name CHECK(length(trim(name)) BETWEEN 1 AND 64 AND name=trim(name))
    , CONSTRAINT ck_issue_view_description CHECK(description IS NULL OR length(description)<=200)
    , CONSTRAINT ck_issue_view_icon CHECK(length(trim(icon)) BETWEEN 1 AND 32)
    , CONSTRAINT ck_issue_view_color CHECK(length(color)=7 AND substr(color,1,1)='#' AND substr(color,2) NOT GLOB '*[^a-fA-F0-9]*')
    , CONSTRAINT ck_issue_view_layout CHECK(layout IN ('list','calendar','board','timeline','cards','history'))
    , CONSTRAINT ck_issue_view_filters CHECK(length(filters)<=4000 AND CASE WHEN json_valid(filters) THEN json_type(filters)='object' ELSE 0 END)
    , CONSTRAINT ck_issue_view_sort_key CHECK(sort_key IN ('updated','created','priority','title'))
    , CONSTRAINT ck_issue_view_sort_direction CHECK(sort_direction IN ('asc','desc'))
    , CONSTRAINT ck_issue_view_columns CHECK(length(columns)<=500 AND CASE WHEN json_valid(columns) THEN json_type(columns)='array' ELSE 0 END)
    , CONSTRAINT ck_issue_view_version CHECK(version>=0)
    -- [jooq ignore stop]
);
CREATE INDEX ix_issue_view_workspace_id_position ON issue_view(workspace_id,position,issue_view_id);

-- A member's own layout, order and columns over a view; view_key is a view id or 'all' (the built-in 전체 이슈).
CREATE TABLE issue_view_tweak (
    workspace_id uuid NOT NULL, iam_user_id uuid NOT NULL, view_key varchar(40) NOT NULL,
    tweak text NOT NULL, updated_at timestamptz NOT NULL,
    CONSTRAINT issue_view_tweak_pkey PRIMARY KEY(workspace_id,iam_user_id,view_key)
    -- [jooq ignore start]
    , CONSTRAINT issue_view_tweak_workspace_id_workspace_workspace_id_fk FOREIGN KEY(workspace_id) REFERENCES workspace(workspace_id)
    , CONSTRAINT issue_view_tweak_iam_user_id_iam_user_iam_user_id_fk FOREIGN KEY(iam_user_id) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_issue_view_tweak_view_key CHECK(length(view_key) BETWEEN 1 AND 40)
    , CONSTRAINT ck_issue_view_tweak_tweak CHECK(length(tweak)<=1000 AND CASE WHEN json_valid(tweak) THEN json_type(tweak)='object' ELSE 0 END)
    -- [jooq ignore stop]
);
CREATE INDEX ix_issue_view_tweak_workspace_id_view_key ON issue_view_tweak(workspace_id,view_key);

-- [jooq ignore start]
WITH starter(position,name,icon,color,layout,filters,sort_key,sort_direction,columns) AS (VALUES
    (0,'백로그','rows','#95959f','list','{"status":"none"}','priority','asc','["status","priority","assignee","labels","updated"]'),
    (1,'진행 보드','board','#f2c94c','board','{}','updated','desc','["status","priority","assignee","labels","updated"]'),
    (2,'캘린더','calendar','#4cb782','calendar','{}','updated','desc','["status","priority","assignee","labels","updated"]'),
    (3,'결정기록','decision','#5e6ad2','history','{"label":"system"}','updated','desc','["assignee","labels","updated"]')
)
INSERT INTO issue_view(issue_view_id,workspace_id,owner_id,is_personal,name,icon,color,layout,filters,sort_key,sort_direction,columns,position,version,created_at,created_by,updated_at,updated_by)
SELECT
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-'
        || substr('89ab',1+(abs(random())%4),1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))),
    w.workspace_id, w.created_by, 0, s.name, s.icon, s.color, s.layout, s.filters, s.sort_key, s.sort_direction, s.columns,
    s.position, 0,
    strftime('%Y-%m-%dT%H:%M:%S','now') || substr(strftime('%f','now'),3) || '000Z', w.created_by,
    strftime('%Y-%m-%dT%H:%M:%S','now') || substr(strftime('%f','now'),3) || '000Z', w.created_by
FROM workspace w CROSS JOIN starter s
ORDER BY w.workspace_id, s.position;
-- [jooq ignore stop]

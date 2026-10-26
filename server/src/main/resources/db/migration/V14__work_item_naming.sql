-- A work item is called a work item everywhere but the Korean screens, which say 업무 (D-091): the tables, columns,
-- constraint names and the polymorphic target type 'issue' become work_item, undoing V10's names.
-- issue, issue_label, the three view tables and code_link are rebuilt rather than renamed so their primary key,
-- foreign key and CHECK names follow the naming rule; SQLite keeps constraint names in the stored definition and
-- cannot rename them. The id columns keep the declared types of the tables they replace.
-- link, activity, comment and attachment are rebuilt because their CHECKs list the target types. Their columns do
-- not change, so jOOQ keeps reading them from V4 and V13. A relates_to link keeps its two ends in name order
-- (Link.Edge), and 'work_item' sorts after 'session_record' where 'issue' sorted before, so a session-work item link
-- swaps its ends back.
-- A repository's own issues keep their name: code_link.kind 'issue', the rule events issue_opened and issue_closed,
-- and repository_integration.syncs_issues are about the repository's issues, not BIT's work items.
-- Flyway runs this in one transaction; defer_foreign_keys moves the foreign key checks to the commit, so
-- issue_label and code_link can still point at issue while work_item is filled.
-- [jooq ignore start]
PRAGMA defer_foreign_keys = ON;
-- [jooq ignore stop]

CREATE TABLE work_item (
    work_item_id uuid NOT NULL, project_id uuid NOT NULL, number bigint NOT NULL,
    title varchar(200) NOT NULL, description text, board_column_id uuid, position real NOT NULL,
    priority varchar(8), trigger_type varchar(16), assignee_id uuid, start_date date, due_date date,
    closed_at timestamptz, archived_at timestamptz, version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL, created_by uuid NOT NULL, created_by_agent varchar(64),
    updated_at timestamptz NOT NULL, updated_by uuid NOT NULL, updated_by_agent varchar(64),
    deleted_at timestamptz, deleted_by uuid, deleted_by_agent varchar(64),
    CONSTRAINT work_item_pkey PRIMARY KEY(work_item_id)
    -- [jooq ignore start]
    , CONSTRAINT work_item_project_id_project_project_id_fk FOREIGN KEY(project_id) REFERENCES project(project_id)
    , CONSTRAINT work_item_project_column_fk FOREIGN KEY(project_id,board_column_id) REFERENCES board_column(project_id,board_column_id)
    , CONSTRAINT work_item_assignee_id_iam_user_iam_user_id_fk FOREIGN KEY(assignee_id) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT work_item_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT work_item_updated_by_iam_user_iam_user_id_fk FOREIGN KEY(updated_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT work_item_deleted_by_iam_user_iam_user_id_fk FOREIGN KEY(deleted_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_work_item_title CHECK(length(trim(title)) BETWEEN 1 AND 200)
    , CONSTRAINT ck_work_item_description CHECK(description IS NULL OR length(description)<=20000)
    , CONSTRAINT ck_work_item_number CHECK(number>0)
    , CONSTRAINT ck_work_item_priority CHECK(priority IS NULL OR priority IN ('low','medium','high','urgent'))
    , CONSTRAINT ck_work_item_trigger_type CHECK(trigger_type IS NULL OR trigger_type IN ('request','finding','external','improvement','planned'))
    , CONSTRAINT ck_work_item_date_range CHECK(start_date IS NULL OR due_date IS NULL OR start_date<=due_date)
    , CONSTRAINT ck_work_item_version CHECK(version>=0)
    , CONSTRAINT ck_work_item_backlog_closed CHECK(board_column_id IS NOT NULL OR closed_at IS NULL)
    -- [jooq ignore stop]
);
-- [jooq ignore start]
INSERT INTO work_item (
    work_item_id, project_id, number, title, description, board_column_id, position, priority, trigger_type, assignee_id,
    start_date, due_date, closed_at, archived_at, version, created_at, created_by, created_by_agent,
    updated_at, updated_by, updated_by_agent, deleted_at, deleted_by, deleted_by_agent)
SELECT
    issue_id, project_id, number, title, description, board_column_id, position, priority, trigger_type, assignee_id,
    start_date, due_date, closed_at, archived_at, version, created_at, created_by, created_by_agent,
    updated_at, updated_by, updated_by_agent, deleted_at, deleted_by, deleted_by_agent
FROM issue;
-- [jooq ignore stop]

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
-- [jooq ignore start]
INSERT INTO work_item_label (work_item_label_id, work_item_id, label_id, created_at, created_by, created_by_agent)
SELECT issue_label_id, issue_id, label_id, created_at, created_by, created_by_agent FROM issue_label;
-- [jooq ignore stop]

-- code_link keeps its constraint names, which H2 (jOOQ) holds per schema, so the old table goes before the new one
-- is made; a plain copy keeps its rows meanwhile.
-- [jooq ignore start]
CREATE TABLE code_link_copy AS SELECT * FROM code_link;
-- [jooq ignore stop]
DROP TABLE code_link;
CREATE TABLE code_link (
    code_link_id varchar(10) NOT NULL, repository_integration_id varchar(10) NOT NULL, work_item_id varchar(10) NOT NULL,
    kind varchar(16) NOT NULL, external_id varchar(255) NOT NULL, url varchar(1000) NOT NULL, title varchar(500) NOT NULL,
    state varchar(16) NOT NULL, author varchar(128), detail varchar(500),
    created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
    CONSTRAINT code_link_pkey PRIMARY KEY(code_link_id)
    -- [jooq ignore start]
    , CONSTRAINT code_link_repository_integration_id_repository_integration_repository_integration_id_fk
        FOREIGN KEY(repository_integration_id) REFERENCES repository_integration(repository_integration_id) ON DELETE CASCADE
    , CONSTRAINT code_link_work_item_id_work_item_work_item_id_fk FOREIGN KEY(work_item_id) REFERENCES work_item(work_item_id)
    , CONSTRAINT ck_code_link_kind CHECK(kind IN ('issue','branch','pull_request','commit'))
    , CONSTRAINT ck_code_link_state CHECK(state IN ('open','draft','merged','closed'))
    -- [jooq ignore stop]
);
-- [jooq ignore start]
INSERT INTO code_link (
    code_link_id, repository_integration_id, work_item_id, kind, external_id, url, title, state, author, detail,
    created_at, updated_at)
SELECT
    code_link_id, repository_integration_id, issue_id, kind, external_id, url, title, state, author, detail,
    created_at, updated_at
FROM code_link_copy;
DROP TABLE code_link_copy;
-- [jooq ignore stop]

DROP TABLE issue_label;
DROP TABLE issue;

CREATE UNIQUE INDEX ux_work_item_project_id_number ON work_item(project_id,number);
CREATE INDEX ix_work_item_board_column_id_position ON work_item(project_id,board_column_id,position,work_item_id);
CREATE INDEX ix_work_item_project_id_created_at_id ON work_item(project_id,created_at,work_item_id);
CREATE INDEX ix_work_item_project_id_position ON work_item(project_id,position,work_item_id);
CREATE INDEX ix_work_item_assignee_id_created_at_id ON work_item(assignee_id,created_at,work_item_id);
CREATE INDEX ix_work_item_project_id_due_date_id ON work_item(project_id,due_date,work_item_id);
CREATE UNIQUE INDEX ux_work_item_label_work_item_id_label_id ON work_item_label(work_item_id,label_id);
CREATE INDEX ix_work_item_label_label_id_work_item_id ON work_item_label(label_id,work_item_id);
CREATE UNIQUE INDEX ux_code_link_integration_kind_external_work_item
    ON code_link(repository_integration_id,kind,external_id,work_item_id);
CREATE INDEX ix_code_link_work_item_id ON code_link(work_item_id,kind,updated_at);

-- SQLite rewrites ck_project_counters to the new column name.
ALTER TABLE project RENAME COLUMN last_issue_number TO last_work_item_number;

CREATE TABLE work_item_view (
    work_item_view_id uuid NOT NULL, workspace_id uuid NOT NULL, owner_id uuid NOT NULL,
    is_personal boolean NOT NULL DEFAULT 0,
    name varchar(64) NOT NULL, description varchar(200), icon varchar(32) NOT NULL, color varchar(7) NOT NULL,
    layout varchar(16) NOT NULL, filters text NOT NULL, sort_key varchar(16) NOT NULL, sort_direction varchar(4) NOT NULL,
    columns text NOT NULL, position real NOT NULL,
    version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL, created_by uuid NOT NULL, created_by_agent varchar(64),
    updated_at timestamptz NOT NULL, updated_by uuid NOT NULL, updated_by_agent varchar(64),
    deleted_at timestamptz, deleted_by uuid, deleted_by_agent varchar(64),
    CONSTRAINT work_item_view_pkey PRIMARY KEY(work_item_view_id)
    -- [jooq ignore start]
    , CONSTRAINT work_item_view_workspace_id_workspace_workspace_id_fk FOREIGN KEY(workspace_id) REFERENCES workspace(workspace_id)
    , CONSTRAINT work_item_view_owner_id_iam_user_iam_user_id_fk FOREIGN KEY(owner_id) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT work_item_view_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT work_item_view_updated_by_iam_user_iam_user_id_fk FOREIGN KEY(updated_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT work_item_view_deleted_by_iam_user_iam_user_id_fk FOREIGN KEY(deleted_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_work_item_view_is_personal CHECK(is_personal IN (0,1))
    , CONSTRAINT ck_work_item_view_name CHECK(length(trim(name)) BETWEEN 1 AND 64 AND name=trim(name))
    , CONSTRAINT ck_work_item_view_description CHECK(description IS NULL OR length(description)<=200)
    , CONSTRAINT ck_work_item_view_icon CHECK(length(trim(icon)) BETWEEN 1 AND 32)
    , CONSTRAINT ck_work_item_view_color CHECK(length(color)=7 AND substr(color,1,1)='#' AND substr(color,2) NOT GLOB '*[^a-fA-F0-9]*')
    , CONSTRAINT ck_work_item_view_layout CHECK(layout IN ('list','calendar','board','timeline','cards','history'))
    , CONSTRAINT ck_work_item_view_filters CHECK(length(filters)<=4000 AND CASE WHEN json_valid(filters) THEN json_type(filters)='object' ELSE 0 END)
    , CONSTRAINT ck_work_item_view_sort_key CHECK(sort_key IN ('updated','created','priority','title'))
    , CONSTRAINT ck_work_item_view_sort_direction CHECK(sort_direction IN ('asc','desc'))
    , CONSTRAINT ck_work_item_view_columns CHECK(length(columns)<=500 AND CASE WHEN json_valid(columns) THEN json_type(columns)='array' ELSE 0 END)
    , CONSTRAINT ck_work_item_view_version CHECK(version>=0)
    -- [jooq ignore stop]
);
-- [jooq ignore start]
INSERT INTO work_item_view (
    work_item_view_id, workspace_id, owner_id, is_personal, name, description, icon, color, layout, filters,
    sort_key, sort_direction, columns, position, version, created_at, created_by, created_by_agent,
    updated_at, updated_by, updated_by_agent, deleted_at, deleted_by, deleted_by_agent)
SELECT
    issue_view_id, workspace_id, owner_id, is_personal, name, description, icon, color, layout, filters,
    sort_key, sort_direction, columns, position, version, created_at, created_by, created_by_agent,
    updated_at, updated_by, updated_by_agent, deleted_at, deleted_by, deleted_by_agent
FROM issue_view;
-- [jooq ignore stop]
DROP TABLE issue_view;
CREATE INDEX ix_work_item_view_workspace_id_position ON work_item_view(workspace_id,position,work_item_view_id);

CREATE TABLE work_item_view_tweak (
    workspace_id uuid NOT NULL, iam_user_id uuid NOT NULL, view_key varchar(40) NOT NULL,
    tweak text NOT NULL, updated_at timestamptz NOT NULL,
    CONSTRAINT work_item_view_tweak_pkey PRIMARY KEY(workspace_id,iam_user_id,view_key)
    -- [jooq ignore start]
    , CONSTRAINT work_item_view_tweak_workspace_id_workspace_workspace_id_fk FOREIGN KEY(workspace_id) REFERENCES workspace(workspace_id)
    , CONSTRAINT work_item_view_tweak_iam_user_id_iam_user_iam_user_id_fk FOREIGN KEY(iam_user_id) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_work_item_view_tweak_view_key CHECK(length(view_key) BETWEEN 1 AND 40)
    , CONSTRAINT ck_work_item_view_tweak_tweak CHECK(length(tweak)<=1000 AND CASE WHEN json_valid(tweak) THEN json_type(tweak)='object' ELSE 0 END)
    -- [jooq ignore stop]
);
-- [jooq ignore start]
INSERT INTO work_item_view_tweak (workspace_id, iam_user_id, view_key, tweak, updated_at)
SELECT workspace_id, iam_user_id, view_key, tweak, updated_at FROM issue_view_tweak;
-- [jooq ignore stop]
DROP TABLE issue_view_tweak;
CREATE INDEX ix_work_item_view_tweak_workspace_id_view_key ON work_item_view_tweak(workspace_id,view_key);

CREATE TABLE work_item_view_order (
    workspace_id uuid NOT NULL, scope varchar(40) NOT NULL, view_keys text NOT NULL,
    updated_at timestamptz NOT NULL, updated_by uuid NOT NULL, updated_by_agent varchar(64),
    CONSTRAINT work_item_view_order_pkey PRIMARY KEY(workspace_id,scope)
    -- [jooq ignore start]
    , CONSTRAINT work_item_view_order_workspace_id_workspace_workspace_id_fk FOREIGN KEY(workspace_id) REFERENCES workspace(workspace_id)
    , CONSTRAINT work_item_view_order_updated_by_iam_user_iam_user_id_fk FOREIGN KEY(updated_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_work_item_view_order_scope CHECK(length(scope) BETWEEN 1 AND 40)
    , CONSTRAINT ck_work_item_view_order_view_keys CHECK(length(view_keys)<=8000 AND CASE WHEN json_valid(view_keys) THEN json_type(view_keys)='array' ELSE 0 END)
    -- [jooq ignore stop]
);
-- [jooq ignore start]
INSERT INTO work_item_view_order (workspace_id, scope, view_keys, updated_at, updated_by, updated_by_agent)
SELECT workspace_id, scope, view_keys, updated_at, updated_by, updated_by_agent FROM issue_view_order;
-- [jooq ignore stop]
DROP TABLE issue_view_order;

-- [jooq ignore start]
CREATE TABLE link_new (
    link_id uuid NOT NULL, workspace_id uuid NOT NULL,
    from_type varchar(16) NOT NULL, from_id uuid NOT NULL, to_type varchar(16) NOT NULL, to_id uuid NOT NULL,
    relation varchar(16) NOT NULL, artifact_version_id uuid, anchor varchar(128),
    created_at timestamptz NOT NULL, created_by uuid NOT NULL, created_by_agent varchar(64),
    deleted_at timestamptz, deleted_by uuid, deleted_by_agent varchar(64),
    CONSTRAINT link_pkey PRIMARY KEY(link_id)
    , CONSTRAINT link_workspace_id_workspace_workspace_id_fk FOREIGN KEY(workspace_id) REFERENCES workspace(workspace_id)
    , CONSTRAINT link_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT link_deleted_by_iam_user_iam_user_id_fk FOREIGN KEY(deleted_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_link_from_type CHECK(from_type IN ('work_item','decision','session_record','artifact','code_ref'))
    , CONSTRAINT ck_link_to_type CHECK(to_type IN ('work_item','decision','session_record','artifact','code_ref'))
    , CONSTRAINT ck_link_relation CHECK(relation IN ('derives_from','implements','revises','based_on','supersedes','blocks','relates_to','subtask_of'))
    , CONSTRAINT ck_link_not_self CHECK(from_type<>to_type OR from_id<>to_id)
    , CONSTRAINT ck_link_artifact_version CHECK(artifact_version_id IS NULL AND anchor IS NULL)
    , CONSTRAINT ck_link_relation_types CHECK(
        (relation='derives_from' AND ((from_type='decision' AND to_type='session_record') OR (from_type='work_item' AND to_type='decision')))
        OR (relation='implements' AND from_type='code_ref' AND to_type='work_item')
        OR (relation IN ('revises','based_on') AND from_type IN ('work_item','decision') AND to_type='artifact')
        OR (relation='supersedes' AND from_type='decision' AND to_type='decision')
        OR (relation IN ('blocks','subtask_of','relates_to') AND from_type='work_item' AND to_type='work_item')
        OR (relation='relates_to' AND ((from_type='session_record' AND to_type='work_item') OR (from_type='work_item' AND to_type='session_record')))
    )
    , CONSTRAINT ck_link_symmetric_order CHECK(relation<>'relates_to' OR from_type || ':' || from_id < to_type || ':' || to_id)
);
WITH renamed AS (
    SELECT link.*,
        CASE from_type WHEN 'issue' THEN 'work_item' ELSE from_type END AS nf,
        CASE to_type WHEN 'issue' THEN 'work_item' ELSE to_type END AS nt
    FROM link
), ordered AS (
    SELECT renamed.*, relation='relates_to' AND nf || ':' || from_id > nt || ':' || to_id AS swap FROM renamed
)
INSERT INTO link_new (
    link_id, workspace_id, from_type, from_id, to_type, to_id, relation, artifact_version_id, anchor,
    created_at, created_by, created_by_agent, deleted_at, deleted_by, deleted_by_agent)
SELECT
    link_id, workspace_id,
    CASE WHEN swap THEN nt ELSE nf END, CASE WHEN swap THEN to_id ELSE from_id END,
    CASE WHEN swap THEN nf ELSE nt END, CASE WHEN swap THEN from_id ELSE to_id END,
    relation, artifact_version_id, anchor, created_at, created_by, created_by_agent, deleted_at, deleted_by, deleted_by_agent
FROM ordered;
DROP TABLE link;
ALTER TABLE link_new RENAME TO link;
CREATE UNIQUE INDEX ux_link_edge ON link(workspace_id,from_type,from_id,to_type,to_id,relation,coalesce(artifact_version_id,'')) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX ux_link_superseded_decision ON link(workspace_id,to_id) WHERE relation='supersedes' AND deleted_at IS NULL;
CREATE UNIQUE INDEX ux_link_subtask_parent ON link(workspace_id,from_id) WHERE relation='subtask_of' AND deleted_at IS NULL;
CREATE INDEX ix_link_from ON link(workspace_id,from_type,from_id,created_at,link_id);
CREATE INDEX ix_link_to ON link(workspace_id,to_type,to_id,created_at,link_id);

CREATE TABLE activity_new (
    activity_id uuid NOT NULL, workspace_id uuid NOT NULL, project_id uuid,
    target_type varchar(16) NOT NULL, target_id uuid NOT NULL, type varchar(32) NOT NULL,
    actor_id uuid, actor_agent varchar(64), payload jsonb, occurred_at timestamptz NOT NULL,
    CONSTRAINT activity_pkey PRIMARY KEY(activity_id)
    , CONSTRAINT activity_workspace_id_workspace_workspace_id_fk FOREIGN KEY(workspace_id) REFERENCES workspace(workspace_id)
    , CONSTRAINT activity_project_workspace_fk FOREIGN KEY(project_id,workspace_id) REFERENCES project(project_id,workspace_id)
    , CONSTRAINT activity_actor_id_iam_user_iam_user_id_fk FOREIGN KEY(actor_id) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_activity_target_type CHECK(target_type IN ('work_item','decision','session_record','artifact','code_ref'))
    , CONSTRAINT ck_activity_type CHECK(length(trim(type)) BETWEEN 1 AND 32)
    , CONSTRAINT ck_activity_payload CHECK(payload IS NULL OR (json_valid(payload) AND length(CAST(payload AS BLOB))<=131072))
);
INSERT INTO activity_new (
    activity_id, workspace_id, project_id, target_type, target_id, type, actor_id, actor_agent, payload, occurred_at)
SELECT
    activity_id, workspace_id, project_id, CASE target_type WHEN 'issue' THEN 'work_item' ELSE target_type END,
    target_id, type, actor_id, actor_agent, payload, occurred_at
FROM activity;
DROP TABLE activity;
ALTER TABLE activity_new RENAME TO activity;
CREATE INDEX ix_activity_target ON activity(workspace_id,target_type,target_id,occurred_at,activity_id);
CREATE INDEX ix_activity_project_id_occurred_at ON activity(workspace_id,project_id,occurred_at,activity_id);

CREATE TABLE comment_new (
    comment_id uuid NOT NULL, workspace_id uuid NOT NULL,
    target_type varchar(16) NOT NULL, target_id uuid NOT NULL, body text NOT NULL,
    version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL, created_by uuid NOT NULL, created_by_agent varchar(64),
    updated_at timestamptz NOT NULL, updated_by uuid NOT NULL, updated_by_agent varchar(64),
    deleted_at timestamptz, deleted_by uuid, deleted_by_agent varchar(64),
    CONSTRAINT comment_pkey PRIMARY KEY(comment_id)
    , CONSTRAINT comment_workspace_id_workspace_workspace_id_fk FOREIGN KEY(workspace_id) REFERENCES workspace(workspace_id)
    , CONSTRAINT comment_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT comment_updated_by_iam_user_iam_user_id_fk FOREIGN KEY(updated_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT comment_deleted_by_iam_user_iam_user_id_fk FOREIGN KEY(deleted_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_comment_target_type CHECK(target_type IN ('work_item','decision','session_record','artifact'))
    , CONSTRAINT ck_comment_body CHECK(length(trim(body)) BETWEEN 1 AND 20000)
    , CONSTRAINT ck_comment_version CHECK(version>=0)
);
INSERT INTO comment_new (
    comment_id, workspace_id, target_type, target_id, body, version, created_at, created_by, created_by_agent,
    updated_at, updated_by, updated_by_agent, deleted_at, deleted_by, deleted_by_agent)
SELECT
    comment_id, workspace_id, CASE target_type WHEN 'issue' THEN 'work_item' ELSE target_type END, target_id, body,
    version, created_at, created_by, created_by_agent, updated_at, updated_by, updated_by_agent,
    deleted_at, deleted_by, deleted_by_agent
FROM comment;
DROP TABLE comment;
ALTER TABLE comment_new RENAME TO comment;
CREATE INDEX ix_comment_target ON comment(workspace_id,target_type,target_id,created_at,comment_id);

CREATE TABLE attachment_new (
    attachment_id varchar(10) NOT NULL, blob_id varchar(10) NOT NULL,
    owner_type varchar(16) NOT NULL, owner_id varchar(10) NOT NULL, position integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL, created_by varchar(10) NOT NULL, created_by_agent varchar(64),
    updated_at timestamptz NOT NULL, updated_by varchar(10) NOT NULL, updated_by_agent varchar(64),
    deleted_at timestamptz, deleted_by varchar(10), deleted_by_agent varchar(64),
    CONSTRAINT attachment_pkey PRIMARY KEY(attachment_id)
    , CONSTRAINT attachment_blob_id_blob_blob_id_fk FOREIGN KEY(blob_id) REFERENCES blob(blob_id)
    , CONSTRAINT attachment_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT attachment_updated_by_iam_user_iam_user_id_fk FOREIGN KEY(updated_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT attachment_deleted_by_iam_user_iam_user_id_fk FOREIGN KEY(deleted_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_attachment_owner_type CHECK(owner_type IN ('work_item','comment','user','workspace'))
    , CONSTRAINT ck_attachment_position CHECK(position>=0)
);
INSERT INTO attachment_new (
    attachment_id, blob_id, owner_type, owner_id, position, created_at, created_by, created_by_agent,
    updated_at, updated_by, updated_by_agent, deleted_at, deleted_by, deleted_by_agent)
SELECT
    attachment_id, blob_id, CASE owner_type WHEN 'issue' THEN 'work_item' ELSE owner_type END, owner_id, position,
    created_at, created_by, created_by_agent, updated_at, updated_by, updated_by_agent, deleted_at, deleted_by, deleted_by_agent
FROM attachment;
DROP TABLE attachment;
ALTER TABLE attachment_new RENAME TO attachment;
CREATE INDEX ix_attachment_owner ON attachment(owner_type,owner_id,position) WHERE deleted_at IS NULL;
CREATE INDEX ix_attachment_blob_id ON attachment(blob_id);
-- [jooq ignore stop]

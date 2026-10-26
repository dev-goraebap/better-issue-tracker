-- A work item is called an issue everywhere (D-084): the screens already said 이슈, and now the tables, columns,
-- constraint names and the polymorphic target type 'work_item' say issue too.
-- work_item and work_item_label are rebuilt rather than renamed so their primary key, foreign key and CHECK names
-- follow the naming rule; SQLite keeps constraint names in the stored definition and cannot rename them. The id
-- columns keep the declared type uuid of the tables they replace, like every other table from V1-V9.
-- link, activity and comment are rebuilt because their CHECKs list the target types. Their columns do not change,
-- so jOOQ keeps reading them from V4. A relates_to link keeps its two ends in name order (Link.Edge), and 'issue'
-- sorts before 'session_record' where 'work_item' sorted after, so a session-issue link swaps its ends.
-- Flyway runs this in one transaction; defer_foreign_keys moves the foreign key checks to the commit, so
-- work_item_label can still point at work_item while issue and issue_label are filled.
-- [jooq ignore start]
PRAGMA defer_foreign_keys = ON;
-- [jooq ignore stop]

CREATE TABLE issue (
    issue_id uuid NOT NULL, project_id uuid NOT NULL, number bigint NOT NULL,
    title varchar(200) NOT NULL, description text, board_column_id uuid, position real NOT NULL,
    priority varchar(8), trigger_type varchar(16), assignee_id uuid, start_date date, due_date date,
    closed_at timestamptz, archived_at timestamptz, version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL, created_by uuid NOT NULL, created_by_agent varchar(64),
    updated_at timestamptz NOT NULL, updated_by uuid NOT NULL, updated_by_agent varchar(64),
    deleted_at timestamptz, deleted_by uuid, deleted_by_agent varchar(64),
    CONSTRAINT issue_pkey PRIMARY KEY(issue_id)
    -- [jooq ignore start]
    , CONSTRAINT issue_project_id_project_project_id_fk FOREIGN KEY(project_id) REFERENCES project(project_id)
    , CONSTRAINT issue_project_column_fk FOREIGN KEY(project_id,board_column_id) REFERENCES board_column(project_id,board_column_id)
    , CONSTRAINT issue_assignee_id_iam_user_iam_user_id_fk FOREIGN KEY(assignee_id) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT issue_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT issue_updated_by_iam_user_iam_user_id_fk FOREIGN KEY(updated_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT issue_deleted_by_iam_user_iam_user_id_fk FOREIGN KEY(deleted_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_issue_title CHECK(length(trim(title)) BETWEEN 1 AND 200)
    , CONSTRAINT ck_issue_description CHECK(description IS NULL OR length(description)<=20000)
    , CONSTRAINT ck_issue_number CHECK(number>0)
    , CONSTRAINT ck_issue_priority CHECK(priority IS NULL OR priority IN ('low','medium','high','urgent'))
    , CONSTRAINT ck_issue_trigger_type CHECK(trigger_type IS NULL OR trigger_type IN ('request','finding','external','improvement','planned'))
    , CONSTRAINT ck_issue_date_range CHECK(start_date IS NULL OR due_date IS NULL OR start_date<=due_date)
    , CONSTRAINT ck_issue_version CHECK(version>=0)
    , CONSTRAINT ck_issue_backlog_closed CHECK(board_column_id IS NOT NULL OR closed_at IS NULL)
    -- [jooq ignore stop]
);
-- [jooq ignore start]
INSERT INTO issue (
    issue_id, project_id, number, title, description, board_column_id, position, priority, trigger_type, assignee_id,
    start_date, due_date, closed_at, archived_at, version, created_at, created_by, created_by_agent,
    updated_at, updated_by, updated_by_agent, deleted_at, deleted_by, deleted_by_agent)
SELECT
    work_item_id, project_id, number, title, description, board_column_id, position, priority, trigger_type, assignee_id,
    start_date, due_date, closed_at, archived_at, version, created_at, created_by, created_by_agent,
    updated_at, updated_by, updated_by_agent, deleted_at, deleted_by, deleted_by_agent
FROM work_item;
-- [jooq ignore stop]

CREATE TABLE issue_label (
    issue_label_id uuid NOT NULL, issue_id uuid NOT NULL, label_id uuid NOT NULL,
    created_at timestamptz NOT NULL, created_by uuid NOT NULL, created_by_agent varchar(64),
    CONSTRAINT issue_label_pkey PRIMARY KEY(issue_label_id)
    -- [jooq ignore start]
    , CONSTRAINT issue_label_issue_id_issue_issue_id_fk FOREIGN KEY(issue_id) REFERENCES issue(issue_id)
    , CONSTRAINT issue_label_label_id_label_label_id_fk FOREIGN KEY(label_id) REFERENCES label(label_id)
    , CONSTRAINT issue_label_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    -- [jooq ignore stop]
);
-- [jooq ignore start]
INSERT INTO issue_label (issue_label_id, issue_id, label_id, created_at, created_by, created_by_agent)
SELECT work_item_label_id, work_item_id, label_id, created_at, created_by, created_by_agent FROM work_item_label;
-- [jooq ignore stop]

DROP TABLE work_item_label;
DROP TABLE work_item;

CREATE UNIQUE INDEX ux_issue_project_id_number ON issue(project_id,number);
CREATE INDEX ix_issue_board_column_id_position ON issue(project_id,board_column_id,position,issue_id);
CREATE INDEX ix_issue_project_id_created_at_id ON issue(project_id,created_at,issue_id);
CREATE INDEX ix_issue_project_id_position ON issue(project_id,position,issue_id);
CREATE INDEX ix_issue_assignee_id_created_at_id ON issue(assignee_id,created_at,issue_id);
CREATE INDEX ix_issue_project_id_due_date_id ON issue(project_id,due_date,issue_id);
CREATE UNIQUE INDEX ux_issue_label_issue_id_label_id ON issue_label(issue_id,label_id);
CREATE INDEX ix_issue_label_label_id_issue_id ON issue_label(label_id,issue_id);

-- SQLite rewrites ck_project_counters to the new column name.
ALTER TABLE project RENAME COLUMN last_work_item_number TO last_issue_number;

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
    , CONSTRAINT ck_link_from_type CHECK(from_type IN ('issue','decision','session_record','artifact','code_ref'))
    , CONSTRAINT ck_link_to_type CHECK(to_type IN ('issue','decision','session_record','artifact','code_ref'))
    , CONSTRAINT ck_link_relation CHECK(relation IN ('derives_from','implements','revises','based_on','supersedes','blocks','relates_to','subtask_of'))
    , CONSTRAINT ck_link_not_self CHECK(from_type<>to_type OR from_id<>to_id)
    , CONSTRAINT ck_link_artifact_version CHECK(artifact_version_id IS NULL AND anchor IS NULL)
    , CONSTRAINT ck_link_relation_types CHECK(
        (relation='derives_from' AND ((from_type='decision' AND to_type='session_record') OR (from_type='issue' AND to_type='decision')))
        OR (relation='implements' AND from_type='code_ref' AND to_type='issue')
        OR (relation IN ('revises','based_on') AND from_type IN ('issue','decision') AND to_type='artifact')
        OR (relation='supersedes' AND from_type='decision' AND to_type='decision')
        OR (relation IN ('blocks','subtask_of','relates_to') AND from_type='issue' AND to_type='issue')
        OR (relation='relates_to' AND ((from_type='session_record' AND to_type='issue') OR (from_type='issue' AND to_type='session_record')))
    )
    , CONSTRAINT ck_link_symmetric_order CHECK(relation<>'relates_to' OR from_type || ':' || from_id < to_type || ':' || to_id)
);
WITH renamed AS (
    SELECT link.*,
        CASE from_type WHEN 'work_item' THEN 'issue' ELSE from_type END AS nf,
        CASE to_type WHEN 'work_item' THEN 'issue' ELSE to_type END AS nt
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
    , CONSTRAINT ck_activity_target_type CHECK(target_type IN ('issue','decision','session_record','artifact','code_ref'))
    , CONSTRAINT ck_activity_type CHECK(length(trim(type)) BETWEEN 1 AND 32)
    , CONSTRAINT ck_activity_payload CHECK(payload IS NULL OR (json_valid(payload) AND length(CAST(payload AS BLOB))<=131072))
);
INSERT INTO activity_new (activity_id, workspace_id, project_id, target_type, target_id, type, actor_id, actor_agent, payload, occurred_at)
SELECT activity_id, workspace_id, project_id, CASE target_type WHEN 'work_item' THEN 'issue' ELSE target_type END,
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
    , CONSTRAINT ck_comment_target_type CHECK(target_type IN ('issue','decision','session_record','artifact'))
    , CONSTRAINT ck_comment_body CHECK(length(trim(body)) BETWEEN 1 AND 20000)
    , CONSTRAINT ck_comment_version CHECK(version>=0)
);
INSERT INTO comment_new (
    comment_id, workspace_id, target_type, target_id, body, version, created_at, created_by, created_by_agent,
    updated_at, updated_by, updated_by_agent, deleted_at, deleted_by, deleted_by_agent)
SELECT comment_id, workspace_id, CASE target_type WHEN 'work_item' THEN 'issue' ELSE target_type END, target_id, body,
    version, created_at, created_by, created_by_agent, updated_at, updated_by, updated_by_agent, deleted_at, deleted_by, deleted_by_agent
FROM comment;
DROP TABLE comment;
ALTER TABLE comment_new RENAME TO comment;
CREATE INDEX ix_comment_target ON comment(workspace_id,target_type,target_id,created_at,comment_id);
-- [jooq ignore stop]

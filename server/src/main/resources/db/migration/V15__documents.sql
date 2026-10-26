-- Documents (D-093): Markdown text written on the screen or by an agent, kept in folders. A document and a folder
-- belong to a project (project_id) or to the workspace's own part of 문서함 (project_id NULL); a project's folder in
-- 문서함 is the project itself, so it has no row and cannot be renamed or deleted. A NULL parent_folder_id or folder_id
-- is the top of that part. Documents carry the workspace's labels (document_label, as work items do), are linked to
-- work items (link relates_to), and have comments and activity, so the target type 'document' joins the CHECKs of
-- link, activity and comment, which SQLite can only change by rebuilding the table.
CREATE TABLE folder (
    folder_id varchar(10) NOT NULL, workspace_id varchar(10) NOT NULL, project_id varchar(10),
    parent_folder_id varchar(10), name varchar(128) NOT NULL, version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL, created_by varchar(10) NOT NULL, created_by_agent varchar(64),
    updated_at timestamptz NOT NULL, updated_by varchar(10) NOT NULL, updated_by_agent varchar(64),
    deleted_at timestamptz, deleted_by varchar(10), deleted_by_agent varchar(64),
    CONSTRAINT folder_pkey PRIMARY KEY(folder_id)
    -- [jooq ignore start]
    , CONSTRAINT folder_workspace_id_workspace_workspace_id_fk FOREIGN KEY(workspace_id) REFERENCES workspace(workspace_id)
    , CONSTRAINT folder_project_workspace_fk FOREIGN KEY(project_id,workspace_id) REFERENCES project(project_id,workspace_id)
    , CONSTRAINT folder_parent_folder_id_folder_folder_id_fk FOREIGN KEY(parent_folder_id) REFERENCES folder(folder_id)
    , CONSTRAINT folder_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT folder_updated_by_iam_user_iam_user_id_fk FOREIGN KEY(updated_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT folder_deleted_by_iam_user_iam_user_id_fk FOREIGN KEY(deleted_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_folder_name CHECK(length(trim(name)) BETWEEN 1 AND 128 AND name=trim(name) AND instr(name,'/')=0)
    , CONSTRAINT ck_folder_not_own_parent CHECK(parent_folder_id IS NULL OR parent_folder_id<>folder_id)
    , CONSTRAINT ck_folder_version CHECK(version>=0)
    -- [jooq ignore stop]
);
-- [jooq ignore start]
CREATE UNIQUE INDEX ux_folder_area_parent_name
    ON folder(workspace_id,coalesce(project_id,''),coalesce(parent_folder_id,''),lower(name)) WHERE deleted_at IS NULL;
-- [jooq ignore stop]
CREATE INDEX ix_folder_workspace_id_project_id ON folder(workspace_id,project_id,parent_folder_id);

CREATE TABLE document (
    document_id varchar(10) NOT NULL, workspace_id varchar(10) NOT NULL, project_id varchar(10),
    folder_id varchar(10), title varchar(200) NOT NULL, body text NOT NULL, version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL, created_by varchar(10) NOT NULL, created_by_agent varchar(64),
    updated_at timestamptz NOT NULL, updated_by varchar(10) NOT NULL, updated_by_agent varchar(64),
    deleted_at timestamptz, deleted_by varchar(10), deleted_by_agent varchar(64),
    CONSTRAINT document_pkey PRIMARY KEY(document_id)
    -- [jooq ignore start]
    , CONSTRAINT document_workspace_id_workspace_workspace_id_fk FOREIGN KEY(workspace_id) REFERENCES workspace(workspace_id)
    , CONSTRAINT document_project_workspace_fk FOREIGN KEY(project_id,workspace_id) REFERENCES project(project_id,workspace_id)
    , CONSTRAINT document_folder_id_folder_folder_id_fk FOREIGN KEY(folder_id) REFERENCES folder(folder_id)
    , CONSTRAINT document_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT document_updated_by_iam_user_iam_user_id_fk FOREIGN KEY(updated_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT document_deleted_by_iam_user_iam_user_id_fk FOREIGN KEY(deleted_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_document_title CHECK(length(trim(title)) BETWEEN 1 AND 200)
    , CONSTRAINT ck_document_body CHECK(length(body)<=200000)
    , CONSTRAINT ck_document_version CHECK(version>=0)
    -- [jooq ignore stop]
);
CREATE INDEX ix_document_workspace_id_project_id_folder_id ON document(workspace_id,project_id,folder_id);
CREATE INDEX ix_document_workspace_id_updated_at_id ON document(workspace_id,updated_at,document_id);

CREATE TABLE document_label (
    document_label_id varchar(10) NOT NULL, document_id varchar(10) NOT NULL, label_id varchar(10) NOT NULL,
    created_at timestamptz NOT NULL, created_by varchar(10) NOT NULL, created_by_agent varchar(64),
    CONSTRAINT document_label_pkey PRIMARY KEY(document_label_id)
    -- [jooq ignore start]
    , CONSTRAINT document_label_document_id_document_document_id_fk FOREIGN KEY(document_id) REFERENCES document(document_id)
    , CONSTRAINT document_label_label_id_label_label_id_fk FOREIGN KEY(label_id) REFERENCES label(label_id)
    , CONSTRAINT document_label_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    -- [jooq ignore stop]
);
CREATE UNIQUE INDEX ux_document_label_document_id_label_id ON document_label(document_id,label_id);
CREATE INDEX ix_document_label_label_id_document_id ON document_label(label_id,document_id);

-- [jooq ignore start]
PRAGMA defer_foreign_keys = ON;
-- [jooq ignore stop]
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
    , CONSTRAINT ck_link_from_type CHECK(from_type IN ('work_item','decision','session_record','artifact','code_ref','document'))
    , CONSTRAINT ck_link_to_type CHECK(to_type IN ('work_item','decision','session_record','artifact','code_ref','document'))
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
        OR (relation='relates_to' AND from_type='document' AND to_type='work_item')
    )
    , CONSTRAINT ck_link_symmetric_order CHECK(relation<>'relates_to' OR from_type || ':' || from_id < to_type || ':' || to_id)
);
INSERT INTO link_new SELECT * FROM link;
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
    , CONSTRAINT ck_activity_target_type CHECK(target_type IN ('work_item','decision','session_record','artifact','code_ref','document'))
    , CONSTRAINT ck_activity_type CHECK(length(trim(type)) BETWEEN 1 AND 32)
    , CONSTRAINT ck_activity_payload CHECK(payload IS NULL OR (json_valid(payload) AND length(CAST(payload AS BLOB))<=131072))
);
INSERT INTO activity_new SELECT * FROM activity;
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
    , CONSTRAINT ck_comment_target_type CHECK(target_type IN ('work_item','decision','session_record','artifact','document'))
    , CONSTRAINT ck_comment_body CHECK(length(trim(body)) BETWEEN 1 AND 20000)
    , CONSTRAINT ck_comment_version CHECK(version>=0)
);
INSERT INTO comment_new SELECT * FROM comment;
DROP TABLE comment;
ALTER TABLE comment_new RENAME TO comment;
CREATE INDEX ix_comment_target ON comment(workspace_id,target_type,target_id,created_at,comment_id);
-- [jooq ignore stop]

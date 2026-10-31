-- Pages (D-113, BIT-140): a document kind whose content is immutable versions of an HTML bundle. A version's files
-- point at blobs without attachments; equal bytes share one blob (storage key blobs/sha256/<hex>), so a file unchanged
-- between versions is stored once and blob_id equality means equal content. An empty file has no blob. The unused
-- artifact slot (target type 'artifact', link.artifact_version_id and link.anchor) goes: pages are the HTML results.

ALTER TABLE document ADD COLUMN kind varchar(8) NOT NULL DEFAULT 'markdown' /* [jooq ignore start] */ CONSTRAINT ck_document_kind CHECK(kind IN ('markdown','page')) /* [jooq ignore stop] */;

-- The latest version is max(number) over the unique index, so the document keeps no copy of it. One upload makes one
-- version: upload_id is the key a retried create or update finds its version by.
CREATE TABLE page_version (
    page_version_id varchar(10) NOT NULL, document_id varchar(10) NOT NULL, number integer NOT NULL,
    entry varchar(512) NOT NULL, note varchar(200), base_commit varchar(64), upload_id varchar(10) NOT NULL,
    created_at timestamptz NOT NULL, created_by varchar(10) NOT NULL, created_by_agent varchar(64),
    CONSTRAINT page_version_pkey PRIMARY KEY(page_version_id)
    -- [jooq ignore start]
    , CONSTRAINT page_version_document_id_document_document_id_fk FOREIGN KEY(document_id) REFERENCES document(document_id)
    , CONSTRAINT page_version_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_page_version_number CHECK(number>=1)
    , CONSTRAINT ck_page_version_note CHECK(note IS NULL OR (length(trim(note)) BETWEEN 1 AND 200 AND instr(note,char(10))=0))
    , CONSTRAINT ck_page_version_base_commit CHECK(base_commit IS NULL OR (length(base_commit) BETWEEN 7 AND 64 AND base_commit NOT GLOB '*[^0-9a-f]*'))
    -- [jooq ignore stop]
);
CREATE UNIQUE INDEX ux_page_version_document_id_number ON page_version(document_id,number);
CREATE UNIQUE INDEX ux_page_version_upload_id ON page_version(upload_id);

-- inject_at is where BIT splices its own tags into an HTML file, found once at upload so serving never parses.
CREATE TABLE page_version_file (
    page_version_id varchar(10) NOT NULL, path varchar(512) NOT NULL, blob_id varchar(10),
    byte_size bigint NOT NULL, content_type varchar(64) NOT NULL, inject_at bigint,
    CONSTRAINT page_version_file_pkey PRIMARY KEY(page_version_id,path)
    -- [jooq ignore start]
    , CONSTRAINT page_version_file_page_version_id_page_version_page_version_id_fk FOREIGN KEY(page_version_id) REFERENCES page_version(page_version_id)
    , CONSTRAINT page_version_file_blob_id_blob_blob_id_fk FOREIGN KEY(blob_id) REFERENCES blob(blob_id)
    , CONSTRAINT ck_page_version_file_byte_size CHECK((blob_id IS NULL AND byte_size=0) OR (blob_id IS NOT NULL AND byte_size>0))
    , CONSTRAINT ck_page_version_file_inject_at CHECK(inject_at IS NULL OR (inject_at>=0 AND inject_at<=byte_size))
    -- [jooq ignore stop]
);
CREATE INDEX ix_page_version_file_blob_id ON page_version_file(blob_id);

-- [jooq ignore start]
PRAGMA defer_foreign_keys = ON;

-- Nothing ever wrote the artifact slot. Stop here rather than drop a row that names it.
CREATE TABLE migration_artifact_rows (
    remaining integer NOT NULL, CONSTRAINT ck_no_row_may_still_name_artifact CHECK(remaining=0)
);
INSERT INTO migration_artifact_rows SELECT
    (SELECT count(*) FROM link WHERE from_type='artifact' OR to_type='artifact' OR artifact_version_id IS NOT NULL OR anchor IS NOT NULL)
    + (SELECT count(*) FROM comment WHERE target_type='artifact')
    + (SELECT count(*) FROM activity WHERE target_type='artifact');
DROP TABLE migration_artifact_rows;

CREATE TABLE pending_upload_new (
    pending_upload_id varchar(10) NOT NULL, blob_id varchar(10) NOT NULL, storage_key varchar(512) NOT NULL,
    purpose varchar(16) NOT NULL, filename varchar(256) NOT NULL, content_type varchar(128) NOT NULL,
    byte_size bigint NOT NULL, dominant_color varchar(7), width integer, height integer,
    created_at timestamptz NOT NULL, created_by varchar(10) NOT NULL, created_by_agent varchar(64),
    CONSTRAINT pending_upload_pkey PRIMARY KEY(pending_upload_id)
    , CONSTRAINT pending_upload_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_pending_upload_purpose CHECK(purpose IN ('attachment','picture','page'))
    , CONSTRAINT ck_pending_upload_byte_size CHECK(byte_size>0)
    , CONSTRAINT ck_pending_upload_dominant_color CHECK(dominant_color GLOB '#[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]')
    , CONSTRAINT ck_pending_upload_size CHECK((width IS NULL AND height IS NULL) OR (width>0 AND height>0))
);
INSERT INTO pending_upload_new SELECT * FROM pending_upload;
DROP TABLE pending_upload;
ALTER TABLE pending_upload_new RENAME TO pending_upload;
CREATE INDEX ix_pending_upload_created_at ON pending_upload(created_at);

-- link keeps artifact_version_id and anchor here, with nothing naming them, so the DROP COLUMNs below (which jOOQ
-- also reads) can remove them.
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
    , CONSTRAINT ck_link_from_type CHECK(from_type IN ('work_item','decision','session_record','code_ref','document'))
    , CONSTRAINT ck_link_to_type CHECK(to_type IN ('work_item','decision','session_record','code_ref','document'))
    , CONSTRAINT ck_link_relation CHECK(relation IN ('derives_from','implements','supersedes','blocks','relates_to','subtask_of','references','mentions'))
    , CONSTRAINT ck_link_not_self CHECK(from_type<>to_type OR from_id<>to_id)
    , CONSTRAINT ck_link_relation_types CHECK(
        (relation='derives_from' AND ((from_type='decision' AND to_type='session_record') OR (from_type='work_item' AND to_type='decision')))
        OR (relation='implements' AND from_type='code_ref' AND to_type='work_item')
        OR (relation='supersedes' AND from_type='decision' AND to_type='decision')
        OR (relation IN ('blocks','subtask_of','relates_to') AND from_type='work_item' AND to_type='work_item')
        OR (relation='relates_to' AND ((from_type='session_record' AND to_type='work_item') OR (from_type='work_item' AND to_type='session_record')))
        OR (relation='relates_to' AND from_type='document' AND to_type='work_item')
        OR (relation IN ('references','mentions') AND from_type='document' AND to_type='document')
    )
    , CONSTRAINT ck_link_symmetric_order CHECK(relation<>'relates_to' OR from_type || ':' || from_id < to_type || ':' || to_id)
);
INSERT INTO link_new SELECT * FROM link;
DROP TABLE link;
ALTER TABLE link_new RENAME TO link;
CREATE UNIQUE INDEX ux_link_edge ON link(workspace_id,from_type,from_id,to_type,to_id,relation) WHERE deleted_at IS NULL;
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
    , CONSTRAINT ck_activity_target_type CHECK(target_type IN ('work_item','decision','session_record','code_ref','document'))
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
    , CONSTRAINT ck_comment_target_type CHECK(target_type IN ('work_item','decision','session_record','document'))
    , CONSTRAINT ck_comment_body CHECK(length(trim(body)) BETWEEN 1 AND 20000)
    , CONSTRAINT ck_comment_version CHECK(version>=0)
);
INSERT INTO comment_new SELECT * FROM comment;
DROP TABLE comment;
ALTER TABLE comment_new RENAME TO comment;
CREATE INDEX ix_comment_target ON comment(workspace_id,target_type,target_id,created_at,comment_id);
-- [jooq ignore stop]

ALTER TABLE link DROP COLUMN anchor;
ALTER TABLE link DROP COLUMN artifact_version_id;

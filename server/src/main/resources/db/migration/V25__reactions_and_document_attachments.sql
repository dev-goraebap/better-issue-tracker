CREATE TABLE reaction (
    reaction_id varchar(10) NOT NULL,
    workspace_id varchar(10) NOT NULL,
    target_type varchar(16) NOT NULL,
    target_id varchar(10) NOT NULL,
    emoji varchar(32) NOT NULL,
    user_id varchar(10) NOT NULL,
    created_at timestamptz NOT NULL,
    created_by_agent varchar(64),
    CONSTRAINT reaction_pkey PRIMARY KEY(reaction_id)
    -- [jooq ignore start]
    , CONSTRAINT reaction_workspace_id_workspace_workspace_id_fk FOREIGN KEY(workspace_id) REFERENCES workspace(workspace_id)
    , CONSTRAINT reaction_user_id_iam_user_iam_user_id_fk FOREIGN KEY(user_id) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_reaction_target_type CHECK(target_type IN ('work_item','document','comment'))
    -- [jooq ignore stop]
);
CREATE UNIQUE INDEX ux_reaction_target_user_emoji ON reaction(workspace_id,target_type,target_id,user_id,emoji);

-- [jooq ignore start]
CREATE TABLE attachment_new (
    attachment_id varchar(10) NOT NULL, blob_id varchar(10) NOT NULL,
    owner_type varchar(16) NOT NULL, owner_id varchar(10) NOT NULL, position integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL, created_by varchar(10) NOT NULL, created_by_agent varchar(64),
    updated_at timestamptz NOT NULL, updated_by varchar(10) NOT NULL, updated_by_agent varchar(64),
    deleted_at timestamptz, deleted_by varchar(10), deleted_by_agent varchar(64),
    CONSTRAINT attachment_pkey PRIMARY KEY(attachment_id),
    CONSTRAINT attachment_blob_id_blob_blob_id_fk FOREIGN KEY(blob_id) REFERENCES blob(blob_id),
    CONSTRAINT attachment_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id),
    CONSTRAINT attachment_updated_by_iam_user_iam_user_id_fk FOREIGN KEY(updated_by) REFERENCES iam_user(iam_user_id),
    CONSTRAINT attachment_deleted_by_iam_user_iam_user_id_fk FOREIGN KEY(deleted_by) REFERENCES iam_user(iam_user_id),
    CONSTRAINT ck_attachment_owner_type CHECK(owner_type IN ('work_item','document','comment','user','workspace')),
    CONSTRAINT ck_attachment_position CHECK(position>=0)
);
INSERT INTO attachment_new SELECT * FROM attachment;
DROP TABLE attachment;
ALTER TABLE attachment_new RENAME TO attachment;
CREATE INDEX ix_attachment_owner ON attachment(owner_type,owner_id,position) WHERE deleted_at IS NULL;
CREATE INDEX ix_attachment_blob_id ON attachment(blob_id);
-- [jooq ignore stop]

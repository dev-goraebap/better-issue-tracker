-- Files (D-029, D-090). A browser sends the bytes straight to storage through a signed URL; pending_upload is the
-- file on its way, and the owning module's command turns it into a blob with an attachment once storage holds it.
-- blob is the stored object, attachment ties it to what owns it (an issue, a comment, a member's or a workspace's
-- picture). Artifact versions will point at blob directly. A picture keeps what the browser measured, its main colour
-- and its size, so screens paint its place before it arrives. New ids are varchar(10) (D-083).
CREATE TABLE pending_upload (
    pending_upload_id varchar(10) NOT NULL, blob_id varchar(10) NOT NULL, storage_key varchar(512) NOT NULL,
    purpose varchar(16) NOT NULL, filename varchar(256) NOT NULL, content_type varchar(128) NOT NULL,
    byte_size bigint NOT NULL, dominant_color varchar(7), width integer, height integer,
    created_at timestamptz NOT NULL, created_by varchar(10) NOT NULL, created_by_agent varchar(64),
    CONSTRAINT pending_upload_pkey PRIMARY KEY(pending_upload_id)
    -- [jooq ignore start]
    , CONSTRAINT pending_upload_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_pending_upload_purpose CHECK(purpose IN ('attachment','picture'))
    , CONSTRAINT ck_pending_upload_byte_size CHECK(byte_size>0)
    , CONSTRAINT ck_pending_upload_dominant_color CHECK(dominant_color GLOB '#[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]')
    , CONSTRAINT ck_pending_upload_size CHECK((width IS NULL AND height IS NULL) OR (width>0 AND height>0))
    -- [jooq ignore stop]
);
CREATE INDEX ix_pending_upload_created_at ON pending_upload(created_at);

CREATE TABLE blob (
    blob_id varchar(10) NOT NULL, storage_key varchar(512) NOT NULL, filename varchar(256) NOT NULL,
    content_type varchar(128) NOT NULL, byte_size bigint NOT NULL,
    dominant_color varchar(7), width integer, height integer,
    created_at timestamptz NOT NULL, created_by varchar(10) NOT NULL, created_by_agent varchar(64),
    updated_at timestamptz NOT NULL, updated_by varchar(10) NOT NULL, updated_by_agent varchar(64),
    deleted_at timestamptz, deleted_by varchar(10), deleted_by_agent varchar(64),
    CONSTRAINT blob_pkey PRIMARY KEY(blob_id)
    -- [jooq ignore start]
    , CONSTRAINT blob_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT blob_updated_by_iam_user_iam_user_id_fk FOREIGN KEY(updated_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT blob_deleted_by_iam_user_iam_user_id_fk FOREIGN KEY(deleted_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_blob_byte_size CHECK(byte_size>0)
    , CONSTRAINT ck_blob_dominant_color CHECK(dominant_color GLOB '#[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]')
    , CONSTRAINT ck_blob_size CHECK((width IS NULL AND height IS NULL) OR (width>0 AND height>0))
    -- [jooq ignore stop]
);
CREATE UNIQUE INDEX ux_blob_storage_key ON blob(storage_key);
CREATE INDEX ix_blob_deleted_at ON blob(deleted_at);

CREATE TABLE attachment (
    attachment_id varchar(10) NOT NULL, blob_id varchar(10) NOT NULL,
    owner_type varchar(16) NOT NULL, owner_id varchar(10) NOT NULL, position integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL, created_by varchar(10) NOT NULL, created_by_agent varchar(64),
    updated_at timestamptz NOT NULL, updated_by varchar(10) NOT NULL, updated_by_agent varchar(64),
    deleted_at timestamptz, deleted_by varchar(10), deleted_by_agent varchar(64),
    CONSTRAINT attachment_pkey PRIMARY KEY(attachment_id)
    -- [jooq ignore start]
    , CONSTRAINT attachment_blob_id_blob_blob_id_fk FOREIGN KEY(blob_id) REFERENCES blob(blob_id)
    , CONSTRAINT attachment_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT attachment_updated_by_iam_user_iam_user_id_fk FOREIGN KEY(updated_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT attachment_deleted_by_iam_user_iam_user_id_fk FOREIGN KEY(deleted_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_attachment_owner_type CHECK(owner_type IN ('issue','comment','user','workspace'))
    , CONSTRAINT ck_attachment_position CHECK(position>=0)
    -- [jooq ignore stop]
);
-- [jooq ignore start]
CREATE INDEX ix_attachment_owner ON attachment(owner_type,owner_id,position) WHERE deleted_at IS NULL;
-- [jooq ignore stop]
CREATE INDEX ix_attachment_blob_id ON attachment(blob_id);

-- Authentication only. Business modules add their tables in V2 and later.
CREATE TABLE iam_user (
    iam_user_id uuid NOT NULL,
    email varchar(256) NOT NULL,
    name varchar(64) NOT NULL,
    avatar_blob_id uuid,
    is_instance_admin boolean NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL,
    created_by uuid,
    updated_at timestamptz NOT NULL,
    updated_by uuid,
    deleted_at timestamptz,
    deleted_by uuid,
    CONSTRAINT iam_user_pkey PRIMARY KEY (iam_user_id)
    -- [jooq ignore start]
    , CONSTRAINT ck_iam_user_is_instance_admin CHECK (is_instance_admin IN (0, 1))
    , CONSTRAINT iam_user_created_by_iam_user_iam_user_id_fk FOREIGN KEY (created_by) REFERENCES iam_user (iam_user_id)
    , CONSTRAINT iam_user_updated_by_iam_user_iam_user_id_fk FOREIGN KEY (updated_by) REFERENCES iam_user (iam_user_id)
    , CONSTRAINT iam_user_deleted_by_iam_user_iam_user_id_fk FOREIGN KEY (deleted_by) REFERENCES iam_user (iam_user_id)
    -- [jooq ignore stop]
);
-- avatar_blob_id references the file module once that module exists.
-- [jooq ignore start]
CREATE UNIQUE INDEX ux_iam_user_email ON iam_user (email) WHERE deleted_at IS NULL;
-- [jooq ignore stop]

CREATE TABLE iam_session (
    iam_session_id uuid NOT NULL,
    iam_user_id uuid NOT NULL,
    token_hash varchar(128) NOT NULL,
    active_workspace_id uuid,
    expires_at timestamptz NOT NULL,
    absolute_expires_at timestamptz NOT NULL,
    last_seen_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL,
    CONSTRAINT iam_session_pkey PRIMARY KEY (iam_session_id)
    -- [jooq ignore start]
    , CONSTRAINT iam_session_iam_user_id_iam_user_iam_user_id_fk FOREIGN KEY (iam_user_id) REFERENCES iam_user (iam_user_id)
    -- [jooq ignore stop]
);
CREATE UNIQUE INDEX ux_iam_session_token_hash ON iam_session (token_hash);

CREATE TABLE iam_api_key (
    iam_api_key_id uuid NOT NULL,
    iam_user_id uuid NOT NULL,
    name varchar(64) NOT NULL,
    agent_name varchar(64),
    prefix varchar(16) NOT NULL,
    key_hash varchar(128) NOT NULL,
    last_used_at timestamptz,
    expires_at timestamptz,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL,
    CONSTRAINT iam_api_key_pkey PRIMARY KEY (iam_api_key_id)
    -- [jooq ignore start]
    , CONSTRAINT iam_api_key_iam_user_id_iam_user_iam_user_id_fk FOREIGN KEY (iam_user_id) REFERENCES iam_user (iam_user_id)
    -- [jooq ignore stop]
);
CREATE UNIQUE INDEX ux_iam_api_key_key_hash ON iam_api_key (key_hash);

CREATE TABLE iam_password (
    iam_user_id uuid NOT NULL,
    password_hash varchar(256) NOT NULL,
    failed_count integer NOT NULL DEFAULT 0,
    locked_until timestamptz,
    changed_at timestamptz NOT NULL,
    must_change boolean NOT NULL DEFAULT 0,
    CONSTRAINT iam_password_pkey PRIMARY KEY (iam_user_id)
    -- [jooq ignore start]
    , CONSTRAINT iam_password_iam_user_id_iam_user_iam_user_id_fk FOREIGN KEY (iam_user_id) REFERENCES iam_user (iam_user_id)
    , CONSTRAINT ck_iam_password_failed_count CHECK (failed_count >= 0)
    , CONSTRAINT ck_iam_password_must_change CHECK (must_change IN (0, 1))
    -- [jooq ignore stop]
);

CREATE TABLE iam_email_otp (
    iam_email_otp_id uuid NOT NULL,
    email varchar(256) NOT NULL,
    purpose varchar(16) NOT NULL,
    code_hash varchar(128) NOT NULL,
    attempt_count integer NOT NULL DEFAULT 0,
    expires_at timestamptz NOT NULL,
    consumed_at timestamptz,
    created_at timestamptz NOT NULL,
    CONSTRAINT iam_email_otp_pkey PRIMARY KEY (iam_email_otp_id)
    -- [jooq ignore start]
    , CONSTRAINT ck_iam_email_otp_purpose CHECK (purpose IN ('sign_in', 'password_reset'))
    , CONSTRAINT ck_iam_email_otp_attempt_count CHECK (attempt_count >= 0)
    -- [jooq ignore stop]
);
CREATE INDEX ix_iam_email_otp_email_created_at ON iam_email_otp (email, created_at);

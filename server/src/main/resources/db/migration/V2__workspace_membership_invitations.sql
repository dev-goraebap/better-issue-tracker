CREATE TABLE workspace (
    workspace_id uuid NOT NULL,
    name varchar(64) NOT NULL,
    slug varchar(64) NOT NULL,
    created_at timestamptz NOT NULL,
    created_by uuid NOT NULL,
    updated_at timestamptz NOT NULL,
    updated_by uuid NOT NULL,
    updated_by_agent varchar(64),
    deleted_at timestamptz,
    deleted_by uuid,
    CONSTRAINT workspace_pkey PRIMARY KEY (workspace_id)
    -- [jooq ignore start]
    , CONSTRAINT workspace_created_by_iam_user_iam_user_id_fk FOREIGN KEY (created_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT workspace_updated_by_iam_user_iam_user_id_fk FOREIGN KEY (updated_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT workspace_deleted_by_iam_user_iam_user_id_fk FOREIGN KEY (deleted_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_workspace_name CHECK (length(trim(name)) BETWEEN 1 AND 64)
    , CONSTRAINT ck_workspace_slug CHECK (length(slug) BETWEEN 2 AND 64 AND slug NOT GLOB '*[^a-z0-9-]*' AND substr(slug,1,1) GLOB '[a-z0-9]' AND substr(slug,-1,1) GLOB '[a-z0-9]')
    -- [jooq ignore stop]
);
CREATE UNIQUE INDEX ux_workspace_slug ON workspace(slug);
CREATE INDEX ix_workspace_created_at_workspace_id ON workspace(created_at, workspace_id);
CREATE TABLE workspace_member (
    workspace_member_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    iam_user_id uuid NOT NULL,
    role varchar(16) NOT NULL,
    joined_at timestamptz NOT NULL,
    CONSTRAINT workspace_member_pkey PRIMARY KEY (workspace_member_id)
    -- [jooq ignore start]
    , CONSTRAINT workspace_member_workspace_id_workspace_workspace_id_fk FOREIGN KEY (workspace_id) REFERENCES workspace(workspace_id)
    , CONSTRAINT workspace_member_iam_user_id_iam_user_iam_user_id_fk FOREIGN KEY (iam_user_id) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_workspace_member_role CHECK (role IN ('owner','admin','member','viewer'))
    -- [jooq ignore stop]
);
CREATE UNIQUE INDEX ux_workspace_member_workspace_id_iam_user_id ON workspace_member(workspace_id,iam_user_id);
-- [jooq ignore start]
CREATE UNIQUE INDEX ux_workspace_member_owner ON workspace_member(workspace_id) WHERE role='owner';
-- [jooq ignore stop]
CREATE INDEX ix_workspace_member_iam_user_id_workspace_id ON workspace_member(iam_user_id,workspace_id);
CREATE INDEX ix_workspace_member_workspace_id_joined_at_id ON workspace_member(workspace_id,joined_at,workspace_member_id);
CREATE TABLE workspace_invitation (
    workspace_invitation_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    email varchar(256) NOT NULL,
    role varchar(16) NOT NULL,
    token_hash varchar(128) NOT NULL,
    status varchar(16) NOT NULL,
    expires_at timestamptz NOT NULL,
    invited_by uuid NOT NULL,
    created_at timestamptz NOT NULL,
    accepted_by uuid,
    accepted_at timestamptz,
    revoked_by uuid,
    revoked_at timestamptz,
    CONSTRAINT workspace_invitation_pkey PRIMARY KEY (workspace_invitation_id)
    -- [jooq ignore start]
    , CONSTRAINT workspace_invitation_workspace_id_workspace_workspace_id_fk FOREIGN KEY (workspace_id) REFERENCES workspace(workspace_id)
    , CONSTRAINT workspace_invitation_invited_by_iam_user_iam_user_id_fk FOREIGN KEY (invited_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT workspace_invitation_accepted_by_iam_user_iam_user_id_fk FOREIGN KEY (accepted_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT workspace_invitation_revoked_by_iam_user_iam_user_id_fk FOREIGN KEY (revoked_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_workspace_invitation_role CHECK (role IN ('admin','member','viewer'))
    , CONSTRAINT ck_workspace_invitation_status CHECK (status IN ('pending','accepted','revoked','expired'))
    , CONSTRAINT ck_workspace_invitation_accepted CHECK (status <> 'accepted' OR (accepted_by IS NOT NULL AND accepted_at IS NOT NULL))
    , CONSTRAINT ck_workspace_invitation_revoked CHECK (status <> 'revoked' OR (revoked_by IS NOT NULL AND revoked_at IS NOT NULL))
    -- [jooq ignore stop]
);
CREATE UNIQUE INDEX ux_workspace_invitation_token_hash ON workspace_invitation(token_hash);
-- [jooq ignore start]
CREATE UNIQUE INDEX ux_workspace_invitation_pending ON workspace_invitation(workspace_id,email) WHERE status='pending';
-- [jooq ignore stop]
CREATE INDEX ix_workspace_invitation_workspace_id_created_at_id ON workspace_invitation(workspace_id,created_at,workspace_invitation_id);
CREATE INDEX ix_workspace_invitation_workspace_id_invited_by ON workspace_invitation(workspace_id,invited_by);
CREATE INDEX ix_iam_session_active_workspace_id_iam_user_id ON iam_session(active_workspace_id,iam_user_id);

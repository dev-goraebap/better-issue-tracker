-- A project connects to one repository per host (GitHub, GitLab, Gitea) with a token kept encrypted (D-028, D-087).
-- repository_integration is the connection; code_link ties an issue to what lives in the repository (its mirrored
-- issue, a branch, a pull or merge request, a commit); integration_rule names the column an event moves an issue to.
-- New ids are varchar(10) (D-083).
CREATE TABLE repository_integration (
    repository_integration_id varchar(10) NOT NULL, workspace_id varchar(10) NOT NULL, project_id varchar(10) NOT NULL,
    provider varchar(8) NOT NULL, base_url varchar(255) NOT NULL, repository varchar(255) NOT NULL,
    external_repository_id varchar(64), web_url varchar(500) NOT NULL,
    token_cipher text NOT NULL, webhook_secret_cipher text NOT NULL, webhook_id varchar(64), account_login varchar(128),
    syncs_issues boolean NOT NULL DEFAULT 1, comments_link boolean NOT NULL DEFAULT 1, is_active boolean NOT NULL DEFAULT 1,
    last_event_at timestamptz, last_error varchar(500),
    version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL, created_by varchar(10) NOT NULL, created_by_agent varchar(64),
    updated_at timestamptz NOT NULL, updated_by varchar(10) NOT NULL, updated_by_agent varchar(64),
    CONSTRAINT repository_integration_pkey PRIMARY KEY(repository_integration_id)
    -- [jooq ignore start]
    , CONSTRAINT repository_integration_project_workspace_fk FOREIGN KEY(project_id,workspace_id) REFERENCES project(project_id,workspace_id)
    , CONSTRAINT repository_integration_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT repository_integration_updated_by_iam_user_iam_user_id_fk FOREIGN KEY(updated_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_repository_integration_provider CHECK(provider IN ('github','gitlab','gitea'))
    , CONSTRAINT ck_repository_integration_repository CHECK(length(trim(repository)) BETWEEN 1 AND 255)
    , CONSTRAINT ck_repository_integration_version CHECK(version>=0)
    -- [jooq ignore stop]
);
CREATE UNIQUE INDEX ux_repository_integration_project_id_provider ON repository_integration(project_id,provider);

CREATE TABLE code_link (
    code_link_id varchar(10) NOT NULL, repository_integration_id varchar(10) NOT NULL, issue_id varchar(10) NOT NULL,
    kind varchar(16) NOT NULL, external_id varchar(255) NOT NULL, url varchar(1000) NOT NULL, title varchar(500) NOT NULL,
    state varchar(16) NOT NULL, author varchar(128), detail varchar(500),
    created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
    CONSTRAINT code_link_pkey PRIMARY KEY(code_link_id)
    -- [jooq ignore start]
    , CONSTRAINT code_link_repository_integration_id_repository_integration_repository_integration_id_fk
        FOREIGN KEY(repository_integration_id) REFERENCES repository_integration(repository_integration_id) ON DELETE CASCADE
    , CONSTRAINT code_link_issue_id_issue_issue_id_fk FOREIGN KEY(issue_id) REFERENCES issue(issue_id)
    , CONSTRAINT ck_code_link_kind CHECK(kind IN ('issue','branch','pull_request','commit'))
    , CONSTRAINT ck_code_link_state CHECK(state IN ('open','draft','merged','closed'))
    -- [jooq ignore stop]
);
CREATE UNIQUE INDEX ux_code_link_integration_kind_external_issue ON code_link(repository_integration_id,kind,external_id,issue_id);
CREATE INDEX ix_code_link_issue_id ON code_link(issue_id,kind,updated_at);

CREATE TABLE integration_rule (
    project_id varchar(10) NOT NULL, event varchar(16) NOT NULL, board_column_id varchar(10),
    updated_at timestamptz NOT NULL, updated_by varchar(10) NOT NULL,
    CONSTRAINT integration_rule_pkey PRIMARY KEY(project_id,event)
    -- [jooq ignore start]
    , CONSTRAINT integration_rule_project_id_project_project_id_fk FOREIGN KEY(project_id) REFERENCES project(project_id)
    , CONSTRAINT integration_rule_updated_by_iam_user_iam_user_id_fk FOREIGN KEY(updated_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_integration_rule_event CHECK(event IN ('branch_push','pr_opened','pr_merged','issue_opened','issue_closed'))
    -- [jooq ignore stop]
);

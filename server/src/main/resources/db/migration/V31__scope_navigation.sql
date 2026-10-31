CREATE TABLE navigation_scope (
 workspace_id varchar(10) NOT NULL, scope varchar(10) NOT NULL, entries text NOT NULL, version bigint NOT NULL,
 updated_at timestamptz NOT NULL, updated_by varchar(10) NOT NULL, updated_by_agent varchar(64),
 CONSTRAINT navigation_scope_pkey PRIMARY KEY(workspace_id,scope)
 -- [jooq ignore start]
 ,CONSTRAINT navigation_scope_workspace_id_workspace_workspace_id_fk FOREIGN KEY(workspace_id) REFERENCES workspace(workspace_id)
 -- [jooq ignore stop]
);
CREATE TABLE project_favorite (
 workspace_id varchar(10) NOT NULL, user_id varchar(10) NOT NULL, project_id varchar(10) NOT NULL,
 CONSTRAINT project_favorite_pkey PRIMARY KEY(workspace_id,user_id,project_id)
 -- [jooq ignore start]
 ,CONSTRAINT project_favorite_workspace_id_workspace_workspace_id_fk FOREIGN KEY(workspace_id) REFERENCES workspace(workspace_id)
 ,CONSTRAINT project_favorite_user_id_iam_user_user_id_fk FOREIGN KEY(user_id) REFERENCES iam_user(iam_user_id)
 ,CONSTRAINT project_favorite_project_id_project_project_id_fk FOREIGN KEY(project_id) REFERENCES project(project_id)
 -- [jooq ignore stop]
);

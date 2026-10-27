CREATE TABLE workspace_custom_role (
 workspace_custom_role_id varchar(10) NOT NULL,
 workspace_id varchar(10) NOT NULL,
 name varchar(64) NOT NULL,
 permissions text NOT NULL,
 version bigint NOT NULL DEFAULT 0,
 CONSTRAINT workspace_custom_role_pkey PRIMARY KEY (workspace_custom_role_id)
 -- [jooq ignore start]
 ,CONSTRAINT workspace_custom_role_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspace(workspace_id) ON DELETE CASCADE
 -- [jooq ignore stop]
);
-- [jooq ignore start]
CREATE UNIQUE INDEX ux_workspace_custom_role_workspace_name ON workspace_custom_role(workspace_id, lower(name));
-- [jooq ignore stop]
CREATE TABLE workspace_member_custom_role (
 workspace_member_id varchar(10) NOT NULL,
 workspace_custom_role_id varchar(10) NOT NULL,
 CONSTRAINT workspace_member_custom_role_pkey PRIMARY KEY (workspace_member_id)
 -- [jooq ignore start]
 ,CONSTRAINT workspace_member_custom_role_member_fk FOREIGN KEY (workspace_member_id) REFERENCES workspace_member(workspace_member_id) ON DELETE CASCADE
 ,CONSTRAINT workspace_member_custom_role_definition_fk FOREIGN KEY (workspace_custom_role_id) REFERENCES workspace_custom_role(workspace_custom_role_id) ON DELETE RESTRICT
 -- [jooq ignore stop]
);

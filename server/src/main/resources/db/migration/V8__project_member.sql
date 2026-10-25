-- Who belongs to a project (D-075): where a workspace member works, shown on the members page and changed there by
-- those who manage members. It grants nothing: every member of the workspace still reads every project.
CREATE TABLE project_member (
    project_member_id uuid NOT NULL,
    project_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    iam_user_id uuid NOT NULL,
    created_at timestamptz NOT NULL,
    created_by uuid NOT NULL,
    CONSTRAINT project_member_pkey PRIMARY KEY (project_member_id)
    -- [jooq ignore start]
    , CONSTRAINT project_member_project_workspace_fk FOREIGN KEY (project_id, workspace_id) REFERENCES project(project_id, workspace_id)
    , CONSTRAINT project_member_iam_user_id_iam_user_iam_user_id_fk FOREIGN KEY (iam_user_id) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT project_member_created_by_iam_user_iam_user_id_fk FOREIGN KEY (created_by) REFERENCES iam_user(iam_user_id)
    -- [jooq ignore stop]
);
CREATE UNIQUE INDEX ux_project_member_project_id_iam_user_id ON project_member(project_id, iam_user_id);
CREATE INDEX ix_project_member_workspace_id_iam_user_id ON project_member(workspace_id, iam_user_id);
-- Each project made so far starts with the member who made it, while they are still in its workspace.
-- [jooq ignore start]
INSERT INTO project_member(project_member_id, project_id, workspace_id, iam_user_id, created_at, created_by)
SELECT
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-'
        || substr('89ab',1+(abs(random())%4),1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))),
    p.project_id, p.workspace_id, p.created_by,
    strftime('%Y-%m-%dT%H:%M:%S','now') || substr(strftime('%f','now'),3) || '000Z', p.created_by
FROM project p
JOIN workspace_member m ON m.workspace_id = p.workspace_id AND m.iam_user_id = p.created_by
WHERE p.deleted_at IS NULL;
-- [jooq ignore stop]

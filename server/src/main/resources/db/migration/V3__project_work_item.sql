CREATE TABLE project (
    project_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    name varchar(64) NOT NULL,
    icon varchar(32),
    description text,
    position integer NOT NULL,
    last_work_item_number bigint NOT NULL DEFAULT 0,
    last_decision_number bigint NOT NULL DEFAULT 0,
    last_session_number bigint NOT NULL DEFAULT 0,
    archived_at timestamptz,
    version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL, created_by uuid NOT NULL, created_by_agent varchar(64),
    updated_at timestamptz NOT NULL, updated_by uuid NOT NULL, updated_by_agent varchar(64),
    deleted_at timestamptz, deleted_by uuid, deleted_by_agent varchar(64),
    CONSTRAINT project_pkey PRIMARY KEY(project_id),
    CONSTRAINT ux_project_project_id_workspace_id UNIQUE(project_id,workspace_id)
    -- [jooq ignore start]
    , CONSTRAINT project_workspace_id_workspace_workspace_id_fk FOREIGN KEY(workspace_id) REFERENCES workspace(workspace_id)
    , CONSTRAINT project_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT project_updated_by_iam_user_iam_user_id_fk FOREIGN KEY(updated_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT project_deleted_by_iam_user_iam_user_id_fk FOREIGN KEY(deleted_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_project_name CHECK(length(trim(name)) BETWEEN 1 AND 64)
    , CONSTRAINT ck_project_description CHECK(description IS NULL OR length(description)<=20000)
    , CONSTRAINT ck_project_position CHECK(position>=0)
    , CONSTRAINT ck_project_counters CHECK(last_work_item_number>=0 AND last_decision_number>=0 AND last_session_number>=0 AND version>=0)
    -- [jooq ignore stop]
);
CREATE INDEX ix_project_workspace_id_created_at_id ON project(workspace_id,created_at,project_id);
CREATE INDEX ix_project_workspace_id_position ON project(workspace_id,position,project_id);

CREATE TABLE project_key (
    project_key_id uuid NOT NULL, project_id uuid NOT NULL, workspace_id uuid NOT NULL,
    key varchar(10) NOT NULL, is_current boolean NOT NULL, created_at timestamptz NOT NULL,
    CONSTRAINT project_key_pkey PRIMARY KEY(project_key_id)
    -- [jooq ignore start]
    , CONSTRAINT project_key_project_workspace_fk FOREIGN KEY(project_id,workspace_id) REFERENCES project(project_id,workspace_id)
    , CONSTRAINT ck_project_key_key CHECK(length(key) BETWEEN 2 AND 10 AND key NOT GLOB '*[^A-Z0-9]*')
    , CONSTRAINT ck_project_key_is_current CHECK(is_current IN (0,1))
    -- [jooq ignore stop]
);
CREATE UNIQUE INDEX ux_project_key_workspace_id_key ON project_key(workspace_id,key);
-- [jooq ignore start]
CREATE UNIQUE INDEX ux_project_key_project_id_current ON project_key(project_id) WHERE is_current=1;
-- [jooq ignore stop]
CREATE INDEX ix_project_key_project_id ON project_key(project_id);

CREATE TABLE board_column (
    board_column_id uuid NOT NULL, project_id uuid NOT NULL,
    name varchar(32) NOT NULL, position integer NOT NULL, color varchar(7), is_final boolean NOT NULL,
    version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL, created_by uuid NOT NULL, created_by_agent varchar(64),
    updated_at timestamptz NOT NULL, updated_by uuid NOT NULL, updated_by_agent varchar(64),
    deleted_at timestamptz, deleted_by uuid, deleted_by_agent varchar(64),
    CONSTRAINT board_column_pkey PRIMARY KEY(board_column_id),
    CONSTRAINT ux_board_column_project_id_id UNIQUE(project_id,board_column_id)
    -- [jooq ignore start]
    , CONSTRAINT board_column_project_id_project_project_id_fk FOREIGN KEY(project_id) REFERENCES project(project_id)
    , CONSTRAINT board_column_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT board_column_updated_by_iam_user_iam_user_id_fk FOREIGN KEY(updated_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT board_column_deleted_by_iam_user_iam_user_id_fk FOREIGN KEY(deleted_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_board_column_name CHECK(length(trim(name)) BETWEEN 1 AND 32)
    , CONSTRAINT ck_board_column_position CHECK(position>=0)
    , CONSTRAINT ck_board_column_color CHECK(color IS NULL OR (length(color)=7 AND substr(color,1,1)='#' AND substr(color,2) NOT GLOB '*[^a-fA-F0-9]*'))
    , CONSTRAINT ck_board_column_is_final CHECK(is_final IN (0,1))
    , CONSTRAINT ck_board_column_version CHECK(version>=0)
    -- [jooq ignore stop]
);
CREATE INDEX ix_board_column_project_id_position ON board_column(project_id,position,board_column_id);

CREATE TABLE work_item (
    work_item_id uuid NOT NULL, project_id uuid NOT NULL, number bigint NOT NULL,
    title varchar(200) NOT NULL, description text, board_column_id uuid, position real NOT NULL,
    priority varchar(8), trigger_type varchar(16), assignee_id uuid, start_date date, due_date date,
    closed_at timestamptz, archived_at timestamptz, version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL, created_by uuid NOT NULL, created_by_agent varchar(64),
    updated_at timestamptz NOT NULL, updated_by uuid NOT NULL, updated_by_agent varchar(64),
    deleted_at timestamptz, deleted_by uuid, deleted_by_agent varchar(64),
    CONSTRAINT work_item_pkey PRIMARY KEY(work_item_id)
    -- [jooq ignore start]
    , CONSTRAINT work_item_project_id_project_project_id_fk FOREIGN KEY(project_id) REFERENCES project(project_id)
    , CONSTRAINT work_item_project_column_fk FOREIGN KEY(project_id,board_column_id) REFERENCES board_column(project_id,board_column_id)
    , CONSTRAINT work_item_assignee_id_iam_user_iam_user_id_fk FOREIGN KEY(assignee_id) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT work_item_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT work_item_updated_by_iam_user_iam_user_id_fk FOREIGN KEY(updated_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT work_item_deleted_by_iam_user_iam_user_id_fk FOREIGN KEY(deleted_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_work_item_title CHECK(length(trim(title)) BETWEEN 1 AND 200)
    , CONSTRAINT ck_work_item_description CHECK(description IS NULL OR length(description)<=20000)
    , CONSTRAINT ck_work_item_number CHECK(number>0)
    , CONSTRAINT ck_work_item_priority CHECK(priority IS NULL OR priority IN ('low','medium','high','urgent'))
    , CONSTRAINT ck_work_item_trigger_type CHECK(trigger_type IS NULL OR trigger_type IN ('request','finding','external','improvement','planned'))
    , CONSTRAINT ck_work_item_date_range CHECK(start_date IS NULL OR due_date IS NULL OR start_date<=due_date)
    , CONSTRAINT ck_work_item_version CHECK(version>=0)
    , CONSTRAINT ck_work_item_backlog_closed CHECK(board_column_id IS NOT NULL OR closed_at IS NULL)
    -- [jooq ignore stop]
);
CREATE UNIQUE INDEX ux_work_item_project_id_number ON work_item(project_id,number);
CREATE INDEX ix_work_item_board_column_id_position ON work_item(project_id,board_column_id,position,work_item_id);
CREATE INDEX ix_work_item_project_id_created_at_id ON work_item(project_id,created_at,work_item_id);
CREATE INDEX ix_work_item_project_id_position ON work_item(project_id,position,work_item_id);
CREATE INDEX ix_work_item_assignee_id_created_at_id ON work_item(assignee_id,created_at,work_item_id);
CREATE INDEX ix_work_item_project_id_due_date_id ON work_item(project_id,due_date,work_item_id);

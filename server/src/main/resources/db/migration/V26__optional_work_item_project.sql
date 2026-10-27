-- The workspace owns a work item; project membership is optional. Frozen refs preserve identity after moving.
ALTER TABLE work_item ADD COLUMN workspace_id varchar(10);
ALTER TABLE work_item ADD COLUMN public_ref varchar(240);
ALTER TABLE work_item ADD COLUMN workspace_status varchar(8);

-- [jooq ignore start]
PRAGMA defer_foreign_keys = ON;
UPDATE work_item SET workspace_id=(SELECT workspace_id FROM project WHERE project.project_id=work_item.project_id);
CREATE TABLE work_item_new (
    work_item_id uuid NOT NULL, project_id uuid, number bigint NOT NULL,
    kind varchar(8) NOT NULL DEFAULT 'task',
    title varchar(200) NOT NULL, description text, board_column_id uuid, position real NOT NULL,
    priority varchar(8), trigger_type varchar(16), start_date date, due_date date,
    starts_at timestamptz, ends_at timestamptz, all_day boolean NOT NULL DEFAULT 0,
    closed_at timestamptz, archived_at timestamptz, version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL, created_by uuid NOT NULL, created_by_agent varchar(64),
    updated_at timestamptz NOT NULL, updated_by uuid NOT NULL, updated_by_agent varchar(64),
    deleted_at timestamptz, deleted_by uuid, deleted_by_agent varchar(64), recurrence_id varchar(10)
     CONSTRAINT work_item_recurrence_id_recurrence_recurrence_id_fk REFERENCES recurrence(recurrence_id) , occurrence_on date, reminder_minutes integer
     CONSTRAINT ck_work_item_reminder_minutes CHECK(reminder_minutes IS NULL OR reminder_minutes BETWEEN 0 AND 10080) ,
    workspace_id varchar(10) NOT NULL, public_ref varchar(240), workspace_status varchar(8),
    CONSTRAINT work_item_workspace_id_workspace_workspace_id_fk FOREIGN KEY(workspace_id) REFERENCES workspace(workspace_id),
    CONSTRAINT ck_work_item_workspace_status CHECK(workspace_status IS NULL OR workspace_status IN ('todo','doing','done')),
    CONSTRAINT work_item_pkey PRIMARY KEY(work_item_id)
    
    , CONSTRAINT work_item_project_id_project_project_id_fk FOREIGN KEY(project_id) REFERENCES project(project_id)
    , CONSTRAINT work_item_project_column_fk FOREIGN KEY(project_id,board_column_id) REFERENCES board_column(project_id,board_column_id)
    , CONSTRAINT work_item_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT work_item_updated_by_iam_user_iam_user_id_fk FOREIGN KEY(updated_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT work_item_deleted_by_iam_user_iam_user_id_fk FOREIGN KEY(deleted_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_work_item_kind CHECK(kind IN ('task','event'))
    , CONSTRAINT ck_work_item_title CHECK(length(trim(title)) BETWEEN 1 AND 200)
    , CONSTRAINT ck_work_item_description CHECK(description IS NULL OR length(description)<=20000)
    , CONSTRAINT ck_work_item_number CHECK(number>0)
    , CONSTRAINT ck_work_item_priority CHECK(priority IS NULL OR priority IN ('low','medium','high','urgent'))
    , CONSTRAINT ck_work_item_trigger_type CHECK(trigger_type IS NULL OR trigger_type IN ('request','finding','external','improvement','planned'))
    , CONSTRAINT ck_work_item_date_range CHECK(start_date IS NULL OR due_date IS NULL OR start_date<=due_date)
    , CONSTRAINT ck_work_item_time_range CHECK(starts_at IS NULL OR ends_at IS NULL OR starts_at<=ends_at)
    , CONSTRAINT ck_work_item_all_day CHECK(all_day IN (0,1))
    , CONSTRAINT ck_work_item_event_shape CHECK(kind='event'
        OR (starts_at IS NULL AND ends_at IS NULL AND all_day=0))
    , CONSTRAINT ck_work_item_event_column CHECK(kind='task' OR (board_column_id IS NULL AND closed_at IS NULL))
    , CONSTRAINT ck_work_item_event_times CHECK(kind='task' OR all_day=1 OR (start_date IS NULL AND due_date IS NULL))
    , CONSTRAINT ck_work_item_version CHECK(version>=0)
    , CONSTRAINT ck_work_item_backlog_closed CHECK(board_column_id IS NOT NULL OR closed_at IS NULL OR (project_id IS NULL AND workspace_status='done'))
    
);
INSERT INTO work_item_new SELECT * FROM work_item;
CREATE TABLE migration_work_item_label AS SELECT * FROM work_item_label;
DROP TABLE work_item_label;
CREATE TABLE migration_code_link AS SELECT * FROM code_link;
DROP TABLE code_link;
CREATE TABLE migration_work_item_person AS SELECT * FROM work_item_person;
DROP TABLE work_item_person;
DROP TABLE work_item;
ALTER TABLE work_item_new RENAME TO work_item;
CREATE TABLE work_item_label (
    work_item_label_id uuid NOT NULL, work_item_id uuid NOT NULL, label_id uuid NOT NULL,
    created_at timestamptz NOT NULL, created_by uuid NOT NULL, created_by_agent varchar(64),
    CONSTRAINT work_item_label_pkey PRIMARY KEY(work_item_label_id)
    
    , CONSTRAINT work_item_label_work_item_id_work_item_work_item_id_fk FOREIGN KEY(work_item_id) REFERENCES work_item(work_item_id)
    , CONSTRAINT work_item_label_label_id_label_label_id_fk FOREIGN KEY(label_id) REFERENCES label(label_id)
    , CONSTRAINT work_item_label_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    
);
INSERT INTO work_item_label SELECT * FROM migration_work_item_label;
DROP TABLE migration_work_item_label;
CREATE UNIQUE INDEX ux_work_item_label_work_item_id_label_id ON work_item_label(work_item_id,label_id);
CREATE INDEX ix_work_item_label_label_id_work_item_id ON work_item_label(label_id,work_item_id);
CREATE TABLE code_link (
    code_link_id varchar(10) NOT NULL, repository_integration_id varchar(10) NOT NULL, work_item_id varchar(10) NOT NULL,
    kind varchar(16) NOT NULL, external_id varchar(255) NOT NULL, url varchar(1000) NOT NULL, title varchar(500) NOT NULL,
    state varchar(16) NOT NULL, author varchar(128), detail varchar(500),
    created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
    CONSTRAINT code_link_pkey PRIMARY KEY(code_link_id)
    
    , CONSTRAINT code_link_repository_integration_id_repository_integration_repository_integration_id_fk
        FOREIGN KEY(repository_integration_id) REFERENCES repository_integration(repository_integration_id) ON DELETE CASCADE
    , CONSTRAINT code_link_work_item_id_work_item_work_item_id_fk FOREIGN KEY(work_item_id) REFERENCES work_item(work_item_id)
    , CONSTRAINT ck_code_link_kind CHECK(kind IN ('issue','branch','pull_request','commit'))
    , CONSTRAINT ck_code_link_state CHECK(state IN ('open','draft','merged','closed'))
    
);
INSERT INTO code_link SELECT * FROM migration_code_link;
DROP TABLE migration_code_link;
CREATE UNIQUE INDEX ux_code_link_integration_kind_external_work_item
    ON code_link(repository_integration_id,kind,external_id,work_item_id);
CREATE INDEX ix_code_link_work_item_id ON code_link(work_item_id,kind,updated_at);
CREATE TABLE work_item_person (
    work_item_person_id varchar(10) NOT NULL, work_item_id varchar(10) NOT NULL, iam_user_id varchar(10) NOT NULL,
    created_at timestamptz NOT NULL, created_by varchar(10) NOT NULL, created_by_agent varchar(64),
    CONSTRAINT work_item_person_pkey PRIMARY KEY(work_item_person_id)
    
    , CONSTRAINT work_item_person_work_item_id_work_item_work_item_id_fk FOREIGN KEY(work_item_id) REFERENCES work_item(work_item_id)
    , CONSTRAINT work_item_person_iam_user_id_iam_user_iam_user_id_fk FOREIGN KEY(iam_user_id) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT work_item_person_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    
);
INSERT INTO work_item_person SELECT * FROM migration_work_item_person;
DROP TABLE migration_work_item_person;
CREATE UNIQUE INDEX ux_work_item_person_work_item_id_iam_user_id ON work_item_person(work_item_id,iam_user_id);
CREATE INDEX ix_work_item_person_iam_user_id_work_item_id ON work_item_person(iam_user_id,work_item_id);
CREATE UNIQUE INDEX ux_work_item_project_id_number ON work_item(project_id,number) WHERE public_ref IS NULL;
CREATE INDEX ix_work_item_board_column_id_position ON work_item(project_id,board_column_id,position,work_item_id);
CREATE INDEX ix_work_item_project_id_created_at_id ON work_item(project_id,created_at,work_item_id);
CREATE INDEX ix_work_item_project_id_position ON work_item(project_id,position,work_item_id);
CREATE INDEX ix_work_item_project_id_due_date_id ON work_item(project_id,due_date,work_item_id);
CREATE INDEX ix_work_item_project_id_starts_at_id ON work_item(project_id,starts_at,work_item_id);
CREATE UNIQUE INDEX ux_work_item_recurrence_id_occurrence_on ON work_item(recurrence_id,occurrence_on) WHERE recurrence_id IS NOT NULL;
CREATE UNIQUE INDEX ux_work_item_workspace_public_ref ON work_item(workspace_id,public_ref) WHERE public_ref IS NOT NULL;
CREATE INDEX ix_work_item_workspace_created ON work_item(workspace_id,created_at,work_item_id);


-- [jooq ignore stop]

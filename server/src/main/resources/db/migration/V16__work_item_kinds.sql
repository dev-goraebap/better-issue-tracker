-- A work item is a task or an event (D-092). A task has a column on the board, people who do it and a date range; an
-- event has no column, people who attend it and either a timed range (starts_at, ends_at) or whole days (all_day, with
-- start_date and due_date). Both take any number of people, so the single assignee_id becomes work_item_person.
-- work_item is rebuilt: SQLite cannot drop a column used by a foreign key, and its CHECKs change. The rows wait in a
-- plain copy while the table is dropped and made again, so H2 (jOOQ) sees no clash of constraint names; the labels,
-- people and code links that point at a work item meet the same ids again before the transaction commits.
-- [jooq ignore start]
PRAGMA defer_foreign_keys = ON;
CREATE TABLE work_item_copy AS SELECT * FROM work_item;
-- [jooq ignore stop]
DROP TABLE work_item;
CREATE TABLE work_item (
    work_item_id uuid NOT NULL, project_id uuid NOT NULL, number bigint NOT NULL,
    kind varchar(8) NOT NULL DEFAULT 'task',
    title varchar(200) NOT NULL, description text, board_column_id uuid, position real NOT NULL,
    priority varchar(8), trigger_type varchar(16), start_date date, due_date date,
    starts_at timestamptz, ends_at timestamptz, all_day boolean NOT NULL DEFAULT 0,
    closed_at timestamptz, archived_at timestamptz, version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL, created_by uuid NOT NULL, created_by_agent varchar(64),
    updated_at timestamptz NOT NULL, updated_by uuid NOT NULL, updated_by_agent varchar(64),
    deleted_at timestamptz, deleted_by uuid, deleted_by_agent varchar(64),
    CONSTRAINT work_item_pkey PRIMARY KEY(work_item_id)
    -- [jooq ignore start]
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
    , CONSTRAINT ck_work_item_backlog_closed CHECK(board_column_id IS NOT NULL OR closed_at IS NULL)
    -- [jooq ignore stop]
);
-- [jooq ignore start]
INSERT INTO work_item (
    work_item_id, project_id, number, kind, title, description, board_column_id, position, priority, trigger_type,
    start_date, due_date, closed_at, archived_at, version, created_at, created_by, created_by_agent,
    updated_at, updated_by, updated_by_agent, deleted_at, deleted_by, deleted_by_agent)
SELECT
    work_item_id, project_id, number, 'task', title, description, board_column_id, position, priority, trigger_type,
    start_date, due_date, closed_at, archived_at, version, created_at, created_by, created_by_agent,
    updated_at, updated_by, updated_by_agent, deleted_at, deleted_by, deleted_by_agent
FROM work_item_copy;
-- [jooq ignore stop]
CREATE UNIQUE INDEX ux_work_item_project_id_number ON work_item(project_id,number);
CREATE INDEX ix_work_item_board_column_id_position ON work_item(project_id,board_column_id,position,work_item_id);
CREATE INDEX ix_work_item_project_id_created_at_id ON work_item(project_id,created_at,work_item_id);
CREATE INDEX ix_work_item_project_id_position ON work_item(project_id,position,work_item_id);
CREATE INDEX ix_work_item_project_id_due_date_id ON work_item(project_id,due_date,work_item_id);
CREATE INDEX ix_work_item_project_id_starts_at_id ON work_item(project_id,starts_at,work_item_id);

CREATE TABLE work_item_person (
    work_item_person_id varchar(10) NOT NULL, work_item_id varchar(10) NOT NULL, iam_user_id varchar(10) NOT NULL,
    created_at timestamptz NOT NULL, created_by varchar(10) NOT NULL, created_by_agent varchar(64),
    CONSTRAINT work_item_person_pkey PRIMARY KEY(work_item_person_id)
    -- [jooq ignore start]
    , CONSTRAINT work_item_person_work_item_id_work_item_work_item_id_fk FOREIGN KEY(work_item_id) REFERENCES work_item(work_item_id)
    , CONSTRAINT work_item_person_iam_user_id_iam_user_iam_user_id_fk FOREIGN KEY(iam_user_id) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT work_item_person_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    -- [jooq ignore stop]
);
CREATE UNIQUE INDEX ux_work_item_person_work_item_id_iam_user_id ON work_item_person(work_item_id,iam_user_id);
CREATE INDEX ix_work_item_person_iam_user_id_work_item_id ON work_item_person(iam_user_id,work_item_id);
-- [jooq ignore start]
-- A person row needs a ten-character id that starts with a letter (D-083); SQL makes one from random bytes.
INSERT INTO work_item_person (work_item_person_id, work_item_id, iam_user_id, created_at, created_by, created_by_agent)
SELECT
    char(65 + abs(random()) % 26) || substr(lower(hex(randomblob(8))), 1, 9),
    work_item_id, assignee_id, updated_at, updated_by, updated_by_agent
FROM work_item_copy
WHERE assignee_id IS NOT NULL;
DROP TABLE work_item_copy;
-- [jooq ignore stop]

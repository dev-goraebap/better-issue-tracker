-- Recurrence (D-092): a rule makes a separate work item for each occurrence from its own copy of a work item (the
-- template: kind, title, description, priority, people, labels, start time and length), so every occurrence keeps its
-- own notes, comments and links. An occurrence remembers its rule and day; the day is unique per rule, deleted ones
-- included, so a cancelled occurrence is not made again. Times are the rule's own time zone, so 10:00 stays 10:00.
CREATE TABLE recurrence (
    recurrence_id varchar(10) NOT NULL, workspace_id varchar(10) NOT NULL, project_id varchar(10) NOT NULL,
    frequency varchar(8) NOT NULL, interval_count integer NOT NULL DEFAULT 1, weekdays varchar(32),
    starts_on date NOT NULL, until_on date, time_zone varchar(64) NOT NULL,
    kind varchar(8) NOT NULL, title varchar(200) NOT NULL, description text, priority varchar(8),
    people_ids text NOT NULL, label_ids text NOT NULL, board_column_id varchar(10),
    date_parts varchar(8) NOT NULL DEFAULT 'none', span_days integer NOT NULL DEFAULT 0,
    start_time varchar(5), duration_minutes integer, all_day boolean NOT NULL DEFAULT 0,
    version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL, created_by varchar(10) NOT NULL, created_by_agent varchar(64),
    updated_at timestamptz NOT NULL, updated_by varchar(10) NOT NULL, updated_by_agent varchar(64),
    deleted_at timestamptz, deleted_by varchar(10), deleted_by_agent varchar(64),
    CONSTRAINT recurrence_pkey PRIMARY KEY(recurrence_id)
    -- [jooq ignore start]
    , CONSTRAINT recurrence_workspace_id_workspace_workspace_id_fk FOREIGN KEY(workspace_id) REFERENCES workspace(workspace_id)
    , CONSTRAINT recurrence_project_id_project_project_id_fk FOREIGN KEY(project_id) REFERENCES project(project_id)
    , CONSTRAINT recurrence_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT recurrence_updated_by_iam_user_iam_user_id_fk FOREIGN KEY(updated_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT recurrence_deleted_by_iam_user_iam_user_id_fk FOREIGN KEY(deleted_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_recurrence_frequency CHECK(frequency IN ('daily','weekly','monthly'))
    , CONSTRAINT ck_recurrence_interval_count CHECK(interval_count BETWEEN 1 AND 52)
    , CONSTRAINT ck_recurrence_until_on CHECK(until_on IS NULL OR until_on>=starts_on)
    , CONSTRAINT ck_recurrence_kind CHECK(kind IN ('task','event'))
    , CONSTRAINT ck_recurrence_title CHECK(length(trim(title)) BETWEEN 1 AND 200)
    , CONSTRAINT ck_recurrence_people_ids CHECK(json_valid(people_ids) AND json_type(people_ids)='array')
    , CONSTRAINT ck_recurrence_label_ids CHECK(json_valid(label_ids) AND json_type(label_ids)='array')
    , CONSTRAINT ck_recurrence_duration_minutes CHECK(duration_minutes IS NULL OR duration_minutes BETWEEN 0 AND 10080)
    , CONSTRAINT ck_recurrence_date_parts CHECK(date_parts IN ('none','start','due','both'))
    , CONSTRAINT ck_recurrence_span_days CHECK(span_days BETWEEN 0 AND 366)
    , CONSTRAINT ck_recurrence_all_day CHECK(all_day IN (0,1))
    , CONSTRAINT ck_recurrence_version CHECK(version>=0)
    -- [jooq ignore stop]
);
CREATE INDEX ix_recurrence_project_id ON recurrence(project_id);
CREATE INDEX ix_recurrence_until_on ON recurrence(until_on);

ALTER TABLE work_item ADD COLUMN recurrence_id varchar(10)
    /* [jooq ignore start] */ CONSTRAINT work_item_recurrence_id_recurrence_recurrence_id_fk REFERENCES recurrence(recurrence_id) /* [jooq ignore stop] */;
ALTER TABLE work_item ADD COLUMN occurrence_on date;
-- [jooq ignore start]
CREATE UNIQUE INDEX ux_work_item_recurrence_id_occurrence_on ON work_item(recurrence_id,occurrence_on) WHERE recurrence_id IS NOT NULL;
-- [jooq ignore stop]

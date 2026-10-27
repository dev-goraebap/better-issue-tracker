-- Notices (D-092, BIT-39): what happened to a member's work items, kept for them in the inbox and, when mail is set up,
-- sent by mail too. A notice says itself in words when it is made (title and body), so the inbox and the mail read the
-- same; dedupe_key keeps a job's notice (an event's reminder, a due day) to one per member however often it runs.
CREATE TABLE notification (
    notification_id varchar(10) NOT NULL, workspace_id varchar(10) NOT NULL, project_id varchar(10),
    recipient_id varchar(10) NOT NULL, type varchar(32) NOT NULL,
    target_type varchar(16) NOT NULL, target_id varchar(10) NOT NULL,
    actor_id varchar(10), actor_agent varchar(64),
    title varchar(300) NOT NULL, body varchar(500) NOT NULL, dedupe_key varchar(96),
    read_at timestamptz, mailed_at timestamptz, created_at timestamptz NOT NULL,
    CONSTRAINT notification_pkey PRIMARY KEY(notification_id)
    -- [jooq ignore start]
    , CONSTRAINT notification_workspace_id_workspace_workspace_id_fk FOREIGN KEY(workspace_id) REFERENCES workspace(workspace_id)
    , CONSTRAINT notification_recipient_id_iam_user_iam_user_id_fk FOREIGN KEY(recipient_id) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_notification_type CHECK(type IN ('assigned','invited','commented','rescheduled','due_today','event_reminder'))
    , CONSTRAINT ck_notification_target_type CHECK(target_type IN ('work_item'))
    -- [jooq ignore stop]
);
CREATE INDEX ix_notification_recipient_id_workspace_id_created_at ON notification(recipient_id,workspace_id,created_at);
CREATE INDEX ix_notification_mailed_at_created_at ON notification(mailed_at,created_at);
-- [jooq ignore start]
CREATE UNIQUE INDEX ux_notification_recipient_id_dedupe_key ON notification(recipient_id,dedupe_key) WHERE dedupe_key IS NOT NULL;
-- [jooq ignore stop]

-- An event's reminder, minutes before it starts (none when null); its occurrences take their rule's.
ALTER TABLE work_item ADD COLUMN reminder_minutes integer
    /* [jooq ignore start] */ CONSTRAINT ck_work_item_reminder_minutes CHECK(reminder_minutes IS NULL OR reminder_minutes BETWEEN 0 AND 10080) /* [jooq ignore stop] */;
ALTER TABLE recurrence ADD COLUMN reminder_minutes integer;

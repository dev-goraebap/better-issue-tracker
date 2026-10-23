-- T-005 adds traceable decisions and session records without changing V1-V3.
CREATE TABLE decision (
    decision_id uuid NOT NULL, project_id uuid NOT NULL, number bigint NOT NULL,
    title varchar(200) NOT NULL, body text NOT NULL, rejected_alternatives text,
    status varchar(16) NOT NULL, trigger_type varchar(16),
    accepted_at timestamptz, superseded_at timestamptz, version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL, created_by uuid NOT NULL, created_by_agent varchar(64),
    updated_at timestamptz NOT NULL, updated_by uuid NOT NULL, updated_by_agent varchar(64),
    deleted_at timestamptz, deleted_by uuid, deleted_by_agent varchar(64),
    CONSTRAINT decision_pkey PRIMARY KEY(decision_id),
    CONSTRAINT ux_decision_project_id_number UNIQUE(project_id,number)
    -- [jooq ignore start]
    , CONSTRAINT decision_project_id_project_project_id_fk FOREIGN KEY(project_id) REFERENCES project(project_id)
    , CONSTRAINT decision_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT decision_updated_by_iam_user_iam_user_id_fk FOREIGN KEY(updated_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT decision_deleted_by_iam_user_iam_user_id_fk FOREIGN KEY(deleted_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_decision_title CHECK(length(trim(title)) BETWEEN 1 AND 200)
    , CONSTRAINT ck_decision_body CHECK(length(trim(body)) BETWEEN 1 AND 20000)
    , CONSTRAINT ck_decision_rejected_alternatives CHECK(rejected_alternatives IS NULL OR length(rejected_alternatives)<=20000)
    , CONSTRAINT ck_decision_status CHECK(status IN ('proposed','accepted','superseded'))
    , CONSTRAINT ck_decision_state_times CHECK((status='proposed' AND accepted_at IS NULL AND superseded_at IS NULL) OR (status='accepted' AND accepted_at IS NOT NULL AND superseded_at IS NULL) OR (status='superseded' AND accepted_at IS NOT NULL AND superseded_at IS NOT NULL))
    , CONSTRAINT ck_decision_trigger_type CHECK(trigger_type IS NULL OR trigger_type IN ('request','finding','external','improvement','planned'))
    , CONSTRAINT ck_decision_number_version CHECK(number>0 AND version>=0)
    -- [jooq ignore stop]
);
CREATE INDEX ix_decision_project_id_created_at_id ON decision(project_id,created_at,decision_id);
CREATE INDEX ix_decision_project_id_status_created_at_id ON decision(project_id,status,created_at,decision_id);

CREATE TABLE session_record (
    session_record_id uuid NOT NULL, project_id uuid NOT NULL, number bigint NOT NULL,
    type varchar(16) NOT NULL, title varchar(200) NOT NULL, summary text NOT NULL,
    occurred_at timestamptz NOT NULL, version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL, created_by uuid NOT NULL, created_by_agent varchar(64),
    updated_at timestamptz NOT NULL, updated_by uuid NOT NULL, updated_by_agent varchar(64),
    deleted_at timestamptz, deleted_by uuid, deleted_by_agent varchar(64),
    CONSTRAINT session_record_pkey PRIMARY KEY(session_record_id),
    CONSTRAINT ux_session_record_project_id_number UNIQUE(project_id,number)
    -- [jooq ignore start]
    , CONSTRAINT session_record_project_id_project_project_id_fk FOREIGN KEY(project_id) REFERENCES project(project_id)
    , CONSTRAINT session_record_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT session_record_updated_by_iam_user_iam_user_id_fk FOREIGN KEY(updated_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT session_record_deleted_by_iam_user_iam_user_id_fk FOREIGN KEY(deleted_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_session_record_title CHECK(length(trim(title)) BETWEEN 1 AND 200)
    , CONSTRAINT ck_session_record_summary CHECK(length(trim(summary)) BETWEEN 1 AND 100000)
    , CONSTRAINT ck_session_record_type CHECK(type IN ('meeting','agent_session'))
    , CONSTRAINT ck_session_record_number_version CHECK(number>0 AND version>=0)
    -- [jooq ignore stop]
);
CREATE INDEX ix_session_record_project_id_created_at_id ON session_record(project_id,created_at,session_record_id);
CREATE INDEX ix_session_record_project_id_occurred_at_id ON session_record(project_id,occurred_at,session_record_id);
CREATE INDEX ix_session_record_project_id_type_created_at_id ON session_record(project_id,type,created_at,session_record_id);

CREATE TABLE session_participant (
    session_participant_id uuid NOT NULL, session_record_id uuid NOT NULL,
    kind varchar(8) NOT NULL, iam_user_id uuid, display_name varchar(64) NOT NULL, created_at timestamptz NOT NULL,
    CONSTRAINT session_participant_pkey PRIMARY KEY(session_participant_id)
    -- [jooq ignore start]
    , CONSTRAINT session_participant_session_record_id_session_record_session_record_id_fk FOREIGN KEY(session_record_id) REFERENCES session_record(session_record_id)
    , CONSTRAINT session_participant_iam_user_id_iam_user_iam_user_id_fk FOREIGN KEY(iam_user_id) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_session_participant_kind CHECK(kind IN ('user','agent','guest'))
    , CONSTRAINT ck_session_participant_identity CHECK((kind='user' AND iam_user_id IS NOT NULL) OR (kind<>'user' AND iam_user_id IS NULL))
    , CONSTRAINT ck_session_participant_display_name CHECK(length(trim(display_name)) BETWEEN 1 AND 64)
    -- [jooq ignore stop]
);
CREATE INDEX ix_session_participant_session_record_id ON session_participant(session_record_id);
CREATE UNIQUE INDEX ux_session_participant_session_record_id_iam_user_id ON session_participant(session_record_id,iam_user_id);

CREATE TABLE link (
    link_id uuid NOT NULL, workspace_id uuid NOT NULL,
    from_type varchar(16) NOT NULL, from_id uuid NOT NULL, to_type varchar(16) NOT NULL, to_id uuid NOT NULL,
    relation varchar(16) NOT NULL, artifact_version_id uuid, anchor varchar(128),
    created_at timestamptz NOT NULL, created_by uuid NOT NULL, created_by_agent varchar(64),
    deleted_at timestamptz, deleted_by uuid, deleted_by_agent varchar(64),
    CONSTRAINT link_pkey PRIMARY KEY(link_id)
    -- [jooq ignore start]
    , CONSTRAINT link_workspace_id_workspace_workspace_id_fk FOREIGN KEY(workspace_id) REFERENCES workspace(workspace_id)
    , CONSTRAINT link_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT link_deleted_by_iam_user_iam_user_id_fk FOREIGN KEY(deleted_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_link_from_type CHECK(from_type IN ('work_item','decision','session_record','artifact','code_ref'))
    , CONSTRAINT ck_link_to_type CHECK(to_type IN ('work_item','decision','session_record','artifact','code_ref'))
    , CONSTRAINT ck_link_relation CHECK(relation IN ('derives_from','implements','revises','based_on','supersedes','blocks','relates_to','subtask_of'))
    , CONSTRAINT ck_link_not_self CHECK(from_type<>to_type OR from_id<>to_id)
    , CONSTRAINT ck_link_artifact_version CHECK(artifact_version_id IS NULL AND anchor IS NULL)
    , CONSTRAINT ck_link_relation_types CHECK(
        (relation='derives_from' AND ((from_type='decision' AND to_type='session_record') OR (from_type='work_item' AND to_type='decision')))
        OR (relation='implements' AND from_type='code_ref' AND to_type='work_item')
        OR (relation IN ('revises','based_on') AND from_type IN ('work_item','decision') AND to_type='artifact')
        OR (relation='supersedes' AND from_type='decision' AND to_type='decision')
        OR (relation IN ('blocks','subtask_of','relates_to') AND from_type='work_item' AND to_type='work_item')
        OR (relation='relates_to' AND ((from_type='session_record' AND to_type='work_item') OR (from_type='work_item' AND to_type='session_record')))
    )
    , CONSTRAINT ck_link_symmetric_order CHECK(relation<>'relates_to' OR from_type || ':' || from_id < to_type || ':' || to_id)
    -- [jooq ignore stop]
);
-- [jooq ignore start]
CREATE UNIQUE INDEX ux_link_edge ON link(workspace_id,from_type,from_id,to_type,to_id,relation,coalesce(artifact_version_id,'')) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX ux_link_superseded_decision ON link(workspace_id,to_id) WHERE relation='supersedes' AND deleted_at IS NULL;
CREATE UNIQUE INDEX ux_link_subtask_parent ON link(workspace_id,from_id) WHERE relation='subtask_of' AND deleted_at IS NULL;
-- [jooq ignore stop]
CREATE INDEX ix_link_from ON link(workspace_id,from_type,from_id,created_at,link_id);
CREATE INDEX ix_link_to ON link(workspace_id,to_type,to_id,created_at,link_id);

CREATE TABLE activity (
    activity_id uuid NOT NULL, workspace_id uuid NOT NULL, project_id uuid,
    target_type varchar(16) NOT NULL, target_id uuid NOT NULL, type varchar(32) NOT NULL,
    actor_id uuid, actor_agent varchar(64), payload jsonb, occurred_at timestamptz NOT NULL,
    CONSTRAINT activity_pkey PRIMARY KEY(activity_id)
    -- [jooq ignore start]
    , CONSTRAINT activity_workspace_id_workspace_workspace_id_fk FOREIGN KEY(workspace_id) REFERENCES workspace(workspace_id)
    , CONSTRAINT activity_project_workspace_fk FOREIGN KEY(project_id,workspace_id) REFERENCES project(project_id,workspace_id)
    , CONSTRAINT activity_actor_id_iam_user_iam_user_id_fk FOREIGN KEY(actor_id) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_activity_target_type CHECK(target_type IN ('work_item','decision','session_record','artifact','code_ref'))
    , CONSTRAINT ck_activity_type CHECK(length(trim(type)) BETWEEN 1 AND 32)
    , CONSTRAINT ck_activity_payload CHECK(payload IS NULL OR (json_valid(payload) AND length(CAST(payload AS BLOB))<=131072))
    -- [jooq ignore stop]
);
CREATE INDEX ix_activity_target ON activity(workspace_id,target_type,target_id,occurred_at,activity_id);
CREATE INDEX ix_activity_project_id_occurred_at ON activity(workspace_id,project_id,occurred_at,activity_id);

CREATE TABLE comment (
    comment_id uuid NOT NULL, workspace_id uuid NOT NULL,
    target_type varchar(16) NOT NULL, target_id uuid NOT NULL, body text NOT NULL,
    version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL, created_by uuid NOT NULL, created_by_agent varchar(64),
    updated_at timestamptz NOT NULL, updated_by uuid NOT NULL, updated_by_agent varchar(64),
    deleted_at timestamptz, deleted_by uuid, deleted_by_agent varchar(64),
    CONSTRAINT comment_pkey PRIMARY KEY(comment_id)
    -- [jooq ignore start]
    , CONSTRAINT comment_workspace_id_workspace_workspace_id_fk FOREIGN KEY(workspace_id) REFERENCES workspace(workspace_id)
    , CONSTRAINT comment_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT comment_updated_by_iam_user_iam_user_id_fk FOREIGN KEY(updated_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT comment_deleted_by_iam_user_iam_user_id_fk FOREIGN KEY(deleted_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_comment_target_type CHECK(target_type IN ('work_item','decision','session_record','artifact'))
    , CONSTRAINT ck_comment_body CHECK(length(trim(body)) BETWEEN 1 AND 20000)
    , CONSTRAINT ck_comment_version CHECK(version>=0)
    -- [jooq ignore stop]
);
CREATE INDEX ix_comment_target ON comment(workspace_id,target_type,target_id,created_at,comment_id);

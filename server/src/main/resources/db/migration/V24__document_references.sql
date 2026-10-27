-- Preserve explicit document references separately from body-derived mentions (D-100).
-- [jooq ignore start]
CREATE TABLE link_new (
    link_id uuid NOT NULL, workspace_id uuid NOT NULL,
    from_type varchar(16) NOT NULL, from_id uuid NOT NULL, to_type varchar(16) NOT NULL, to_id uuid NOT NULL,
    relation varchar(16) NOT NULL, artifact_version_id uuid, anchor varchar(128),
    created_at timestamptz NOT NULL, created_by uuid NOT NULL, created_by_agent varchar(64),
    deleted_at timestamptz, deleted_by uuid, deleted_by_agent varchar(64),
    CONSTRAINT link_pkey PRIMARY KEY(link_id)
    , CONSTRAINT link_workspace_id_workspace_workspace_id_fk FOREIGN KEY(workspace_id) REFERENCES workspace(workspace_id)
    , CONSTRAINT link_created_by_iam_user_iam_user_id_fk FOREIGN KEY(created_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT link_deleted_by_iam_user_iam_user_id_fk FOREIGN KEY(deleted_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_link_from_type CHECK(from_type IN ('work_item','decision','session_record','artifact','code_ref','document'))
    , CONSTRAINT ck_link_to_type CHECK(to_type IN ('work_item','decision','session_record','artifact','code_ref','document'))
    , CONSTRAINT ck_link_relation CHECK(relation IN ('derives_from','implements','revises','based_on','supersedes','blocks','relates_to','subtask_of','references','mentions'))
    , CONSTRAINT ck_link_not_self CHECK(from_type<>to_type OR from_id<>to_id)
    , CONSTRAINT ck_link_artifact_version CHECK(artifact_version_id IS NULL AND anchor IS NULL)
    , CONSTRAINT ck_link_relation_types CHECK(
        (relation='derives_from' AND ((from_type='decision' AND to_type='session_record') OR (from_type='work_item' AND to_type='decision')))
        OR (relation='implements' AND from_type='code_ref' AND to_type='work_item')
        OR (relation IN ('revises','based_on') AND from_type IN ('work_item','decision') AND to_type='artifact')
        OR (relation='supersedes' AND from_type='decision' AND to_type='decision')
        OR (relation IN ('blocks','subtask_of','relates_to') AND from_type='work_item' AND to_type='work_item')
        OR (relation='relates_to' AND ((from_type='session_record' AND to_type='work_item') OR (from_type='work_item' AND to_type='session_record')))
        OR (relation='relates_to' AND from_type='document' AND to_type='work_item')
        OR (relation IN ('references','mentions') AND from_type='document' AND to_type='document')
    )
    , CONSTRAINT ck_link_symmetric_order CHECK(relation<>'relates_to' OR from_type || ':' || from_id < to_type || ':' || to_id)
);
INSERT INTO link_new SELECT * FROM link;
DROP TABLE link;
ALTER TABLE link_new RENAME TO link;
CREATE UNIQUE INDEX ux_link_edge ON link(workspace_id,from_type,from_id,to_type,to_id,relation,coalesce(artifact_version_id,'')) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX ux_link_superseded_decision ON link(workspace_id,to_id) WHERE relation='supersedes' AND deleted_at IS NULL;
CREATE UNIQUE INDEX ux_link_subtask_parent ON link(workspace_id,from_id) WHERE relation='subtask_of' AND deleted_at IS NULL;
CREATE INDEX ix_link_from ON link(workspace_id,from_type,from_id,created_at,link_id);
CREATE INDEX ix_link_to ON link(workspace_id,to_type,to_id,created_at,link_id);
-- [jooq ignore stop]

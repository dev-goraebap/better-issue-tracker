-- Shared mixed folder/document order for a part's root or one folder (BIT-57).
CREATE TABLE document_order (
    document_order_id varchar(10) NOT NULL,
    workspace_id varchar(10) NOT NULL,
    scope_key varchar(24) NOT NULL,
    entries text NOT NULL,
    version bigint NOT NULL,
    updated_at timestamptz NOT NULL,
    updated_by varchar(10) NOT NULL,
    updated_by_agent varchar(64),
    CONSTRAINT document_order_pkey PRIMARY KEY(document_order_id)
    -- [jooq ignore start]
    , CONSTRAINT document_order_workspace_id_workspace_workspace_id_fk FOREIGN KEY(workspace_id) REFERENCES workspace(workspace_id)
    , CONSTRAINT ck_document_order_version CHECK(version>=1)
    -- [jooq ignore stop]
);
CREATE UNIQUE INDEX ux_document_order_workspace_id_scope_key ON document_order(workspace_id,scope_key);

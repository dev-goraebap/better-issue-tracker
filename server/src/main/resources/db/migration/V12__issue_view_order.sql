-- Each scope's own order of the views (D-088): the home ('home') and each project keep their own, and the first view in
-- it is that scope's default. view_keys is a JSON array of view ids and 'all' (the built-in 전체 이슈); a view missing
-- from it follows in the workspace's order. A scope with no row uses the workspace's order.
CREATE TABLE issue_view_order (
    workspace_id uuid NOT NULL, scope varchar(40) NOT NULL, view_keys text NOT NULL,
    updated_at timestamptz NOT NULL, updated_by uuid NOT NULL, updated_by_agent varchar(64),
    CONSTRAINT issue_view_order_pkey PRIMARY KEY(workspace_id,scope)
    -- [jooq ignore start]
    , CONSTRAINT issue_view_order_workspace_id_workspace_workspace_id_fk FOREIGN KEY(workspace_id) REFERENCES workspace(workspace_id)
    , CONSTRAINT issue_view_order_updated_by_iam_user_iam_user_id_fk FOREIGN KEY(updated_by) REFERENCES iam_user(iam_user_id)
    , CONSTRAINT ck_issue_view_order_scope CHECK(length(scope) BETWEEN 1 AND 40)
    , CONSTRAINT ck_issue_view_order_view_keys CHECK(length(view_keys)<=8000 AND CASE WHEN json_valid(view_keys) THEN json_type(view_keys)='array' ELSE 0 END)
    -- [jooq ignore stop]
);

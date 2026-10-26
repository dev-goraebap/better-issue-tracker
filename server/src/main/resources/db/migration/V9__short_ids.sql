-- Every id becomes ten characters of A-Z, a-z and 0-9 with a leading letter (D-083), the form Ids.newId() makes.
-- One map gives each old UUID its new id, so a key and every column that points at it get the same value: the 97
-- uuid columns of the 23 tables, the polymorphic targets (link, activity, comment), and the ids written inside text
-- (activity payloads, view filters, tweak keys). The columns keep their declared type uuid: SQLite cannot change it
-- without rebuilding every table, and the leading letter keeps NUMERIC affinity from turning an id into a number.
-- Flyway runs this in one transaction, where PRAGMA foreign_keys cannot change; defer_foreign_keys moves every
-- foreign key check to the commit instead, so keys and references can change in any order. A failure anywhere,
-- including two old ids drawing the same new one (unique new_id), rolls everything back and the next start retries.
-- [jooq ignore start]
PRAGMA defer_foreign_keys = ON;

CREATE TEMP TABLE id_map (old_id text NOT NULL PRIMARY KEY, new_id text UNIQUE);
CREATE TEMP TABLE text_id (owner text NOT NULL, owner_id text NOT NULL, old_id text NOT NULL);

-- Ids held in columns.
INSERT OR IGNORE INTO id_map(old_id) SELECT activity_id FROM activity WHERE activity_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT workspace_id FROM activity WHERE workspace_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT project_id FROM activity WHERE project_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT target_id FROM activity WHERE target_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT actor_id FROM activity WHERE actor_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT board_column_id FROM board_column WHERE board_column_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT project_id FROM board_column WHERE project_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT created_by FROM board_column WHERE created_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT updated_by FROM board_column WHERE updated_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT deleted_by FROM board_column WHERE deleted_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT comment_id FROM comment WHERE comment_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT workspace_id FROM comment WHERE workspace_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT target_id FROM comment WHERE target_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT created_by FROM comment WHERE created_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT updated_by FROM comment WHERE updated_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT deleted_by FROM comment WHERE deleted_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT decision_id FROM decision WHERE decision_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT project_id FROM decision WHERE project_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT created_by FROM decision WHERE created_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT updated_by FROM decision WHERE updated_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT deleted_by FROM decision WHERE deleted_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT iam_api_key_id FROM iam_api_key WHERE iam_api_key_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT iam_user_id FROM iam_api_key WHERE iam_user_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT iam_email_otp_id FROM iam_email_otp WHERE iam_email_otp_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT iam_user_id FROM iam_password WHERE iam_user_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT iam_session_id FROM iam_session WHERE iam_session_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT iam_user_id FROM iam_session WHERE iam_user_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT active_workspace_id FROM iam_session WHERE active_workspace_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT iam_user_id FROM iam_user WHERE iam_user_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT avatar_blob_id FROM iam_user WHERE avatar_blob_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT created_by FROM iam_user WHERE created_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT updated_by FROM iam_user WHERE updated_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT deleted_by FROM iam_user WHERE deleted_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT issue_view_id FROM issue_view WHERE issue_view_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT workspace_id FROM issue_view WHERE workspace_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT owner_id FROM issue_view WHERE owner_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT created_by FROM issue_view WHERE created_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT updated_by FROM issue_view WHERE updated_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT deleted_by FROM issue_view WHERE deleted_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT workspace_id FROM issue_view_tweak WHERE workspace_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT iam_user_id FROM issue_view_tweak WHERE iam_user_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT label_id FROM label WHERE label_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT workspace_id FROM label WHERE workspace_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT created_by FROM label WHERE created_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT updated_by FROM label WHERE updated_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT deleted_by FROM label WHERE deleted_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT link_id FROM link WHERE link_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT workspace_id FROM link WHERE workspace_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT from_id FROM link WHERE from_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT to_id FROM link WHERE to_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT artifact_version_id FROM link WHERE artifact_version_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT created_by FROM link WHERE created_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT deleted_by FROM link WHERE deleted_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT project_id FROM project WHERE project_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT workspace_id FROM project WHERE workspace_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT created_by FROM project WHERE created_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT updated_by FROM project WHERE updated_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT deleted_by FROM project WHERE deleted_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT project_key_id FROM project_key WHERE project_key_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT project_id FROM project_key WHERE project_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT workspace_id FROM project_key WHERE workspace_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT project_member_id FROM project_member WHERE project_member_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT project_id FROM project_member WHERE project_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT workspace_id FROM project_member WHERE workspace_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT iam_user_id FROM project_member WHERE iam_user_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT created_by FROM project_member WHERE created_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT session_participant_id FROM session_participant WHERE session_participant_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT session_record_id FROM session_participant WHERE session_record_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT iam_user_id FROM session_participant WHERE iam_user_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT session_record_id FROM session_record WHERE session_record_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT project_id FROM session_record WHERE project_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT created_by FROM session_record WHERE created_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT updated_by FROM session_record WHERE updated_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT deleted_by FROM session_record WHERE deleted_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT work_item_id FROM work_item WHERE work_item_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT project_id FROM work_item WHERE project_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT board_column_id FROM work_item WHERE board_column_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT assignee_id FROM work_item WHERE assignee_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT created_by FROM work_item WHERE created_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT updated_by FROM work_item WHERE updated_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT deleted_by FROM work_item WHERE deleted_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT work_item_label_id FROM work_item_label WHERE work_item_label_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT work_item_id FROM work_item_label WHERE work_item_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT label_id FROM work_item_label WHERE label_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT created_by FROM work_item_label WHERE created_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT workspace_id FROM workspace WHERE workspace_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT created_by FROM workspace WHERE created_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT updated_by FROM workspace WHERE updated_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT deleted_by FROM workspace WHERE deleted_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT workspace_invitation_id FROM workspace_invitation WHERE workspace_invitation_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT workspace_id FROM workspace_invitation WHERE workspace_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT invited_by FROM workspace_invitation WHERE invited_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT accepted_by FROM workspace_invitation WHERE accepted_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT revoked_by FROM workspace_invitation WHERE revoked_by IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT workspace_member_id FROM workspace_member WHERE workspace_member_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT workspace_id FROM workspace_member WHERE workspace_id IS NOT NULL;
INSERT OR IGNORE INTO id_map(old_id) SELECT iam_user_id FROM workspace_member WHERE iam_user_id IS NOT NULL;

-- Ids written inside activity payloads: the change and comment they belong to, and the column, assignee, decision
-- and labels (comma-joined) a change moved from and to (D-078).
INSERT INTO text_id SELECT 'activity', activity_id, json_extract(payload,'$.changeId') FROM activity
    WHERE json_valid(payload) AND json_extract(payload,'$.changeId') IS NOT NULL;
INSERT INTO text_id SELECT 'activity', activity_id, json_extract(payload,'$.commentId') FROM activity
    WHERE json_valid(payload) AND json_extract(payload,'$.commentId') IS NOT NULL;
INSERT INTO text_id
WITH RECURSIVE ids(activity_id, rest, item) AS (
    SELECT a.activity_id, v.value || ',', NULL
    FROM activity a, json_each(json_array(json_extract(a.payload,'$.before'), json_extract(a.payload,'$.after'))) v
    WHERE json_valid(a.payload) AND json_extract(a.payload,'$.field') IN ('column','assignee','replacementId','labels')
        AND v.value IS NOT NULL AND v.value <> ''
    UNION ALL
    SELECT activity_id, substr(rest, instr(rest, ',') + 1), substr(rest, 1, instr(rest, ',') - 1)
    FROM ids WHERE rest <> ''
)
SELECT 'activity', activity_id, item FROM ids WHERE item IS NOT NULL AND item <> '';
-- Ids written in a view's filters (opaque comma-joined values chosen on the screen) and a tweak's view key.
INSERT INTO text_id
SELECT 'issue_view', v.issue_view_id, m.old_id FROM issue_view v JOIN id_map m ON instr(v.filters, m.old_id) > 0;
INSERT INTO text_id SELECT 'issue_view_tweak', workspace_id || '|' || iam_user_id || '|' || view_key, view_key
    FROM issue_view_tweak WHERE view_key <> 'all';
INSERT OR IGNORE INTO id_map(old_id) SELECT old_id FROM text_id;

UPDATE id_map SET new_id =
    substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',1+(random()&9223372036854775807)%52,1)
    || substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',1+(random()&9223372036854775807)%62,1)
    || substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',1+(random()&9223372036854775807)%62,1)
    || substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',1+(random()&9223372036854775807)%62,1)
    || substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',1+(random()&9223372036854775807)%62,1)
    || substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',1+(random()&9223372036854775807)%62,1)
    || substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',1+(random()&9223372036854775807)%62,1)
    || substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',1+(random()&9223372036854775807)%62,1)
    || substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',1+(random()&9223372036854775807)%62,1)
    || substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',1+(random()&9223372036854775807)%62,1);

-- Text first, while its rows still have their old keys.
CREATE TEMP TABLE text_new (owner text NOT NULL, owner_id text NOT NULL, value text, PRIMARY KEY (owner, owner_id));
INSERT INTO text_new
WITH RECURSIVE hit(owner, owner_id, old_id, new_id, k) AS (
    SELECT t.owner, t.owner_id, m.old_id, m.new_id, row_number() OVER (PARTITION BY t.owner, t.owner_id ORDER BY m.old_id)
    FROM (SELECT DISTINCT owner, owner_id, old_id FROM text_id) t JOIN id_map m ON m.old_id = t.old_id
),
step(owner, owner_id, k, value) AS (
    SELECT 'activity', activity_id, 0, payload FROM activity
        WHERE activity_id IN (SELECT owner_id FROM hit WHERE owner = 'activity')
    UNION ALL
    SELECT 'issue_view', issue_view_id, 0, filters FROM issue_view
        WHERE issue_view_id IN (SELECT owner_id FROM hit WHERE owner = 'issue_view')
    UNION ALL
    SELECT 'issue_view_tweak', workspace_id || '|' || iam_user_id || '|' || view_key, 0, view_key FROM issue_view_tweak
        WHERE view_key <> 'all'
    UNION ALL
    SELECT s.owner, s.owner_id, s.k + 1, replace(s.value, h.old_id, h.new_id)
    FROM step s JOIN hit h ON h.owner = s.owner AND h.owner_id = s.owner_id AND h.k = s.k + 1
)
SELECT owner, owner_id, value FROM step s
WHERE k = (SELECT max(k) FROM step x WHERE x.owner = s.owner AND x.owner_id = s.owner_id);

UPDATE activity SET payload = (SELECT value FROM text_new WHERE owner = 'activity' AND owner_id = activity.activity_id)
WHERE activity_id IN (SELECT owner_id FROM text_new WHERE owner = 'activity');
-- The lengths an id change recorded follow its new text.
UPDATE activity SET payload = json_set(payload,
        '$.beforeLength', coalesce(length(json_extract(payload,'$.before')), -1),
        '$.afterLength', coalesce(length(json_extract(payload,'$.after')), -1))
WHERE json_valid(payload) AND json_extract(payload,'$.field') IN ('column','assignee','replacementId','labels');
UPDATE issue_view SET filters = (SELECT value FROM text_new WHERE owner = 'issue_view' AND owner_id = issue_view.issue_view_id)
WHERE issue_view_id IN (SELECT owner_id FROM text_new WHERE owner = 'issue_view');
UPDATE issue_view_tweak SET view_key = (SELECT value FROM text_new
    WHERE owner = 'issue_view_tweak' AND owner_id = workspace_id || '|' || iam_user_id || '|' || view_key)
WHERE view_key <> 'all';

-- Then every id column. A related-to link keeps its two ends in text order (ck_link_symmetric_order), which the new
-- ids may reverse between two issues, so such a link swaps its ends.
UPDATE activity SET
    activity_id = (SELECT new_id FROM id_map WHERE old_id = activity.activity_id),
    workspace_id = (SELECT new_id FROM id_map WHERE old_id = activity.workspace_id),
    project_id = (SELECT new_id FROM id_map WHERE old_id = activity.project_id),
    target_id = (SELECT new_id FROM id_map WHERE old_id = activity.target_id),
    actor_id = (SELECT new_id FROM id_map WHERE old_id = activity.actor_id);
UPDATE board_column SET
    board_column_id = (SELECT new_id FROM id_map WHERE old_id = board_column.board_column_id),
    project_id = (SELECT new_id FROM id_map WHERE old_id = board_column.project_id),
    created_by = (SELECT new_id FROM id_map WHERE old_id = board_column.created_by),
    updated_by = (SELECT new_id FROM id_map WHERE old_id = board_column.updated_by),
    deleted_by = (SELECT new_id FROM id_map WHERE old_id = board_column.deleted_by);
UPDATE comment SET
    comment_id = (SELECT new_id FROM id_map WHERE old_id = comment.comment_id),
    workspace_id = (SELECT new_id FROM id_map WHERE old_id = comment.workspace_id),
    target_id = (SELECT new_id FROM id_map WHERE old_id = comment.target_id),
    created_by = (SELECT new_id FROM id_map WHERE old_id = comment.created_by),
    updated_by = (SELECT new_id FROM id_map WHERE old_id = comment.updated_by),
    deleted_by = (SELECT new_id FROM id_map WHERE old_id = comment.deleted_by);
UPDATE decision SET
    decision_id = (SELECT new_id FROM id_map WHERE old_id = decision.decision_id),
    project_id = (SELECT new_id FROM id_map WHERE old_id = decision.project_id),
    created_by = (SELECT new_id FROM id_map WHERE old_id = decision.created_by),
    updated_by = (SELECT new_id FROM id_map WHERE old_id = decision.updated_by),
    deleted_by = (SELECT new_id FROM id_map WHERE old_id = decision.deleted_by);
UPDATE iam_api_key SET
    iam_api_key_id = (SELECT new_id FROM id_map WHERE old_id = iam_api_key.iam_api_key_id),
    iam_user_id = (SELECT new_id FROM id_map WHERE old_id = iam_api_key.iam_user_id);
UPDATE iam_email_otp SET
    iam_email_otp_id = (SELECT new_id FROM id_map WHERE old_id = iam_email_otp.iam_email_otp_id);
UPDATE iam_password SET
    iam_user_id = (SELECT new_id FROM id_map WHERE old_id = iam_password.iam_user_id);
UPDATE iam_session SET
    iam_session_id = (SELECT new_id FROM id_map WHERE old_id = iam_session.iam_session_id),
    iam_user_id = (SELECT new_id FROM id_map WHERE old_id = iam_session.iam_user_id),
    active_workspace_id = (SELECT new_id FROM id_map WHERE old_id = iam_session.active_workspace_id);
UPDATE iam_user SET
    iam_user_id = (SELECT new_id FROM id_map WHERE old_id = iam_user.iam_user_id),
    avatar_blob_id = (SELECT new_id FROM id_map WHERE old_id = iam_user.avatar_blob_id),
    created_by = (SELECT new_id FROM id_map WHERE old_id = iam_user.created_by),
    updated_by = (SELECT new_id FROM id_map WHERE old_id = iam_user.updated_by),
    deleted_by = (SELECT new_id FROM id_map WHERE old_id = iam_user.deleted_by);
UPDATE issue_view SET
    issue_view_id = (SELECT new_id FROM id_map WHERE old_id = issue_view.issue_view_id),
    workspace_id = (SELECT new_id FROM id_map WHERE old_id = issue_view.workspace_id),
    owner_id = (SELECT new_id FROM id_map WHERE old_id = issue_view.owner_id),
    created_by = (SELECT new_id FROM id_map WHERE old_id = issue_view.created_by),
    updated_by = (SELECT new_id FROM id_map WHERE old_id = issue_view.updated_by),
    deleted_by = (SELECT new_id FROM id_map WHERE old_id = issue_view.deleted_by);
UPDATE issue_view_tweak SET
    workspace_id = (SELECT new_id FROM id_map WHERE old_id = issue_view_tweak.workspace_id),
    iam_user_id = (SELECT new_id FROM id_map WHERE old_id = issue_view_tweak.iam_user_id);
UPDATE label SET
    label_id = (SELECT new_id FROM id_map WHERE old_id = label.label_id),
    workspace_id = (SELECT new_id FROM id_map WHERE old_id = label.workspace_id),
    created_by = (SELECT new_id FROM id_map WHERE old_id = label.created_by),
    updated_by = (SELECT new_id FROM id_map WHERE old_id = label.updated_by),
    deleted_by = (SELECT new_id FROM id_map WHERE old_id = label.deleted_by);
UPDATE link SET
    from_type = CASE WHEN x.swap THEN link.to_type ELSE link.from_type END,
    from_id = CASE WHEN x.swap THEN x.new_to ELSE x.new_from END,
    to_type = CASE WHEN x.swap THEN link.from_type ELSE link.to_type END,
    to_id = CASE WHEN x.swap THEN x.new_from ELSE x.new_to END,
    link_id = (SELECT new_id FROM id_map WHERE old_id = link.link_id),
    workspace_id = (SELECT new_id FROM id_map WHERE old_id = link.workspace_id),
    artifact_version_id = (SELECT new_id FROM id_map WHERE old_id = link.artifact_version_id),
    created_by = (SELECT new_id FROM id_map WHERE old_id = link.created_by),
    deleted_by = (SELECT new_id FROM id_map WHERE old_id = link.deleted_by)
FROM (
    SELECT l.link_id, f.new_id AS new_from, o.new_id AS new_to,
        l.relation = 'relates_to' AND l.from_type || ':' || f.new_id > l.to_type || ':' || o.new_id AS swap
    FROM link l JOIN id_map f ON f.old_id = l.from_id JOIN id_map o ON o.old_id = l.to_id
) x
WHERE x.link_id = link.link_id;
UPDATE project SET
    project_id = (SELECT new_id FROM id_map WHERE old_id = project.project_id),
    workspace_id = (SELECT new_id FROM id_map WHERE old_id = project.workspace_id),
    created_by = (SELECT new_id FROM id_map WHERE old_id = project.created_by),
    updated_by = (SELECT new_id FROM id_map WHERE old_id = project.updated_by),
    deleted_by = (SELECT new_id FROM id_map WHERE old_id = project.deleted_by);
UPDATE project_key SET
    project_key_id = (SELECT new_id FROM id_map WHERE old_id = project_key.project_key_id),
    project_id = (SELECT new_id FROM id_map WHERE old_id = project_key.project_id),
    workspace_id = (SELECT new_id FROM id_map WHERE old_id = project_key.workspace_id);
UPDATE project_member SET
    project_member_id = (SELECT new_id FROM id_map WHERE old_id = project_member.project_member_id),
    project_id = (SELECT new_id FROM id_map WHERE old_id = project_member.project_id),
    workspace_id = (SELECT new_id FROM id_map WHERE old_id = project_member.workspace_id),
    iam_user_id = (SELECT new_id FROM id_map WHERE old_id = project_member.iam_user_id),
    created_by = (SELECT new_id FROM id_map WHERE old_id = project_member.created_by);
UPDATE session_participant SET
    session_participant_id = (SELECT new_id FROM id_map WHERE old_id = session_participant.session_participant_id),
    session_record_id = (SELECT new_id FROM id_map WHERE old_id = session_participant.session_record_id),
    iam_user_id = (SELECT new_id FROM id_map WHERE old_id = session_participant.iam_user_id);
UPDATE session_record SET
    session_record_id = (SELECT new_id FROM id_map WHERE old_id = session_record.session_record_id),
    project_id = (SELECT new_id FROM id_map WHERE old_id = session_record.project_id),
    created_by = (SELECT new_id FROM id_map WHERE old_id = session_record.created_by),
    updated_by = (SELECT new_id FROM id_map WHERE old_id = session_record.updated_by),
    deleted_by = (SELECT new_id FROM id_map WHERE old_id = session_record.deleted_by);
UPDATE work_item SET
    work_item_id = (SELECT new_id FROM id_map WHERE old_id = work_item.work_item_id),
    project_id = (SELECT new_id FROM id_map WHERE old_id = work_item.project_id),
    board_column_id = (SELECT new_id FROM id_map WHERE old_id = work_item.board_column_id),
    assignee_id = (SELECT new_id FROM id_map WHERE old_id = work_item.assignee_id),
    created_by = (SELECT new_id FROM id_map WHERE old_id = work_item.created_by),
    updated_by = (SELECT new_id FROM id_map WHERE old_id = work_item.updated_by),
    deleted_by = (SELECT new_id FROM id_map WHERE old_id = work_item.deleted_by);
UPDATE work_item_label SET
    work_item_label_id = (SELECT new_id FROM id_map WHERE old_id = work_item_label.work_item_label_id),
    work_item_id = (SELECT new_id FROM id_map WHERE old_id = work_item_label.work_item_id),
    label_id = (SELECT new_id FROM id_map WHERE old_id = work_item_label.label_id),
    created_by = (SELECT new_id FROM id_map WHERE old_id = work_item_label.created_by);
UPDATE workspace SET
    workspace_id = (SELECT new_id FROM id_map WHERE old_id = workspace.workspace_id),
    created_by = (SELECT new_id FROM id_map WHERE old_id = workspace.created_by),
    updated_by = (SELECT new_id FROM id_map WHERE old_id = workspace.updated_by),
    deleted_by = (SELECT new_id FROM id_map WHERE old_id = workspace.deleted_by);
UPDATE workspace_invitation SET
    workspace_invitation_id = (SELECT new_id FROM id_map WHERE old_id = workspace_invitation.workspace_invitation_id),
    workspace_id = (SELECT new_id FROM id_map WHERE old_id = workspace_invitation.workspace_id),
    invited_by = (SELECT new_id FROM id_map WHERE old_id = workspace_invitation.invited_by),
    accepted_by = (SELECT new_id FROM id_map WHERE old_id = workspace_invitation.accepted_by),
    revoked_by = (SELECT new_id FROM id_map WHERE old_id = workspace_invitation.revoked_by);
UPDATE workspace_member SET
    workspace_member_id = (SELECT new_id FROM id_map WHERE old_id = workspace_member.workspace_member_id),
    workspace_id = (SELECT new_id FROM id_map WHERE old_id = workspace_member.workspace_id),
    iam_user_id = (SELECT new_id FROM id_map WHERE old_id = workspace_member.iam_user_id);

DROP TABLE text_new;
DROP TABLE text_id;
DROP TABLE id_map;
-- [jooq ignore stop]

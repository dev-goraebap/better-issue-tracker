-- A saved view chooses how its list rows are grouped (D-106, BIT-91); existing views keep no grouping.
-- A member's own grouping over a view is one more key in work_item_view_tweak.tweak, beside layout, sort and columns.
-- SQLite appends the column text to the stored table definition, so the definition must not end in a comment.
ALTER TABLE work_item_view ADD COLUMN grouping varchar(16) NOT NULL
    -- [jooq ignore start]
    CONSTRAINT ck_work_item_view_grouping CHECK(grouping IN ('none','status','assignee','priority','type','label','project'))
    -- [jooq ignore stop]
    DEFAULT 'none';

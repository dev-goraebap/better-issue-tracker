-- A project's mark, as a view's: one of the views' icons (the column V3 left unused) on one of the palette's colours.
-- Both stay empty for a project made before or without them; the screen then shows the key's first letter.
-- SQLite copies the added column's text into the table's definition, so its CHECK is marked off for jOOQ with block
-- comments: a line comment there would swallow the definition's closing parenthesis.
ALTER TABLE project ADD COLUMN color varchar(7) /* [jooq ignore start] */ CHECK(color IS NULL OR (length(color)=7 AND substr(color,1,1)='#' AND substr(color,2) NOT GLOB '*[^a-fA-F0-9]*')) /* [jooq ignore stop] */;

-- A folder keeps its chosen icon colour; existing folders keep the theme's default.
ALTER TABLE folder ADD COLUMN color varchar(7) /* [jooq ignore start] */ CONSTRAINT ck_folder_color CHECK(color IS NULL OR (length(color)=7 AND substr(color,1,1)='#' AND substr(color,2) NOT GLOB '*[^a-fA-F0-9]*')) /* [jooq ignore stop] */;

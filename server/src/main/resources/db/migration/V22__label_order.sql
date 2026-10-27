ALTER TABLE label ADD COLUMN position integer NOT NULL DEFAULT 0;
-- [jooq ignore start]
UPDATE label SET position = (SELECT count(*) FROM label other WHERE other.workspace_id = label.workspace_id
 AND (other.is_system > label.is_system OR (other.is_system = label.is_system AND
 (lower(other.name) < lower(label.name) OR (lower(other.name) = lower(label.name) AND other.label_id < label.label_id)))));
-- [jooq ignore stop]

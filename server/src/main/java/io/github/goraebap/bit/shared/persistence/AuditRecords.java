package io.github.goraebap.bit.shared.persistence;

import io.github.goraebap.bit.shared.domain.Audit;
import java.time.Instant;
import org.jooq.Record;

public final class AuditRecords {
    private AuditRecords() {}

    public static Audit read(Record row) {
        return new Audit(
                row.get("created_at", Instant.class),
                row.get("created_by", String.class),
                row.get("created_by_agent", String.class),
                row.get("updated_at", Instant.class),
                row.get("updated_by", String.class),
                row.get("updated_by_agent", String.class),
                row.get("deleted_at", Instant.class),
                row.get("deleted_by", String.class),
                row.get("deleted_by_agent", String.class));
    }

    public static void write(Record row, Audit audit) {
        put(row, "created_at", Instant.class, audit.createdAt());
        put(row, "created_by", String.class, audit.createdBy());
        put(row, "created_by_agent", String.class, audit.createdByAgent());
        put(row, "updated_at", Instant.class, audit.updatedAt());
        put(row, "updated_by", String.class, audit.updatedBy());
        put(row, "updated_by_agent", String.class, audit.updatedByAgent());
        put(row, "deleted_at", Instant.class, audit.deletedAt());
        put(row, "deleted_by", String.class, audit.deletedBy());
        put(row, "deleted_by_agent", String.class, audit.deletedByAgent());
    }

    private static <T> void put(Record row, String name, Class<T> type, T value) {
        row.set(row.field(name, type), value);
    }
}

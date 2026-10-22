package io.github.goraebap.bit.shared.persistence;

import java.sql.SQLException;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.support.SQLExceptionTranslator;
import org.springframework.jdbc.support.SQLStateSQLExceptionTranslator;
import org.sqlite.SQLiteErrorCode;
import org.sqlite.SQLiteException;

/**
 * SQLite's errors as Spring's: a unique or primary key broken is a duplicate key, any other broken constraint an
 * integrity violation, a database still busy after the wait a lock not acquired. Spring has no error codes for SQLite
 * and SQLite gives no SQL state, so without this they all arrive uncategorized and a conflict reads as a server error.
 */
public final class SqliteExceptionTranslator implements SQLExceptionTranslator {
    private final SQLExceptionTranslator fallback = new SQLStateSQLExceptionTranslator();

    @Override
    public DataAccessException translate(String task, String sql, SQLException ex) {
        if (ex instanceof SQLiteException sqlite) {
            SQLiteErrorCode code = sqlite.getResultCode();
            String message = task + "; " + (sql == null ? "" : "SQL [" + sql + "]; ") + ex.getMessage();
            if (code == SQLiteErrorCode.SQLITE_CONSTRAINT_UNIQUE
                    || code == SQLiteErrorCode.SQLITE_CONSTRAINT_PRIMARYKEY)
                return new DuplicateKeyException(message, ex);
            if (code.name().startsWith("SQLITE_CONSTRAINT")) return new DataIntegrityViolationException(message, ex);
            if (code.name().startsWith("SQLITE_BUSY") || code.name().startsWith("SQLITE_LOCKED"))
                return new CannotAcquireLockException(message, ex);
        }
        return fallback.translate(task, sql, ex);
    }
}

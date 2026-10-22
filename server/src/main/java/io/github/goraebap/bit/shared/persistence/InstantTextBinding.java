package io.github.goraebap.bit.shared.persistence;

import java.sql.SQLException;
import java.sql.Types;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.temporal.ChronoField;
import java.util.Objects;
import org.jooq.Binding;
import org.jooq.BindingGetResultSetContext;
import org.jooq.BindingGetSQLInputContext;
import org.jooq.BindingGetStatementContext;
import org.jooq.BindingRegisterContext;
import org.jooq.BindingSQLContext;
import org.jooq.BindingSetSQLOutputContext;
import org.jooq.BindingSetStatementContext;
import org.jooq.Converter;
import org.jooq.impl.DSL;

/**
 * A moment kept in SQLite as UTC text of one fixed width, 2026-10-02T03:04:05.678901Z, so moments compare and sort
 * as text the way they do in time. Every timestamptz column is bound through this (build.gradle forcedTypes), and the
 * schema's defaults write the same form. Reading also takes the forms SQLite or a hand-written row may hold
 * (2026-10-02 03:04:05, with or without a fraction, Z or +00:00), read as UTC.
 */
public final class InstantTextBinding implements Binding<OffsetDateTime, Instant> {
    private static final DateTimeFormatter WRITE =
            DateTimeFormatter.ofPattern("uuuu-MM-dd'T'HH:mm:ss.SSSSSS'Z'").withZone(ZoneOffset.UTC);
    private static final DateTimeFormatter READ = new DateTimeFormatterBuilder()
            .appendPattern("uuuu-MM-dd")
            .optionalStart()
            .appendLiteral('T')
            .optionalEnd()
            .optionalStart()
            .appendLiteral(' ')
            .optionalEnd()
            .appendPattern("HH:mm:ss")
            .optionalStart()
            .appendFraction(ChronoField.NANO_OF_SECOND, 0, 9, true)
            .optionalEnd()
            .optionalStart()
            .appendLiteral('Z')
            .optionalEnd()
            .optionalStart()
            .appendOffset("+HH:MM", "+00:00")
            .optionalEnd()
            .toFormatter();

    private static final Converter<OffsetDateTime, Instant> CONVERTER = Converter.ofNullable(
            OffsetDateTime.class, Instant.class, OffsetDateTime::toInstant, i -> i.atOffset(ZoneOffset.UTC));

    /** The text a moment is stored as. */
    public static String text(Instant instant) {
        return WRITE.format(instant);
    }

    /** A stored moment read back; null stays null. */
    public static Instant parse(String text) {
        if (text == null) return null;
        var parsed = READ.parseBest(text.trim(), OffsetDateTime::from, LocalDateTime::from);
        return parsed instanceof OffsetDateTime moment
                ? moment.toInstant()
                : ((LocalDateTime) parsed).toInstant(ZoneOffset.UTC);
    }

    @Override
    public Converter<OffsetDateTime, Instant> converter() {
        return CONVERTER;
    }

    @Override
    public void sql(BindingSQLContext<Instant> ctx) throws SQLException {
        if (ctx.render().paramType() == org.jooq.conf.ParamType.INLINED)
            ctx.render().visit(DSL.inline(ctx.value() == null ? null : text(ctx.value())));
        else ctx.render().sql("?");
    }

    @Override
    public void register(BindingRegisterContext<Instant> ctx) throws SQLException {
        ctx.statement().registerOutParameter(ctx.index(), Types.VARCHAR);
    }

    @Override
    public void set(BindingSetStatementContext<Instant> ctx) throws SQLException {
        ctx.statement().setString(ctx.index(), ctx.value() == null ? null : text(ctx.value()));
    }

    @Override
    public void set(BindingSetSQLOutputContext<Instant> ctx) throws SQLException {
        throw new SQLException("Not supported");
    }

    @Override
    public void get(BindingGetResultSetContext<Instant> ctx) throws SQLException {
        ctx.value(parse(ctx.resultSet().getString(ctx.index())));
    }

    @Override
    public void get(BindingGetStatementContext<Instant> ctx) throws SQLException {
        ctx.value(parse(ctx.statement().getString(ctx.index())));
    }

    @Override
    public void get(BindingGetSQLInputContext<Instant> ctx) throws SQLException {
        throw new SQLException("Not supported");
    }

    @Override
    public boolean equals(Object other) {
        return other instanceof InstantTextBinding;
    }

    @Override
    public int hashCode() {
        return Objects.hash(InstantTextBinding.class);
    }
}

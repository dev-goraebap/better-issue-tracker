package io.github.goraebap.bit.module.link.infrastructure;

import static io.github.goraebap.bit.jooq.tables.Document.DOCUMENT;
import static io.github.goraebap.bit.jooq.tables.WorkItem.WORK_ITEM;

import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.module.link.application.RelationQuery;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class JooqRelationQuery implements RelationQuery {
    private final DSLContext dslContext;

    @Override
    public List<Summary> summaries(String workspace, TargetType type, Set<String> ids) {
        if (ids.isEmpty()) return List.of();
        if (type == TargetType.document)
            return dslContext
                    .selectFrom(DOCUMENT)
                    .where(DOCUMENT.WORKSPACE_ID.eq(workspace))
                    .and(DOCUMENT.DOCUMENT_ID.in(ids))
                    .and(DOCUMENT.DELETED_AT.isNull())
                    .fetch(r -> new Summary(
                            type,
                            r.getDocumentId(),
                            r.getProjectId(),
                            null,
                            r.getTitle(),
                            null,
                            null,
                            List.of(),
                            List.of()));
        if (type != TargetType.work_item) return List.of();
        var rows = dslContext
                .select(WORK_ITEM.WORK_ITEM_ID)
                .from(WORK_ITEM)
                .where(WORK_ITEM.WORKSPACE_ID.eq(workspace))
                .and(WORK_ITEM.WORK_ITEM_ID.in(ids))
                .and(WORK_ITEM.DELETED_AT.isNull())
                .fetch(WORK_ITEM.WORK_ITEM_ID);
        if (rows.isEmpty()) return List.of();
        var people = new HashMap<String, List<String>>();
        var peopleIds = new HashMap<String, List<String>>();
        var person = io.github.goraebap.bit.jooq.tables.WorkItemPerson.WORK_ITEM_PERSON;
        var user = io.github.goraebap.bit.jooq.tables.IamUser.IAM_USER;
        dslContext
                .select(person.WORK_ITEM_ID, user.NAME, user.IAM_USER_ID)
                .from(person)
                .join(user)
                .on(user.IAM_USER_ID.eq(person.IAM_USER_ID))
                .where(person.WORK_ITEM_ID.in(rows))
                .orderBy(user.NAME, user.IAM_USER_ID)
                .forEach(r -> {
                    people.computeIfAbsent(r.value1(), ignored -> new ArrayList<>())
                            .add(r.value2());
                    peopleIds
                            .computeIfAbsent(r.value1(), ignored -> new ArrayList<>())
                            .add(r.value3());
                });
        var project = io.github.goraebap.bit.jooq.tables.Project.PROJECT;
        var key = io.github.goraebap.bit.jooq.tables.ProjectKey.PROJECT_KEY;
        var column = io.github.goraebap.bit.jooq.tables.BoardColumn.BOARD_COLUMN;
        return dslContext
                .select(
                        WORK_ITEM.WORK_ITEM_ID,
                        WORK_ITEM.PROJECT_ID,
                        WORK_ITEM.NUMBER,
                        WORK_ITEM.TITLE,
                        org.jooq.impl.DSL.coalesce(
                                WORK_ITEM.PUBLIC_REF,
                                org.jooq.impl.DSL.concat(
                                        key.KEY, org.jooq.impl.DSL.inline("-"), WORK_ITEM.NUMBER.cast(String.class))),
                        org.jooq.impl.DSL.coalesce(WORK_ITEM.WORKSPACE_STATUS, column.CATEGORY),
                        column.NAME)
                .from(WORK_ITEM)
                .leftJoin(project)
                .on(project.PROJECT_ID.eq(WORK_ITEM.PROJECT_ID))
                .leftJoin(key)
                .on(key.PROJECT_ID.eq(project.PROJECT_ID).and(key.IS_CURRENT.isTrue()))
                .leftJoin(column)
                .on(column.BOARD_COLUMN_ID.eq(WORK_ITEM.BOARD_COLUMN_ID))
                .where(WORK_ITEM.WORK_ITEM_ID.in(rows))
                .fetch(r -> new Summary(
                        type,
                        r.value1(),
                        r.value2(),
                        r.value5(),
                        r.value4(),
                        r.value6(),
                        r.value7(),
                        people.getOrDefault(r.value1(), List.of()),
                        peopleIds.getOrDefault(r.value1(), List.of())));
    }

    @Override
    public String workItemId(String workspace, String reference) {
        var project = io.github.goraebap.bit.jooq.tables.Project.PROJECT;
        var key = io.github.goraebap.bit.jooq.tables.ProjectKey.PROJECT_KEY;
        return dslContext
                .select(WORK_ITEM.WORK_ITEM_ID)
                .from(WORK_ITEM)
                .leftJoin(project)
                .on(project.PROJECT_ID.eq(WORK_ITEM.PROJECT_ID))
                .leftJoin(key)
                .on(key.PROJECT_ID.eq(project.PROJECT_ID))
                .where(WORK_ITEM.WORKSPACE_ID.eq(workspace))
                .and(WORK_ITEM
                        .PUBLIC_REF
                        .eq(reference)
                        .or(WORK_ITEM
                                .PUBLIC_REF
                                .isNull()
                                .and(org.jooq
                                        .impl
                                        .DSL
                                        .concat(
                                                key.KEY,
                                                org.jooq.impl.DSL.inline("-"),
                                                WORK_ITEM.NUMBER.cast(String.class))
                                        .eq(reference))))
                .and(WORK_ITEM.DELETED_AT.isNull())
                .fetchOne(WORK_ITEM.WORK_ITEM_ID);
    }
}

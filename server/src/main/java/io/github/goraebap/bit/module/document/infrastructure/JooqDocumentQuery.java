package io.github.goraebap.bit.module.document.infrastructure;

import static io.github.goraebap.bit.jooq.tables.Document.DOCUMENT;
import static io.github.goraebap.bit.jooq.tables.DocumentLabel.DOCUMENT_LABEL;
import static io.github.goraebap.bit.jooq.tables.Folder.FOLDER;
import static io.github.goraebap.bit.jooq.tables.Label.LABEL;
import static io.github.goraebap.bit.jooq.tables.Link.LINK;
import static io.github.goraebap.bit.jooq.tables.Project.PROJECT;

import io.github.goraebap.bit.module.document.application.DocumentQuery;
import io.github.goraebap.bit.module.document.application.DocumentViews;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.Record;
import org.jooq.SelectFieldOrAsterisk;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class JooqDocumentQuery implements DocumentQuery {
    private static final int EXCERPT = 160;
    private static final String DOCUMENT_TYPE = "document";
    private static final String WORK_ITEM_TYPE = "work_item";
    private static final Field<String> EXCERPT_FIELD =
            DSL.substring(DOCUMENT.BODY, 1, EXCERPT).as("excerpt");
    private final DSLContext dslContext;

    @Override
    public List<DocumentViews.Folder> folders(String workspaceId, String projectId) {
        return dslContext
                .selectFrom(FOLDER)
                .where(FOLDER.WORKSPACE_ID.eq(workspaceId))
                .and(JooqFolderRepository.part(projectId))
                .and(FOLDER.DELETED_AT.isNull())
                .orderBy(DSL.lower(FOLDER.NAME), FOLDER.FOLDER_ID)
                .fetch(r -> new DocumentViews.Folder(
                        r.getFolderId(), r.getProjectId(), r.getParentFolderId(), r.getName(), r.getVersion()));
    }

    @Override
    public List<DocumentViews.Summary> documentsIn(String workspaceId, String projectId, String folderId) {
        var rows = dslContext
                .select(summaryFields())
                .from(DOCUMENT)
                .where(DOCUMENT.WORKSPACE_ID.eq(workspaceId))
                .and(projectId == null ? DOCUMENT.PROJECT_ID.isNull() : DOCUMENT.PROJECT_ID.eq(projectId))
                .and(folderId == null ? DOCUMENT.FOLDER_ID.isNull() : DOCUMENT.FOLDER_ID.eq(folderId))
                .and(DOCUMENT.DELETED_AT.isNull())
                .orderBy(DSL.lower(DOCUMENT.TITLE), DOCUMENT.DOCUMENT_ID)
                .fetch();
        return summaries(workspaceId, rows);
    }

    @Override
    public List<DocumentViews.Summary> search(String workspaceId, Search search, Cursor after, int limit) {
        Condition where = DOCUMENT.WORKSPACE_ID
                .eq(workspaceId)
                .and(DOCUMENT.DELETED_AT.isNull())
                .and(DOCUMENT.PROJECT_ID
                        .isNull()
                        .or(DSL.exists(DSL.selectOne()
                                .from(PROJECT)
                                .where(PROJECT.PROJECT_ID.eq(DOCUMENT.PROJECT_ID))
                                .and(PROJECT.DELETED_AT.isNull()))));
        if (search.projectId() != null) where = where.and(DOCUMENT.PROJECT_ID.eq(search.projectId()));
        else if (search.workspaceOnly()) where = where.and(DOCUMENT.PROJECT_ID.isNull());
        if (search.labelId() != null)
            where = where.and(DSL.exists(DSL.selectOne()
                    .from(DOCUMENT_LABEL)
                    .where(DOCUMENT_LABEL.DOCUMENT_ID.eq(DOCUMENT.DOCUMENT_ID))
                    .and(DOCUMENT_LABEL.LABEL_ID.eq(search.labelId()))));
        if (search.text() != null && !search.text().isBlank())
            where = where.and(DOCUMENT.TITLE.containsIgnoreCase(search.text().strip()));
        if (search.workItemId() != null)
            where = where.and(DSL.exists(DSL.selectOne()
                    .from(LINK)
                    .where(LINK.WORKSPACE_ID.eq(workspaceId))
                    .and(LINK.FROM_TYPE.eq(DOCUMENT_TYPE))
                    .and(LINK.FROM_ID.eq(DOCUMENT.DOCUMENT_ID))
                    .and(LINK.TO_TYPE.eq(WORK_ITEM_TYPE))
                    .and(LINK.TO_ID.eq(search.workItemId()))
                    .and(LINK.DELETED_AT.isNull())));
        if (after != null)
            where = where.and(DSL.row(DOCUMENT.UPDATED_AT, DOCUMENT.DOCUMENT_ID).lt(after.updatedAt(), after.id()));
        var rows = dslContext
                .select(summaryFields())
                .from(DOCUMENT)
                .where(where)
                .orderBy(DOCUMENT.UPDATED_AT.desc(), DOCUMENT.DOCUMENT_ID.desc())
                .limit(limit)
                .fetch();
        return summaries(workspaceId, rows);
    }

    @Override
    public Optional<Row> findById(String workspaceId, String id) {
        var fields = new ArrayList<SelectFieldOrAsterisk>(List.of(summaryFields()));
        fields.add(DOCUMENT.BODY);
        fields.add(DOCUMENT.CREATED_AT);
        fields.add(DOCUMENT.CREATED_BY);
        fields.add(DOCUMENT.CREATED_BY_AGENT);
        return dslContext
                .select(fields)
                .from(DOCUMENT)
                .where(DOCUMENT.WORKSPACE_ID.eq(workspaceId))
                .and(DOCUMENT.DOCUMENT_ID.eq(id))
                .and(DOCUMENT.DELETED_AT.isNull())
                .fetchOptional()
                .map(r -> new Row(
                        summaries(workspaceId, List.of(r)).getFirst(),
                        r.get(DOCUMENT.BODY),
                        r.get(DOCUMENT.CREATED_AT),
                        r.get(DOCUMENT.CREATED_BY),
                        r.get(DOCUMENT.CREATED_BY_AGENT)));
    }

    @Override
    public List<Link> links(String workspaceId, String documentId) {
        return dslContext
                .select(LINK.LINK_ID, LINK.TO_ID)
                .from(LINK)
                .where(LINK.WORKSPACE_ID.eq(workspaceId))
                .and(LINK.FROM_TYPE.eq(DOCUMENT_TYPE))
                .and(LINK.FROM_ID.eq(documentId))
                .and(LINK.TO_TYPE.eq(WORK_ITEM_TYPE))
                .and(LINK.DELETED_AT.isNull())
                .orderBy(LINK.CREATED_AT, LINK.LINK_ID)
                .fetch(r -> new Link(r.value1(), r.value2()));
    }

    private static SelectFieldOrAsterisk[] summaryFields() {
        return new SelectFieldOrAsterisk[] {
            DOCUMENT.DOCUMENT_ID,
            DOCUMENT.PROJECT_ID,
            DOCUMENT.FOLDER_ID,
            DOCUMENT.TITLE,
            EXCERPT_FIELD,
            DOCUMENT.VERSION,
            DOCUMENT.UPDATED_AT,
            DOCUMENT.UPDATED_BY,
            DOCUMENT.UPDATED_BY_AGENT
        };
    }

    private List<DocumentViews.Summary> summaries(String workspaceId, Collection<? extends Record> rows) {
        var ids = rows.stream().map(r -> r.get(DOCUMENT.DOCUMENT_ID)).toList();
        Map<String, List<String>> labels = new HashMap<>();
        if (!ids.isEmpty())
            dslContext
                    .select(DOCUMENT_LABEL.DOCUMENT_ID, DOCUMENT_LABEL.LABEL_ID)
                    .from(DOCUMENT_LABEL)
                    .join(LABEL)
                    .on(LABEL.LABEL_ID.eq(DOCUMENT_LABEL.LABEL_ID))
                    .where(DOCUMENT_LABEL.DOCUMENT_ID.in(ids))
                    .and(LABEL.WORKSPACE_ID.eq(workspaceId))
                    .and(LABEL.DELETED_AT.isNull())
                    .orderBy(DOCUMENT_LABEL.LABEL_ID)
                    .forEach(r -> labels.computeIfAbsent(r.value1(), id -> new ArrayList<>())
                            .add(r.value2()));
        return rows.stream()
                .map(r -> new DocumentViews.Summary(
                        r.get(DOCUMENT.DOCUMENT_ID),
                        r.get(DOCUMENT.PROJECT_ID),
                        r.get(DOCUMENT.FOLDER_ID),
                        r.get(DOCUMENT.TITLE),
                        r.get(EXCERPT_FIELD),
                        labels.getOrDefault(r.get(DOCUMENT.DOCUMENT_ID), List.of()),
                        r.get(DOCUMENT.VERSION),
                        r.get(DOCUMENT.UPDATED_AT),
                        r.get(DOCUMENT.UPDATED_BY),
                        r.get(DOCUMENT.UPDATED_BY_AGENT)))
                .toList();
    }
}

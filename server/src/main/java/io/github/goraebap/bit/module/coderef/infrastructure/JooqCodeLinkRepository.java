package io.github.goraebap.bit.module.coderef.infrastructure;

import static io.github.goraebap.bit.jooq.tables.CodeLink.CODE_LINK;

import io.github.goraebap.bit.jooq.tables.records.CodeLinkRecord;
import io.github.goraebap.bit.module.coderef.domain.CodeLink;
import io.github.goraebap.bit.module.coderef.domain.CodeLinkRepository;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class JooqCodeLinkRepository implements CodeLinkRepository {
    private final DSLContext dslContext;

    @Override
    public List<CodeLink> findAllByIssueId(String issueId) {
        return dslContext
                .selectFrom(CODE_LINK)
                .where(CODE_LINK.ISSUE_ID.eq(issueId))
                .orderBy(CODE_LINK.UPDATED_AT.desc(), CODE_LINK.CODE_LINK_ID)
                .fetch(this::link);
    }

    @Override
    public List<CodeLink> findAllByIssueIdIn(Collection<String> issueIds, CodeLink.Kind kind) {
        if (issueIds.isEmpty()) return List.of();
        return dslContext
                .selectFrom(CODE_LINK)
                .where(CODE_LINK.ISSUE_ID.in(issueIds))
                .and(CODE_LINK.KIND.eq(kind.name()))
                .orderBy(CODE_LINK.UPDATED_AT.desc(), CODE_LINK.CODE_LINK_ID)
                .fetch(this::link);
    }

    @Override
    public List<CodeLink> findAllByExternalId(String integrationId, CodeLink.Kind kind, String externalId) {
        return dslContext
                .selectFrom(CODE_LINK)
                .where(CODE_LINK.REPOSITORY_INTEGRATION_ID.eq(integrationId))
                .and(CODE_LINK.KIND.eq(kind.name()))
                .and(CODE_LINK.EXTERNAL_ID.eq(externalId))
                .fetch(this::link);
    }

    @Override
    public Optional<CodeLink> find(String integrationId, CodeLink.Kind kind, String externalId, String issueId) {
        return dslContext
                .selectFrom(CODE_LINK)
                .where(CODE_LINK.REPOSITORY_INTEGRATION_ID.eq(integrationId))
                .and(CODE_LINK.KIND.eq(kind.name()))
                .and(CODE_LINK.EXTERNAL_ID.eq(externalId))
                .and(CODE_LINK.ISSUE_ID.eq(issueId))
                .fetchOptional(this::link);
    }

    @Override
    public Optional<CodeLink> findMirror(String integrationId, String issueId) {
        return dslContext
                .selectFrom(CODE_LINK)
                .where(CODE_LINK.REPOSITORY_INTEGRATION_ID.eq(integrationId))
                .and(CODE_LINK.KIND.eq(CodeLink.Kind.issue.name()))
                .and(CODE_LINK.ISSUE_ID.eq(issueId))
                .limit(1)
                .fetchOptional(this::link);
    }

    @Override
    public void saveAll(Collection<CodeLink> links) {
        if (links.isEmpty()) return;
        var queries = links.stream()
                .map(l -> {
                    var r = dslContext.newRecord(CODE_LINK);
                    r.setCodeLinkId(l.id());
                    r.setRepositoryIntegrationId(l.integrationId());
                    r.setIssueId(l.issueId());
                    r.setKind(l.kind().name());
                    r.setExternalId(l.externalId());
                    r.setUrl(l.url());
                    r.setTitle(l.title());
                    r.setState(l.state().name());
                    r.setAuthor(l.author());
                    r.setDetail(l.detail());
                    r.setCreatedAt(l.createdAt());
                    r.setUpdatedAt(l.updatedAt());
                    return dslContext
                            .insertInto(CODE_LINK)
                            .set(r)
                            .onConflict(CODE_LINK.CODE_LINK_ID)
                            .doUpdate()
                            .set(r);
                })
                .toList();
        dslContext.batch(queries).execute();
    }

    private CodeLink link(CodeLinkRecord r) {
        return new CodeLink(
                r.getCodeLinkId(),
                r.getRepositoryIntegrationId(),
                r.getIssueId(),
                CodeLink.Kind.valueOf(r.getKind()),
                r.getExternalId(),
                r.getUrl(),
                r.getTitle(),
                CodeLink.State.valueOf(r.getState()),
                r.getAuthor(),
                r.getDetail(),
                r.getCreatedAt(),
                r.getUpdatedAt());
    }
}

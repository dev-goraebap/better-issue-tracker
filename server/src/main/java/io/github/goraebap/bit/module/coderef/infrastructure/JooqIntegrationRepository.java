package io.github.goraebap.bit.module.coderef.infrastructure;

import static io.github.goraebap.bit.jooq.tables.IntegrationRule.INTEGRATION_RULE;
import static io.github.goraebap.bit.jooq.tables.RepositoryIntegration.REPOSITORY_INTEGRATION;

import io.github.goraebap.bit.jooq.tables.records.RepositoryIntegrationRecord;
import io.github.goraebap.bit.module.coderef.domain.Integration;
import io.github.goraebap.bit.module.coderef.domain.IntegrationRepository;
import io.github.goraebap.bit.module.coderef.domain.Provider;
import io.github.goraebap.bit.module.coderef.domain.RuleEvent;
import java.time.Instant;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class JooqIntegrationRepository implements IntegrationRepository {
    private final DSLContext dslContext;

    @Override
    public Optional<Integration> findById(String id) {
        return dslContext
                .selectFrom(REPOSITORY_INTEGRATION)
                .where(REPOSITORY_INTEGRATION.REPOSITORY_INTEGRATION_ID.eq(id))
                .fetchOptional(this::integration);
    }

    @Override
    public List<Integration> findAllByProjectId(String projectId) {
        return dslContext
                .selectFrom(REPOSITORY_INTEGRATION)
                .where(REPOSITORY_INTEGRATION.PROJECT_ID.eq(projectId))
                .orderBy(REPOSITORY_INTEGRATION.PROVIDER)
                .fetch(this::integration);
    }

    @Override
    public void save(Integration i) {
        var r = dslContext.newRecord(REPOSITORY_INTEGRATION);
        r.setRepositoryIntegrationId(i.id());
        r.setWorkspaceId(i.workspaceId());
        r.setProjectId(i.projectId());
        r.setProvider(i.provider().name());
        r.setBaseUrl(i.baseUrl());
        r.setRepository(i.repository());
        r.setExternalRepositoryId(i.externalRepositoryId());
        r.setWebUrl(i.webUrl());
        r.setTokenCipher(i.tokenCipher());
        r.setWebhookSecretCipher(i.webhookSecretCipher());
        r.setWebhookId(i.webhookId());
        r.setAccountLogin(i.accountLogin());
        r.setSyncsIssues(i.syncsIssues());
        r.setCommentsLink(i.commentsLink());
        r.setIsActive(i.active());
        r.setLastEventAt(i.lastEventAt());
        r.setLastError(i.lastError());
        r.setVersion(i.version());
        r.setCreatedAt(i.createdAt());
        r.setCreatedBy(i.createdBy());
        r.setCreatedByAgent(i.createdByAgent());
        r.setUpdatedAt(i.updatedAt());
        r.setUpdatedBy(i.updatedBy());
        r.setUpdatedByAgent(i.updatedByAgent());
        dslContext
                .insertInto(REPOSITORY_INTEGRATION)
                .set(r)
                .onConflict(REPOSITORY_INTEGRATION.REPOSITORY_INTEGRATION_ID)
                .doUpdate()
                .set(r)
                .execute();
    }

    @Override
    public void deleteById(String id) {
        dslContext
                .deleteFrom(REPOSITORY_INTEGRATION)
                .where(REPOSITORY_INTEGRATION.REPOSITORY_INTEGRATION_ID.eq(id))
                .execute();
    }

    @Override
    public Map<RuleEvent, Optional<String>> findRules(String projectId) {
        var rules = new EnumMap<RuleEvent, Optional<String>>(RuleEvent.class);
        dslContext
                .selectFrom(INTEGRATION_RULE)
                .where(INTEGRATION_RULE.PROJECT_ID.eq(projectId))
                .forEach(r -> rules.put(RuleEvent.valueOf(r.getEvent()), Optional.ofNullable(r.getBoardColumnId())));
        return rules;
    }

    @Override
    public void saveRules(String projectId, Map<RuleEvent, Optional<String>> rules, String actor, Instant now) {
        dslContext
                .deleteFrom(INTEGRATION_RULE)
                .where(INTEGRATION_RULE.PROJECT_ID.eq(projectId))
                .execute();
        var rows = rules.entrySet().stream()
                .map(rule -> {
                    var r = dslContext.newRecord(INTEGRATION_RULE);
                    r.setProjectId(projectId);
                    r.setEvent(rule.getKey().name());
                    r.setBoardColumnId(rule.getValue().orElse(null));
                    r.setUpdatedAt(now);
                    r.setUpdatedBy(actor);
                    return r;
                })
                .toList();
        if (!rows.isEmpty()) dslContext.batchInsert(rows).execute();
    }

    private Integration integration(RepositoryIntegrationRecord r) {
        return Integration.fromPersistence(
                r.getRepositoryIntegrationId(),
                r.getWorkspaceId(),
                r.getProjectId(),
                Provider.valueOf(r.getProvider()),
                r.getBaseUrl(),
                r.getRepository(),
                r.getExternalRepositoryId(),
                r.getWebUrl(),
                r.getTokenCipher(),
                r.getWebhookSecretCipher(),
                r.getWebhookId(),
                r.getAccountLogin(),
                Boolean.TRUE.equals(r.getSyncsIssues()),
                Boolean.TRUE.equals(r.getCommentsLink()),
                Boolean.TRUE.equals(r.getIsActive()),
                r.getLastEventAt(),
                r.getLastError(),
                r.getVersion(),
                r.getCreatedAt(),
                r.getCreatedBy(),
                r.getCreatedByAgent(),
                r.getUpdatedAt(),
                r.getUpdatedBy(),
                r.getUpdatedByAgent());
    }
}

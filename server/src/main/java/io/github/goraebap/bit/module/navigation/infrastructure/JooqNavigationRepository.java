package io.github.goraebap.bit.module.navigation.infrastructure;

import static io.github.goraebap.bit.jooq.tables.NavigationScope.NAVIGATION_SCOPE;
import static io.github.goraebap.bit.jooq.tables.ProjectFavorite.PROJECT_FAVORITE;

import io.github.goraebap.bit.module.navigation.domain.Navigation;
import io.github.goraebap.bit.module.navigation.domain.NavigationRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

@Repository
@RequiredArgsConstructor
class JooqNavigationRepository implements NavigationRepository {
    private static final TypeReference<List<Navigation.Entry>> ENTRIES = new TypeReference<>() {};
    private final DSLContext dslContext;
    private final JsonMapper jsonMapper;

    @Override
    public Optional<Navigation> find(String workspace, String scope) {
        return dslContext
                .selectFrom(NAVIGATION_SCOPE)
                .where(NAVIGATION_SCOPE.WORKSPACE_ID.eq(workspace))
                .and(NAVIGATION_SCOPE.SCOPE.eq(scope))
                .fetchOptional(r -> new Navigation(r.getVersion(), jsonMapper.readValue(r.getEntries(), ENTRIES)));
    }

    @Override
    public void save(String workspace, String scope, Navigation navigation, String actor, String agent, Instant at) {
        var r = dslContext.newRecord(NAVIGATION_SCOPE);
        r.setWorkspaceId(workspace);
        r.setScope(scope);
        r.setVersion(navigation.version());
        r.setEntries(jsonMapper.writeValueAsString(navigation.entries()));
        r.setUpdatedBy(actor);
        r.setUpdatedByAgent(agent);
        r.setUpdatedAt(at);
        dslContext
                .insertInto(NAVIGATION_SCOPE)
                .set(r)
                .onConflict(NAVIGATION_SCOPE.WORKSPACE_ID, NAVIGATION_SCOPE.SCOPE)
                .doUpdate()
                .set(r)
                .execute();
    }

    @Override
    public List<String> favorites(String workspace, String user) {
        return dslContext
                .select(PROJECT_FAVORITE.PROJECT_ID)
                .from(PROJECT_FAVORITE)
                .where(PROJECT_FAVORITE.WORKSPACE_ID.eq(workspace))
                .and(PROJECT_FAVORITE.USER_ID.eq(user))
                .orderBy(PROJECT_FAVORITE.PROJECT_ID)
                .fetch(PROJECT_FAVORITE.PROJECT_ID);
    }

    @Override
    public void favorite(String workspace, String user, String project, boolean value) {
        if (value)
            dslContext
                    .insertInto(PROJECT_FAVORITE)
                    .set(PROJECT_FAVORITE.WORKSPACE_ID, workspace)
                    .set(PROJECT_FAVORITE.USER_ID, user)
                    .set(PROJECT_FAVORITE.PROJECT_ID, project)
                    .onConflictDoNothing()
                    .execute();
        else
            dslContext
                    .deleteFrom(PROJECT_FAVORITE)
                    .where(PROJECT_FAVORITE.WORKSPACE_ID.eq(workspace))
                    .and(PROJECT_FAVORITE.USER_ID.eq(user))
                    .and(PROJECT_FAVORITE.PROJECT_ID.eq(project))
                    .execute();
    }
}

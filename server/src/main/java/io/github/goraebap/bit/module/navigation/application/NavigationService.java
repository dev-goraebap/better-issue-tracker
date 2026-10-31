package io.github.goraebap.bit.module.navigation.application;

import io.github.goraebap.bit.module.navigation.domain.Navigation;
import io.github.goraebap.bit.module.navigation.domain.NavigationRepository;
import io.github.goraebap.bit.module.project.ProjectFacade;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import io.github.goraebap.bit.shared.error.CommonErrorCode;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.time.Clock;
import java.util.HashSet;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NavigationService {
    private final NavigationRepository navigationRepository;
    private final WorkspaceFacade workspaceFacade;
    private final ProjectFacade projectFacade;
    private final Clock clock;

    @Transactional(readOnly = true)
    public Navigation get(CurrentUser actor, String workspace, String scope) {
        access(actor, workspace, scope, false);
        return navigationRepository
                .find(workspace, scope)
                .orElseGet(() -> new Navigation(0, Navigation.defaults(!scope.equals("workspace"))));
    }

    @Transactional
    public Navigation save(
            CurrentUser actor, String workspace, String scope, long version, List<Navigation.Entry> entries) {
        access(actor, workspace, scope, true);
        var before = get(actor, workspace, scope);
        if (version != before.version()) throw CommonErrorCode.COMMON_CONFLICT.raise();
        var keys = Navigation.defaults(!scope.equals("workspace")).stream()
                .map(Navigation.Entry::key)
                .collect(java.util.stream.Collectors.toSet());
        if (entries == null
                || entries.size() != keys.size()
                || !new HashSet<>(entries.stream().map(Navigation.Entry::key).toList()).equals(keys)
                || entries.stream()
                        .anyMatch(e -> e.label() == null
                                || e.label().isBlank()
                                || e.label().strip().length() > 32
                                || e.label().chars().anyMatch(Character::isISOControl)))
            throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        var next = new Navigation(
                version + 1,
                entries.stream()
                        .map(e -> new Navigation.Entry(e.key(), e.label().strip()))
                        .toList());
        navigationRepository.save(workspace, scope, next, actor.userId(), actor.agent(), clock.instant());
        return next;
    }

    @Transactional(readOnly = true)
    public List<String> favorites(CurrentUser actor, String workspace) {
        workspaceFacade.requireAccess(actor, workspace, WorkspaceFacade.Action.READ);
        return navigationRepository.favorites(workspace, actor.userId()).stream()
                .filter(id -> {
                    try {
                        projectFacade.requireAccess(actor, workspace, id, false);
                        return true;
                    } catch (io.github.goraebap.bit.shared.error.BusinessException unavailable) {
                        return false;
                    }
                })
                .toList();
    }

    @Transactional
    public void favorite(CurrentUser actor, String workspace, String project, boolean value) {
        workspaceFacade.requireAccess(actor, workspace, WorkspaceFacade.Action.READ);
        projectFacade.requireAccess(actor, workspace, project, false);
        navigationRepository.favorite(workspace, actor.userId(), project, value);
    }

    private void access(CurrentUser actor, String workspace, String scope, boolean writing) {
        if (scope.equals("workspace"))
            workspaceFacade.requireAccess(
                    actor, workspace, writing ? WorkspaceFacade.Action.EDIT_SETTINGS : WorkspaceFacade.Action.READ);
        else if (writing) projectFacade.requireSettings(actor, workspace, scope, false, false);
        else projectFacade.requireAccess(actor, workspace, scope, false);
    }
}

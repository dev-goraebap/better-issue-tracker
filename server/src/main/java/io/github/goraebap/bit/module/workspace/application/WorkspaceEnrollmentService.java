package io.github.goraebap.bit.module.workspace.application;

import io.github.goraebap.bit.module.iam.IamFacade;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import io.github.goraebap.bit.shared.error.CommonErrorCode;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WorkspaceEnrollmentService {
    private final WorkspaceService workspaceService;
    private final IamFacade iamFacade;

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public UUID register(CurrentUser actor, String token, String name, String password) {
        if (actor != null) throw CommonErrorCode.AUTH_FORBIDDEN.raise();
        var preview = workspaceService.preview(token);
        if (iamFacade.userByEmail(preview.email()).isPresent())
            throw WorkspaceErrorCode.WORKSPACE_INVITATION_LOGIN_REQUIRED.raise();
        var prepared = iamFacade.prepareIdentity(preview.email(), name, password);
        return workspaceService.register(token, prepared);
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public void transfer(CurrentUser actor, UUID workspace, UUID target, String password) {
        workspaceService.requireAccess(actor, workspace, WorkspaceFacade.Action.OWNER);
        var proof = iamFacade.reauthenticate(actor, password);
        workspaceService.transfer(actor, workspace, target, proof);
    }
}

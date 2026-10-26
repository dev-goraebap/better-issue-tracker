package io.github.goraebap.bit.module.document.application;

import io.github.goraebap.bit.module.document.domain.DocumentRepository;
import io.github.goraebap.bit.module.link.TargetNotFoundException;
import io.github.goraebap.bit.module.link.TargetRef;
import io.github.goraebap.bit.module.link.TargetSpi;
import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** A document as what comments, activity and links point at (D-078, D-093). Its reference is its title. */
@Service
@RequiredArgsConstructor
public class DocumentTargetService implements TargetSpi {
    private final DocumentRepository repository;
    private final Parts parts;

    @Override
    public TargetType type() {
        return TargetType.document;
    }

    @Override
    @Transactional(readOnly = true)
    public TargetRef requireAccess(CurrentUser actor, String workspaceId, String id, boolean writing) {
        var document = repository.findById(workspaceId, id, false).orElseThrow(TargetNotFoundException::new);
        parts.require(actor, workspaceId, document.projectId(), writing);
        return new TargetRef(
                type(),
                id,
                workspaceId,
                document.projectId(),
                document.title(),
                document.title(),
                document.version(),
                null);
    }

    @Override
    @Transactional(readOnly = true)
    public void requireAllInProject(
            CurrentUser actor, String workspaceId, String projectId, Set<String> ids, boolean writing) {
        parts.require(actor, workspaceId, projectId, writing);
        if (repository.countAllById(workspaceId, projectId, ids) != ids.size()) throw new TargetNotFoundException();
    }
}

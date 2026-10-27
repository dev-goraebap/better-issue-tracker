package io.github.goraebap.bit.module.document.application;

import io.github.goraebap.bit.module.file.AttachedFile;
import io.github.goraebap.bit.module.file.AttachmentMarkdown;
import io.github.goraebap.bit.module.link.TargetBodySpi;
import io.github.goraebap.bit.module.link.TargetRef;
import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DocumentBodyService implements TargetBodySpi {
    private final DocumentService service;

    @Override
    public TargetType type() {
        return TargetType.document;
    }

    @Override
    public void appendAttachments(CurrentUser actor, TargetRef target, List<AttachedFile> files) {
        var doc = service.get(actor, target.workspaceId(), target.id());
        var update = new DocumentRequests.Update();
        update.setExpectedVersion(doc.version());
        update.setBody(AttachmentMarkdown.append(doc.body(), files));
        service.revise(actor, target.workspaceId(), target.id(), update);
    }
}

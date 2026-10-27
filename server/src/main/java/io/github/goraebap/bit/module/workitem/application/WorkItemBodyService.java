package io.github.goraebap.bit.module.workitem.application;

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
public class WorkItemBodyService implements TargetBodySpi {
    private final WorkItemService service;

    @Override
    public TargetType type() {
        return TargetType.work_item;
    }

    @Override
    public void appendAttachments(CurrentUser actor, TargetRef target, List<AttachedFile> files) {
        var item = service.get(actor, target.workspaceId(), target.projectId(), target.id());
        var update = new WorkItemRequests.Update();
        update.setExpectedVersion(item.version());
        update.setDescription(AttachmentMarkdown.append(item.description(), files));
        service.revise(actor, target.workspaceId(), target.projectId(), target.id(), update);
    }
}

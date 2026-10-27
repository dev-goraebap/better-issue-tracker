package io.github.goraebap.bit.module.link;

import io.github.goraebap.bit.module.file.AttachedFile;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.List;

/** The owning module revises its body in the same transaction as the files are bound. */
public interface TargetBodySpi {
    TargetType type();

    void appendAttachments(CurrentUser actor, TargetRef target, List<AttachedFile> files);
}

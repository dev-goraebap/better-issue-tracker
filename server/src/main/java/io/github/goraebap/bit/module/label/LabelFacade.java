package io.github.goraebap.bit.module.label;

import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.Comparator;
import java.util.Map;
import java.util.Set;

public interface LabelFacade {
    /** Live labels of the workspace among the given ids; unknown, deleted and foreign ids are left out. */
    Map<String, LabelRef> findAllById(CurrentUser actor, String workspaceId, Set<String> labelIds);

    /** The workspace's live labels, system labels first and then by name. */
    java.util.List<LabelRef> findAll(CurrentUser actor, String workspaceId);

    /** Workspace access for label requests; a non-null id must also name a live label of the workspace. */
    void requireAccess(CurrentUser actor, String workspaceId, String labelId, boolean writing);

    record LabelRef(String id, String name, String color, boolean system) {
        /** Display order everywhere labels are listed: system labels first, then by name. */
        public static final Comparator<LabelRef> ORDER = Comparator.comparing((LabelRef label) -> !label.system())
                .thenComparing(LabelRef::name, String.CASE_INSENSITIVE_ORDER)
                .thenComparing(LabelRef::id);
    }
}

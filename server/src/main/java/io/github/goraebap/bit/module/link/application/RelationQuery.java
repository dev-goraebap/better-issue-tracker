package io.github.goraebap.bit.module.link.application;

import io.github.goraebap.bit.module.link.TargetType;
import java.util.List;
import java.util.Set;

public interface RelationQuery {
    record Summary(
            TargetType type,
            String id,
            String projectId,
            String reference,
            String title,
            String category,
            String status,
            List<String> people,
            List<String> peopleIds) {
        public Summary {
            people = List.copyOf(people);
            peopleIds = List.copyOf(peopleIds);
        }
    }

    List<Summary> summaries(String workspaceId, TargetType type, Set<String> ids);

    String workItemId(String workspaceId, String reference);
}

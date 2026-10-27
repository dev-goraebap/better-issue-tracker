package io.github.goraebap.bit.module.link;

import java.util.List;

/** One visible relation, resolved using the reader's current project access. */
@io.swagger.v3.oas.annotations.media.Schema(
        requiredProperties = {"linkId", "relation", "outgoing", "type", "id", "title", "people", "peopleIds"})
public record RelationRef(
        String linkId,
        String relation,
        boolean outgoing,
        TargetType type,
        String id,
        String projectId,
        String reference,
        String title,
        String category,
        String status,
        List<String> people,
        List<String> peopleIds) {
    public RelationRef {
        people = List.copyOf(people);
        peopleIds = List.copyOf(peopleIds);
    }
}

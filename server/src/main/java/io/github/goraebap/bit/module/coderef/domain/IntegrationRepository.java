package io.github.goraebap.bit.module.coderef.domain;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Integrations and the project's rules for them; an integration is removed outright when it is disconnected. */
public interface IntegrationRepository {
    Optional<Integration> findById(String id);

    /** The project's integrations, by host. */
    List<Integration> findAllByProjectId(String projectId);

    void save(Integration integration);

    void deleteById(String id);

    /** The column each set event moves to; a mapped null is an event set not to move. Unset events are absent. */
    Map<RuleEvent, Optional<String>> findRules(String projectId);

    /** Sets one event's column (null: do not move); a missing value clears it back to the default. */
    void saveRules(String projectId, Map<RuleEvent, Optional<String>> rules, String actor, java.time.Instant now);
}

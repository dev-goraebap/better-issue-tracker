package io.github.goraebap.bit.module.navigation.domain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface NavigationRepository {
    Optional<Navigation> find(String workspace, String scope);

    void save(String workspace, String scope, Navigation navigation, String actor, String agent, Instant at);

    List<String> favorites(String workspace, String user);

    void favorite(String workspace, String user, String project, boolean value);
}

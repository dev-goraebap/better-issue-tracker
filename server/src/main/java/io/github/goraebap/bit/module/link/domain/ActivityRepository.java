package io.github.goraebap.bit.module.link.domain;

import java.util.List;

public interface ActivityRepository {
    void saveAll(List<Activity> activities);
}

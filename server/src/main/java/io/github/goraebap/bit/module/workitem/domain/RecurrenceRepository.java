package io.github.goraebap.bit.module.workitem.domain;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface RecurrenceRepository {
    Optional<Recurrence> findById(String id);

    List<Recurrence> findAllById(Set<String> ids);

    /** The rules that may still make an occurrence: those without an end, or ending on the day or later. */
    List<String> findRunningIds(LocalDate since);

    void save(Recurrence recurrence);
}

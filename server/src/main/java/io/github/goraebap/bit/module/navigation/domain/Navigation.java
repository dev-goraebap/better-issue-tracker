package io.github.goraebap.bit.module.navigation.domain;

import java.util.List;

public record Navigation(long version, List<Entry> entries) {
    public record Entry(String key, String label) {}

    public Navigation {
        entries = List.copyOf(entries);
    }

    public static List<Entry> defaults(boolean project) {
        var entries = new java.util.ArrayList<>(List.of(
                new Entry("issues", "이슈"),
                new Entry("schedules", "스케줄"),
                new Entry("manuals", "매뉴얼"),
                new Entry("resources", "리소스"),
                new Entry("members", "멤버")));
        if (!project) entries.add(new Entry("projects", "프로젝트"));
        return List.copyOf(entries);
    }
}

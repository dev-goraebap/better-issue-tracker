package io.github.goraebap.bit.module.workspace.domain;

import io.github.goraebap.bit.shared.domain.Ids;
import java.time.Instant;

public final class Workspace {
    private final String id;
    private String name;
    private final String slug;
    private final Instant createdAt;
    private final String createdBy;
    private Instant updatedAt;
    private String updatedBy;
    private String updatedByAgent;
    private Instant deletedAt;
    private String deletedBy;

    private Workspace(
            String id,
            String name,
            String slug,
            Instant createdAt,
            String createdBy,
            Instant updatedAt,
            String updatedBy,
            String agent,
            Instant deletedAt,
            String deletedBy) {
        this.id = id;
        this.name = name;
        this.slug = slug;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.updatedAt = updatedAt;
        this.updatedBy = updatedBy;
        this.updatedByAgent = agent;
        this.deletedAt = deletedAt;
        this.deletedBy = deletedBy;
    }

    public static Workspace create(String name, String slug, String actor, Instant now) {
        return new Workspace(Ids.newId(), validName(name), validSlug(slug), now, actor, now, actor, null, null, null);
    }

    public static Workspace fromPersistence(
            String id,
            String name,
            String slug,
            Instant createdAt,
            String createdBy,
            Instant updatedAt,
            String updatedBy,
            String agent,
            Instant deletedAt,
            String deletedBy) {
        return new Workspace(id, name, slug, createdAt, createdBy, updatedAt, updatedBy, agent, deletedAt, deletedBy);
    }

    public void rename(String name, String actor, String agent, Instant now) {
        this.name = validName(name);
        this.updatedBy = actor;
        this.updatedByAgent = agent;
        this.updatedAt = now;
    }

    public void delete(String actor, Instant now) {
        this.deletedAt = now;
        this.deletedBy = actor;
        this.updatedAt = now;
        this.updatedBy = actor;
        this.updatedByAgent = null;
    }

    private static String validName(String name) {
        if (name == null || name.strip().isEmpty() || name.strip().length() > 64)
            throw new IllegalArgumentException("Invalid workspace name");
        return name.strip();
    }

    private static String validSlug(String slug) {
        if (slug == null) throw new IllegalArgumentException("Invalid workspace slug");
        String value = slug.strip().toLowerCase(java.util.Locale.ROOT);
        if (!value.matches("[a-z0-9][a-z0-9-]{0,62}[a-z0-9]"))
            throw new IllegalArgumentException("Invalid workspace slug");
        return value;
    }

    public String id() {
        return id;
    }

    public String name() {
        return name;
    }

    public String slug() {
        return slug;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public String createdBy() {
        return createdBy;
    }

    public Instant updatedAt() {
        return updatedAt;
    }

    public String updatedBy() {
        return updatedBy;
    }

    public String updatedByAgent() {
        return updatedByAgent;
    }

    public Instant deletedAt() {
        return deletedAt;
    }

    public String deletedBy() {
        return deletedBy;
    }
}

package io.github.goraebap.bit.module.project;

/**
 * Status group of a board column, shared across projects so a workspace-wide board can group by it (D-111): backlog,
 * todo, doing, done and canceled, in that order. A closing column is done or canceled.
 */
public enum ColumnCategory {
    backlog,
    todo,
    doing,
    done,
    canceled;

    /** Whether a work item in this category is closed: done or canceled. */
    public boolean closes() {
        return this == done || this == canceled;
    }
}

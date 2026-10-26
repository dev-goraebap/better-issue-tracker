package io.github.goraebap.bit.module.coderef.domain;

/** What happens in a repository that can move an issue to a column (D-087), as Kaneo's workflow rules. */
public enum RuleEvent {
    /** A branch named after the issue was pushed: work started. */
    branch_push,
    /** A pull or merge request for the issue was opened: under review. */
    pr_opened,
    /** It was merged: done. */
    pr_merged,
    /** The repository's issue was opened or reopened: where a mirrored issue starts or returns. */
    issue_opened,
    /** The repository's issue was closed. */
    issue_closed
}

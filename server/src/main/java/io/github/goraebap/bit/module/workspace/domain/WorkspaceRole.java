package io.github.goraebap.bit.module.workspace.domain;

public enum WorkspaceRole {
    owner,
    admin,
    member,
    viewer;

    public boolean manages(WorkspaceRole target) {
        return target != owner && (this == owner || this == admin && (target == member || target == viewer));
    }

    public boolean editsSettings() {
        return this == owner || this == admin;
    }
}

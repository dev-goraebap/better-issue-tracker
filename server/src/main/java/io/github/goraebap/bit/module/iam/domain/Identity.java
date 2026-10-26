package io.github.goraebap.bit.module.iam.domain;

public record Identity(String id, String email, String name, boolean instanceAdmin) {}

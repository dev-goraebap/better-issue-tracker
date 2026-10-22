package io.github.goraebap.bit.module.iam.domain;

import java.util.UUID;

public record Identity(UUID id, String email, String name, boolean instanceAdmin) {}

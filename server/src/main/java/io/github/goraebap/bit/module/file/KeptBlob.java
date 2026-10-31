package io.github.goraebap.bit.module.file;

/** A kept file's blob; equal bytes always get the same blob. */
public record KeptBlob(String blobId, long size) {}

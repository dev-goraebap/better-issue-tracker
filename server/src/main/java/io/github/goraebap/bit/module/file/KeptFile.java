package io.github.goraebap.bit.module.file;

import java.nio.file.Path;

/** A non-empty file the server holds on its own disk, to keep as a blob without an attachment (FileFacade.keep). */
public record KeptFile(Path source, String filename, String contentType) {}

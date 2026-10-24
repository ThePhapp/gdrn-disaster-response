package com.gdrn.reporting.application;

import java.io.InputStream;
import java.util.Objects;

/** Framework-neutral upload input passed from the HTTP adapter to the storage port. */
public record AttachmentUpload(String originalFilename, String contentType, long declaredSize, InputStream content) {
    public AttachmentUpload {
        Objects.requireNonNull(content);
        if (declaredSize < 0) throw new AttachmentValidationException("size", "File size is invalid.");
    }
}

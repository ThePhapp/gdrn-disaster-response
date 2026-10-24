package com.gdrn.reporting.application;

public final class AttachmentValidationException extends RuntimeException {
    private final String field;
    private final String code;

    public AttachmentValidationException(String field, String message) {
        this(field, "ATTACHMENT_VALIDATION_ERROR", message);
    }

    public AttachmentValidationException(String field, String code, String message) {
        super(message);
        this.field = field;
        this.code = code;
    }

    public String field() { return field; }
    public String code() { return code; }
}

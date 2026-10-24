package com.gdrn.reporting.domain;

public final class InvalidReportAttachment extends RuntimeException {
    private final String field;

    public InvalidReportAttachment(String field) {
        super("Invalid report attachment: " + field);
        this.field = field;
    }

    public String field() {
        return field;
    }
}

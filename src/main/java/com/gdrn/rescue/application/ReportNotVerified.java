package com.gdrn.rescue.application;

public final class ReportNotVerified extends RuntimeException {
    public ReportNotVerified(String message) {
        super(message);
    }
}

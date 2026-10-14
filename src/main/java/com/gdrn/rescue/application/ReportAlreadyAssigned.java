package com.gdrn.rescue.application;

public final class ReportAlreadyAssigned extends RuntimeException {
    public ReportAlreadyAssigned(String message) {
        super(message);
    }
}

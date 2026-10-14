package com.gdrn.rescue.application;

public final class DisasterNotActive extends RuntimeException {
    public DisasterNotActive(String message) {
        super(message);
    }
}

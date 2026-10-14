package com.gdrn.rescue.application;

public final class RescueNotFoundException extends RuntimeException {
    public RescueNotFoundException(String message) {
        super(message);
    }
}

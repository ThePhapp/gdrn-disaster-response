package com.gdrn.rescue.application;

public final class RescueAccessDenied extends RuntimeException {
    public RescueAccessDenied() {
        super("Access denied");
    }
}

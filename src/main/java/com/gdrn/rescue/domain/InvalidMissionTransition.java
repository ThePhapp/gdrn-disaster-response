package com.gdrn.rescue.domain;

public final class InvalidMissionTransition extends RuntimeException {
    public InvalidMissionTransition(String message) {
        super(message);
    }
}

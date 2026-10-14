package com.gdrn.rescue.application;

public final class TeamBusy extends RuntimeException {
    public TeamBusy(String message) {
        super(message);
    }
}

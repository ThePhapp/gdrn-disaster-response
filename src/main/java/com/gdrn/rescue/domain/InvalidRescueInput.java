package com.gdrn.rescue.domain;

import java.util.Objects;

public final class InvalidRescueInput extends RuntimeException {
    private final String field;

    public InvalidRescueInput(String field) {
        super("Invalid " + field);
        this.field = Objects.requireNonNull(field);
    }

    public String field() {
        return field;
    }
}

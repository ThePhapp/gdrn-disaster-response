package com.gdrn.rescue.domain;

import java.util.Objects;
import java.util.UUID;

public final class RescueTeam {
    private final UUID id;
    private final String name;

    public RescueTeam(UUID id, String name) {
        this.id = Objects.requireNonNull(id, "id");
        if (name == null) {
            throw new InvalidRescueInput("name");
        }
        String clean = name.strip();
        if (clean.isEmpty() || clean.codePointCount(0, clean.length()) > 120) {
            throw new InvalidRescueInput("name");
        }
        this.name = clean;
    }

    public UUID id() {
        return id;
    }

    public String name() {
        return name;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof RescueTeam that)) return false;
        return id.equals(that.id);
    }

    @Override
    public int hashCode() {
        return id.hashCode();
    }
}

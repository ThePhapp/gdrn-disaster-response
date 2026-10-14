package com.gdrn.rescue.domain;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RescueTeamTest {

    @Test
    void createsValidTeamWithTrimmedName() {
        UUID id = UUID.randomUUID();
        RescueTeam team = new RescueTeam(id, "  Rescue Team Alpha  ");

        assertThat(team.id()).isEqualTo(id);
        assertThat(team.name()).isEqualTo("Rescue Team Alpha");
    }

    @Test
    void rejectsNullIdOrInvalidName() {
        UUID id = UUID.randomUUID();

        assertThatThrownBy(() -> new RescueTeam(null, "Valid Name"))
                .isInstanceOf(NullPointerException.class);

        assertThatThrownBy(() -> new RescueTeam(id, null))
                .isInstanceOf(InvalidRescueInput.class)
                .hasMessageContaining("name");

        assertThatThrownBy(() -> new RescueTeam(id, "   "))
                .isInstanceOf(InvalidRescueInput.class)
                .hasMessageContaining("name");

        assertThatThrownBy(() -> new RescueTeam(id, "a".repeat(121)))
                .isInstanceOf(InvalidRescueInput.class)
                .hasMessageContaining("name");
    }

    @Test
    void equalityAndHashCodeBasedOnId() {
        UUID id = UUID.randomUUID();
        RescueTeam team1 = new RescueTeam(id, "Alpha");
        RescueTeam team2 = new RescueTeam(id, "Beta");
        RescueTeam team3 = new RescueTeam(UUID.randomUUID(), "Alpha");

        assertThat(team1).isEqualTo(team2);
        assertThat(team1.hashCode()).isEqualTo(team2.hashCode());
        assertThat(team1).isNotEqualTo(team3);
    }
}

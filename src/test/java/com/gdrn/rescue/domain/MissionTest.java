package com.gdrn.rescue.domain;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MissionTest {

    @Test
    void assignsMissionWithAssignedStatusAndNoStartedOrCompletedTimestamps() {
        UUID id = UUID.randomUUID();
        UUID reportId = UUID.randomUUID();
        UUID teamId = UUID.randomUUID();
        Instant now = Instant.now().truncatedTo(ChronoUnit.MICROS);

        Mission mission = Mission.assign(id, reportId, teamId, now);

        assertThat(mission.id()).isEqualTo(id);
        assertThat(mission.reportId()).isEqualTo(reportId);
        assertThat(mission.teamId()).isEqualTo(teamId);
        assertThat(mission.status()).isEqualTo(MissionStatus.ASSIGNED);
        assertThat(mission.assignedAt()).isEqualTo(now);
        assertThat(mission.updatedAt()).isEqualTo(now);
        assertThat(mission.startedAt()).isNull();
        assertThat(mission.completedAt()).isNull();
    }

    @Test
    void transitionsAssignedToInProgressThenCompleted() {
        UUID id = UUID.randomUUID();
        UUID reportId = UUID.randomUUID();
        UUID teamId = UUID.randomUUID();
        Instant t0 = Instant.now().truncatedTo(ChronoUnit.MICROS);
        Instant t1 = t0.plusSeconds(60);
        Instant t2 = t1.plusSeconds(120);

        Mission assigned = Mission.assign(id, reportId, teamId, t0);
        Mission inProgress = assigned.start(t1);

        assertThat(inProgress.status()).isEqualTo(MissionStatus.IN_PROGRESS);
        assertThat(inProgress.assignedAt()).isEqualTo(t0);
        assertThat(inProgress.startedAt()).isEqualTo(t1);
        assertThat(inProgress.updatedAt()).isEqualTo(t1);
        assertThat(inProgress.completedAt()).isNull();

        Mission completed = inProgress.complete(t2);

        assertThat(completed.status()).isEqualTo(MissionStatus.COMPLETED);
        assertThat(completed.assignedAt()).isEqualTo(t0);
        assertThat(completed.startedAt()).isEqualTo(t1);
        assertThat(completed.completedAt()).isEqualTo(t2);
        assertThat(completed.updatedAt()).isEqualTo(t2);
    }

    @Test
    void rejectsInvalidStateTransitions() {
        UUID id = UUID.randomUUID();
        UUID reportId = UUID.randomUUID();
        UUID teamId = UUID.randomUUID();
        Instant t0 = Instant.now().truncatedTo(ChronoUnit.MICROS);
        Instant t1 = t0.plusSeconds(60);

        Mission assigned = Mission.assign(id, reportId, teamId, t0);

        // Cannot skip to COMPLETED
        assertThatThrownBy(() -> assigned.complete(t1))
                .isInstanceOf(InvalidMissionTransition.class);

        Mission inProgress = assigned.start(t1);

        // Cannot restart IN_PROGRESS
        assertThatThrownBy(() -> inProgress.start(t1.plusSeconds(10)))
                .isInstanceOf(InvalidMissionTransition.class);

        Mission completed = inProgress.complete(t1.plusSeconds(60));

        // Cannot transition from COMPLETED
        assertThatThrownBy(() -> completed.start(t1.plusSeconds(120)))
                .isInstanceOf(InvalidMissionTransition.class);
        assertThatThrownBy(() -> completed.complete(t1.plusSeconds(120)))
                .isInstanceOf(InvalidMissionTransition.class);
    }

    @Test
    void rejectsTimestampOrderViolations() {
        UUID id = UUID.randomUUID();
        UUID reportId = UUID.randomUUID();
        UUID teamId = UUID.randomUUID();
        Instant t0 = Instant.now().truncatedTo(ChronoUnit.MICROS);

        Mission assigned = Mission.assign(id, reportId, teamId, t0);

        // startedAt before assignedAt
        assertThatThrownBy(() -> assigned.start(t0.minusSeconds(10)))
                .isInstanceOf(InvalidMissionTransition.class);

        Mission inProgress = assigned.start(t0.plusSeconds(10));

        // completedAt before startedAt
        assertThatThrownBy(() -> inProgress.complete(t0))
                .isInstanceOf(InvalidMissionTransition.class);
    }

    @Test
    void rejectsNullFieldsDuringReconstitution() {
        UUID id = UUID.randomUUID();
        UUID reportId = UUID.randomUUID();
        UUID teamId = UUID.randomUUID();
        Instant now = Instant.now().truncatedTo(ChronoUnit.MICROS);

        assertThatThrownBy(() -> Mission.reconstitute(null, reportId, teamId, MissionStatus.ASSIGNED, now, null, null, now))
                .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> Mission.reconstitute(id, null, teamId, MissionStatus.ASSIGNED, now, null, null, now))
                .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> Mission.reconstitute(id, reportId, null, MissionStatus.ASSIGNED, now, null, null, now))
                .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> Mission.reconstitute(id, reportId, teamId, null, now, null, null, now))
                .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> Mission.reconstitute(id, reportId, teamId, MissionStatus.ASSIGNED, null, null, null, now))
                .isInstanceOf(NullPointerException.class);
    }
}

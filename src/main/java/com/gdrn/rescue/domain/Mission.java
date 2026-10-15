package com.gdrn.rescue.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public final class Mission {
    private final UUID id;
    private final UUID reportId;
    private final UUID teamId;
    private final MissionStatus status;
    private final Instant assignedAt;
    private final Instant startedAt;
    private final Instant completedAt;
    private final Instant updatedAt;

    public static Mission assign(UUID id, UUID reportId, UUID teamId, Instant assignedAt) {
        Objects.requireNonNull(assignedAt, "assignedAt");
        return new Mission(id, reportId, teamId, MissionStatus.ASSIGNED, assignedAt, null, null, assignedAt);
    }

    public static Mission create(UUID id, UUID reportId, UUID teamId, Instant assignedAt) {
        return assign(id, reportId, teamId, assignedAt);
    }

    public static Mission reconstitute(UUID id, UUID reportId, UUID teamId, MissionStatus status,
                                       Instant assignedAt, Instant startedAt, Instant completedAt, Instant updatedAt) {
        return new Mission(id, reportId, teamId, status, assignedAt, startedAt, completedAt, updatedAt);
    }

    private Mission(UUID id, UUID reportId, UUID teamId, MissionStatus status,
                    Instant assignedAt, Instant startedAt, Instant completedAt, Instant updatedAt) {
        this.id = Objects.requireNonNull(id, "id");
        this.reportId = Objects.requireNonNull(reportId, "reportId");
        this.teamId = Objects.requireNonNull(teamId, "teamId");
        this.status = Objects.requireNonNull(status, "status");
        this.assignedAt = Objects.requireNonNull(assignedAt, "assignedAt");
        this.startedAt = startedAt;
        this.completedAt = completedAt;
        this.updatedAt = Objects.requireNonNull(updatedAt, "updatedAt");

        if (updatedAt.isBefore(assignedAt)) {
            throw new InvalidMissionTransition("updatedAt cannot be before assignedAt");
        }

        switch (status) {
            case ASSIGNED -> {
                if (startedAt != null || completedAt != null) {
                    throw new InvalidMissionTransition("ASSIGNED mission cannot have startedAt or completedAt");
                }
            }
            case IN_PROGRESS -> {
                if (startedAt == null) {
                    throw new InvalidMissionTransition("IN_PROGRESS mission must have startedAt");
                }
                if (startedAt.isBefore(assignedAt)) {
                    throw new InvalidMissionTransition("startedAt cannot be before assignedAt");
                }
                if (completedAt != null) {
                    throw new InvalidMissionTransition("IN_PROGRESS mission cannot have completedAt");
                }
            }
            case COMPLETED -> {
                if (startedAt == null || completedAt == null) {
                    throw new InvalidMissionTransition("COMPLETED mission must have startedAt and completedAt");
                }
                if (startedAt.isBefore(assignedAt)) {
                    throw new InvalidMissionTransition("startedAt cannot be before assignedAt");
                }
                if (completedAt.isBefore(startedAt)) {
                    throw new InvalidMissionTransition("completedAt cannot be before startedAt");
                }
            }
        }
    }

    public Mission start(Instant at) {
        if (this.status != MissionStatus.ASSIGNED) {
            throw new InvalidMissionTransition("Cannot transition mission from " + this.status + " to IN_PROGRESS");
        }
        Objects.requireNonNull(at, "startedAt");
        if (at.isBefore(this.assignedAt)) {
            throw new InvalidMissionTransition("startedAt cannot be before assignedAt");
        }
        return new Mission(this.id, this.reportId, this.teamId, MissionStatus.IN_PROGRESS,
                this.assignedAt, at, null, at);
    }

    public Mission complete(Instant at) {
        if (this.status != MissionStatus.IN_PROGRESS) {
            throw new InvalidMissionTransition("Cannot transition mission from " + this.status + " to COMPLETED");
        }
        Objects.requireNonNull(at, "completedAt");
        if (at.isBefore(this.startedAt)) {
            throw new InvalidMissionTransition("completedAt cannot be before startedAt");
        }
        return new Mission(this.id, this.reportId, this.teamId, MissionStatus.COMPLETED,
                this.assignedAt, this.startedAt, at, at);
    }

    public UUID id() {
        return id;
    }

    public UUID reportId() {
        return reportId;
    }

    public UUID teamId() {
        return teamId;
    }

    public MissionStatus status() {
        return status;
    }

    public Instant assignedAt() {
        return assignedAt;
    }

    public Instant startedAt() {
        return startedAt;
    }

    public Instant completedAt() {
        return completedAt;
    }

    public Instant updatedAt() {
        return updatedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Mission mission)) return false;
        return id.equals(mission.id);
    }

    @Override
    public int hashCode() {
        return id.hashCode();
    }
}

CREATE TABLE rescue_teams (
    id UUID PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    CONSTRAINT rescue_teams_name_check CHECK (char_length(name) BETWEEN 1 AND 120 AND btrim(name) <> '')
);

CREATE TABLE rescue_missions (
    id UUID PRIMARY KEY,
    report_id UUID NOT NULL CONSTRAINT rescue_missions_report_id_key UNIQUE,
    team_id UUID NOT NULL REFERENCES rescue_teams (id),
    status VARCHAR(32) NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_rescue_missions_status CHECK (status IN ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED')),
    CONSTRAINT rescue_missions_lifecycle_check CHECK (
        (status = 'ASSIGNED' AND started_at IS NULL AND completed_at IS NULL)
        OR (status = 'IN_PROGRESS' AND started_at IS NOT NULL AND completed_at IS NULL)
        OR (status = 'COMPLETED' AND started_at IS NOT NULL AND completed_at IS NOT NULL)
    ),
    CONSTRAINT rescue_missions_timestamps_check CHECK (
        (started_at IS NULL OR started_at >= assigned_at)
        AND (completed_at IS NULL OR completed_at >= started_at)
        AND updated_at >= assigned_at
    )
);

CREATE UNIQUE INDEX idx_rescue_missions_team_active ON rescue_missions (team_id)
    WHERE status IN ('ASSIGNED', 'IN_PROGRESS');

CREATE INDEX idx_rescue_missions_team_id ON rescue_missions (team_id);
CREATE INDEX idx_rescue_missions_assigned_at ON rescue_missions (assigned_at DESC, id ASC);

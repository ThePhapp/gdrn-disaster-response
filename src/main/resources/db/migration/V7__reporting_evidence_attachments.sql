-- Private evidence metadata. Binary files are stored by an adapter outside the web root.
CREATE TABLE reporting_report_attachments (
    id UUID PRIMARY KEY,
    report_id UUID NOT NULL REFERENCES reporting_reports(id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL CHECK (char_length(original_filename) BETWEEN 1 AND 255),
    media_type VARCHAR(64) NOT NULL CHECK (media_type IN ('image/jpeg', 'image/png')),
    size_bytes BIGINT NOT NULL CHECK (size_bytes BETWEEN 1 AND 5242880),
    storage_key VARCHAR(255) NOT NULL UNIQUE CHECK (storage_key !~ '[\\/\\\\]'),
    created_at TIMESTAMPTZ NOT NULL,
    deleted_at TIMESTAMPTZ,
    CHECK (deleted_at IS NULL OR deleted_at >= created_at)
);

CREATE INDEX reporting_report_attachments_report_idx
    ON reporting_report_attachments (report_id, created_at ASC, id ASC)
    WHERE deleted_at IS NULL;

package com.gdrn.reporting.infrastructure.persistence;

import com.gdrn.reporting.application.port.ReportAttachmentStore;
import com.gdrn.reporting.domain.ReportAttachment;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcReportAttachmentStore implements ReportAttachmentStore {
    private static final String COLUMNS = "id, report_id, original_filename, media_type, size_bytes, storage_key, created_at";
    private final NamedParameterJdbcTemplate jdbc;

    public JdbcReportAttachmentStore(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Optional<ReportAttachment> insertIfCapacity(ReportAttachment attachment, int maxAttachments) {
        var parameters = new MapSqlParameterSource()
                .addValue("id", attachment.id())
                .addValue("report", attachment.reportId())
                .addValue("filename", attachment.originalFilename())
                .addValue("mediaType", attachment.mediaType())
                .addValue("size", attachment.sizeBytes())
                .addValue("storageKey", attachment.storageKey())
                .addValue("created", timestamp(attachment.createdAt()))
                .addValue("maxAttachments", maxAttachments);
        String sql = """
                with locked_report as (
                    select id from reporting_reports
                    where id = :report and status = 'PENDING' and withdrawn_at is null
                    for update
                ), inserted as (
                    insert into reporting_report_attachments
                        (id, report_id, original_filename, media_type, size_bytes, storage_key, created_at)
                    select :id, locked_report.id, :filename, :mediaType, :size, :storageKey, :created
                    from locked_report
                    where (select count(*) from reporting_report_attachments
                           where report_id = locked_report.id and deleted_at is null) < :maxAttachments
                    returning id, report_id, original_filename, media_type, size_bytes, storage_key, created_at
                )
                select * from inserted
                """;
        return jdbc.query(sql, parameters, JdbcReportAttachmentStore::map).stream().findFirst();
    }

    @Override
    public List<ReportAttachment> findByReportId(UUID reportId) {
        return jdbc.query("select " + COLUMNS + " from reporting_report_attachments "
                        + "where report_id = :report and deleted_at is null order by created_at asc, id asc",
                new MapSqlParameterSource("report", reportId), JdbcReportAttachmentStore::map);
    }

    @Override
    public Optional<ReportAttachment> findById(UUID reportId, UUID attachmentId) {
        return jdbc.query("select " + COLUMNS + " from reporting_report_attachments "
                        + "where report_id = :report and id = :id and deleted_at is null",
                new MapSqlParameterSource().addValue("report", reportId).addValue("id", attachmentId),
                JdbcReportAttachmentStore::map).stream().findFirst();
    }

    @Override
    public Optional<String> markDeleted(UUID reportId, UUID attachmentId, Instant deletedAt) {
        return jdbc.query("""
                        update reporting_report_attachments
                        set deleted_at = :deletedAt
                        where report_id = :report and id = :id and deleted_at is null
                        returning storage_key
                        """,
                new MapSqlParameterSource().addValue("report", reportId).addValue("id", attachmentId)
                        .addValue("deletedAt", timestamp(deletedAt)),
                (row, index) -> row.getString("storage_key")).stream().findFirst();
    }

    private static ReportAttachment map(ResultSet row, int index) throws SQLException {
        return ReportAttachment.create(row.getObject("id", UUID.class), row.getObject("report_id", UUID.class),
                row.getString("original_filename"), row.getString("media_type"), row.getLong("size_bytes"),
                row.getString("storage_key"), row.getObject("created_at", OffsetDateTime.class).toInstant());
    }

    private static OffsetDateTime timestamp(Instant value) {
        return OffsetDateTime.ofInstant(value, ZoneOffset.UTC);
    }
}

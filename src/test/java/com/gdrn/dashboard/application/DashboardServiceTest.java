package com.gdrn.dashboard.application;

import com.gdrn.dashboard.application.port.DashboardStatistics;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class DashboardServiceTest {
    private final DashboardStatistics statistics = mock(DashboardStatistics.class);
    private final DashboardService service = new DashboardService(statistics);
    private final DashboardStatistics.Snapshot snapshot = new DashboardStatistics.Snapshot(
            Instant.parse("2026-10-18T09:00:00Z"), new DashboardStatistics.Reports(105, 2, 1),
            new DashboardStatistics.Missions(1, 2, 3), new DashboardStatistics.Teams(4, 3));

    @Test void inclusiveVietnamDayBecomesHalfOpenInstantWindow() {
        Instant start = Instant.parse("2026-10-17T17:00:00Z");
        Instant end = Instant.parse("2026-10-18T17:00:00Z");
        when(statistics.read(start, end)).thenReturn(snapshot);
        var result = service.summarize("AUTHORITY", LocalDate.parse("2026-10-18"), LocalDate.parse("2026-10-18"));
        assertThat(result.reports().pending()).isEqualTo(105);
        assertThat(result.teams().available()).isEqualTo(4);
        assertThat(result.timeZone()).isEqualTo("Asia/Ho_Chi_Minh");
        verify(statistics).read(start, end);
    }

    @Test void allTimeAndLeapDayAreSupported() {
        when(statistics.read(null, null)).thenReturn(snapshot);
        assertThat(service.summarize("AUTHORITY", null, null).from()).isNull();
        var start = Instant.parse("2024-02-28T17:00:00Z");
        var end = Instant.parse("2024-02-29T17:00:00Z");
        when(statistics.read(start, end)).thenReturn(snapshot);
        service.summarize("AUTHORITY", LocalDate.parse("2024-02-29"), LocalDate.parse("2024-02-29"));
        verify(statistics).read(start, end);
    }

    @Test void invalidRangesAndRolesNeverReachThePort() {
        LocalDate day = LocalDate.parse("2026-10-18");
        for (String role : new String[]{"CITIZEN", "ADMIN", "RESPONDER", "", null}) {
            assertThatThrownBy(() -> service.summarize(role, null, null)).isInstanceOf(SecurityException.class);
        }
        assertThatThrownBy(() -> service.summarize("AUTHORITY", day, null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.summarize("AUTHORITY", null, day)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.summarize("AUTHORITY", day, day.minusDays(1))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.summarize("AUTHORITY", LocalDate.of(0, 1, 1), day)).isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(statistics);
    }

    @Test void storageFailurePropagatesInsteadOfBecomingZeroCounts() {
        when(statistics.read(null, null)).thenThrow(new IllegalStateException("unavailable"));
        assertThatThrownBy(() -> service.summarize("AUTHORITY", null, null)).isInstanceOf(IllegalStateException.class);
    }
}

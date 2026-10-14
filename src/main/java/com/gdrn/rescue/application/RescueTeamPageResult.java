package com.gdrn.rescue.application;

import java.util.List;

public record RescueTeamPageResult(List<RescueTeamSummary> items, int page, int size, long totalElements, long totalPages) {
    public RescueTeamPageResult {
        items = List.copyOf(items);
    }
}

package com.gdrn.rescue.api;

import com.gdrn.rescue.application.RescueTeamPageResult;
import java.util.List;

public record RescueTeamPageResponse(List<RescueTeamResponse> items, int page, int size, long totalElements, long totalPages) {
    public RescueTeamPageResponse {
        items = List.copyOf(items);
    }

    public static RescueTeamPageResponse from(RescueTeamPageResult result) {
        return new RescueTeamPageResponse(
                result.items().stream().map(RescueTeamResponse::from).toList(),
                result.page(),
                result.size(),
                result.totalElements(),
                result.totalPages());
    }
}

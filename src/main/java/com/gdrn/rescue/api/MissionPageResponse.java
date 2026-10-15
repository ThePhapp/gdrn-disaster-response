package com.gdrn.rescue.api;

import com.gdrn.rescue.application.MissionPageResult;
import java.util.List;

public record MissionPageResponse(List<MissionResponse> items, int page, int size, long totalElements, long totalPages) {
    public MissionPageResponse {
        items = List.copyOf(items);
    }

    public static MissionPageResponse from(MissionPageResult result) {
        return new MissionPageResponse(
                result.items().stream().map(MissionResponse::from).toList(),
                result.page(),
                result.size(),
                result.totalElements(),
                result.totalPages());
    }
}

package com.gdrn.rescue.application;

import com.gdrn.rescue.domain.Mission;
import java.util.List;

public record MissionPageResult(List<Mission> items, int page, int size, long totalElements, long totalPages) {
    public MissionPageResult {
        items = List.copyOf(items);
    }
}

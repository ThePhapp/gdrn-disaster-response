package com.gdrn.rescue.api;

import java.util.UUID;

public record CreateMissionRequest(UUID reportId, UUID teamId) {}

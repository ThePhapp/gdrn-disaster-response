package com.gdrn.rescue.api;

import com.gdrn.rescue.domain.InvalidRescueInput;
import com.gdrn.rescue.domain.MissionStatus;
import jakarta.servlet.http.HttpServletRequest;

import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

final class RescueRequestParser {
    private static final Pattern UUID_PATTERN = Pattern.compile("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$");
    private static final Set<String> TEAM_FILTERS = Set.of("page", "size", "sort", "availability");
    private static final Set<String> MISSION_FILTERS = Set.of("page", "size", "sort", "reportId", "status", "teamId");

    private RescueRequestParser() {}

    static void noQuery(HttpServletRequest request) {
        if (request.getQueryString() != null && !request.getQueryString().isBlank()) {
            throw new InvalidRescueInput("query");
        }
    }

    static void noBody(HttpServletRequest request) {
        if (request.getContentLengthLong() > 0 || request.getHeader("Transfer-Encoding") != null) {
            throw new InvalidRescueInput("body");
        }
    }

    static void validateTeamQuery(HttpServletRequest request) {
        validateQuery(request, TEAM_FILTERS);
    }

    static void validateMissionQuery(HttpServletRequest request) {
        validateQuery(request, MISSION_FILTERS);
    }

    private static void validateQuery(HttpServletRequest request, Set<String> allowed) {
        Map<String, String[]> query = request.getParameterMap();
        for (var entry : query.entrySet()) {
            if (!allowed.contains(entry.getKey()) || entry.getValue().length != 1 || entry.getValue()[0] == null) {
                throw new InvalidRescueInput(allowed.contains(entry.getKey()) ? entry.getKey() : "query");
            }
        }
    }

    static UUID uuid(String value, String field) {
        if (value == null || !UUID_PATTERN.matcher(value).matches()) {
            throw new InvalidRescueInput(field);
        }
        return UUID.fromString(value);
    }

    static Optional<UUID> optionalUuid(String value, String field) {
        if (value == null || value.isBlank()) return Optional.empty();
        return Optional.of(uuid(value, field));
    }

    static int parseInteger(String value, int defaultValue, String field) {
        if (value == null || value.isBlank()) return defaultValue;
        if (!value.matches("^[0-9]+$")) {
            throw new InvalidRescueInput(field);
        }
        try {
            int parsed = Integer.parseInt(value);
            if (field.equals("page") && (parsed < 0 || parsed > 1000000)) throw new InvalidRescueInput(field);
            if (field.equals("size") && (parsed < 1 || parsed > 100)) throw new InvalidRescueInput(field);
            return parsed;
        } catch (NumberFormatException ex) {
            throw new InvalidRescueInput(field);
        }
    }

    static MissionStatus missionStatus(String value) {
        if (value == null || value.isBlank()) {
            throw new InvalidRescueInput("status");
        }
        try {
            return MissionStatus.valueOf(value);
        } catch (IllegalArgumentException ex) {
            throw new InvalidRescueInput("status");
        }
    }

    static Optional<MissionStatus> optionalMissionStatus(String value) {
        if (value == null || value.isBlank()) return Optional.empty();
        try {
            return Optional.of(MissionStatus.valueOf(value));
        } catch (IllegalArgumentException ex) {
            throw new InvalidRescueInput("status");
        }
    }
}

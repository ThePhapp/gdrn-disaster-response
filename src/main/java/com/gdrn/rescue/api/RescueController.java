package com.gdrn.rescue.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.gdrn.rescue.application.RescueActor;
import com.gdrn.rescue.application.RescueService;
import com.gdrn.rescue.domain.InvalidRescueInput;
import com.gdrn.rescue.domain.Mission;
import com.gdrn.rescue.domain.MissionStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping(value = "/api", produces = MediaType.APPLICATION_JSON_VALUE)
public class RescueController {
    private final RescueService rescueService;

    public RescueController(RescueService rescueService) {
        this.rescueService = Objects.requireNonNull(rescueService, "rescueService");
    }

    @GetMapping("/rescue-teams")
    @Operation(operationId = "E12", summary = "E12 GET /api/rescue-teams")
    public ResponseEntity<RescueTeamPageResponse> listTeams(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt principal,
            HttpServletRequest request) {
        RescueActor actor = actor(principal);
        RescueRequestParser.noBody(request);
        RescueRequestParser.validateTeamQuery(request);

        int page = RescueRequestParser.parseInteger(request.getParameter("page"), 0, "page");
        int size = RescueRequestParser.parseInteger(request.getParameter("size"), 20, "size");
        String sort = request.getParameter("sort");
        String availability = request.getParameter("availability");

        var result = rescueService.listTeams(actor, page, size, sort, availability);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(RescueTeamPageResponse.from(result));
    }

    @PostMapping(value = "/rescue-missions", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(operationId = "E13", summary = "E13 POST /api/rescue-missions")
    public ResponseEntity<MissionResponse> createMission(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt principal,
            @RequestBody JsonNode body,
            HttpServletRequest request) {
        RescueActor actor = actor(principal);
        RescueRequestParser.noQuery(request);

        if (body == null || !body.isObject() || body.size() != 2) {
            throw new InvalidRescueInput("body");
        }
        if (!body.has("reportId") || !body.has("teamId")) {
            throw new InvalidRescueInput("body");
        }
        if (body.get("reportId").isNull() || !body.get("reportId").isTextual()) {
            throw new InvalidRescueInput("reportId");
        }
        if (body.get("teamId").isNull() || !body.get("teamId").isTextual()) {
            throw new InvalidRescueInput("teamId");
        }

        UUID reportId = RescueRequestParser.uuid(body.get("reportId").textValue(), "reportId");
        UUID teamId = RescueRequestParser.uuid(body.get("teamId").textValue(), "teamId");

        Mission mission = rescueService.createMission(actor, reportId, teamId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .cacheControl(CacheControl.noStore())
                .body(MissionResponse.from(mission));
    }

    @GetMapping("/rescue-missions")
    @Operation(operationId = "E14", summary = "E14 GET /api/rescue-missions")
    public ResponseEntity<MissionPageResponse> listMissions(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt principal,
            HttpServletRequest request) {
        RescueActor actor = actor(principal);
        RescueRequestParser.noBody(request);
        RescueRequestParser.validateMissionQuery(request);

        int page = RescueRequestParser.parseInteger(request.getParameter("page"), 0, "page");
        int size = RescueRequestParser.parseInteger(request.getParameter("size"), 20, "size");
        String sort = request.getParameter("sort");

        Optional<UUID> reportId = RescueRequestParser.optionalUuid(request.getParameter("reportId"), "reportId");
        Optional<UUID> teamId = RescueRequestParser.optionalUuid(request.getParameter("teamId"), "teamId");
        Optional<MissionStatus> status = RescueRequestParser.optionalMissionStatus(request.getParameter("status"));

        var result = rescueService.listMissions(actor, reportId, teamId, status, page, size, sort);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(MissionPageResponse.from(result));
    }

    @PatchMapping(value = "/rescue-missions/{id}/status", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(operationId = "E15", summary = "E15 PATCH /api/rescue-missions/{id}/status")
    public ResponseEntity<MissionResponse> updateMissionStatus(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt principal,
            @PathVariable String id,
            @RequestBody JsonNode body,
            HttpServletRequest request) {
        RescueActor actor = actor(principal);
        RescueRequestParser.noQuery(request);

        UUID missionId = RescueRequestParser.uuid(id, "id");
        if (body == null || !body.isObject() || body.size() != 1 || !body.has("status")) {
            throw new InvalidRescueInput("body");
        }
        if (body.get("status").isNull() || !body.get("status").isTextual()) {
            throw new InvalidRescueInput("status");
        }
        String statusText = body.get("status").textValue();
        MissionStatus targetStatus = RescueRequestParser.missionStatus(statusText);

        Mission updated = rescueService.updateMissionStatus(actor, missionId, targetStatus);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(MissionResponse.from(updated));
    }

    private static RescueActor actor(Jwt principal) {
        if (principal == null) throw new com.gdrn.rescue.application.RescueAccessDenied();
        String role = principal.getClaimAsString("role");
        if (!"CITIZEN".equals(role) && !"AUTHORITY".equals(role)) {
            throw new com.gdrn.rescue.application.RescueAccessDenied();
        }
        return new RescueActor(UUID.fromString(principal.getSubject()), RescueActor.Role.valueOf(role));
    }
}

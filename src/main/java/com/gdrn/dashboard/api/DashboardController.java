package com.gdrn.dashboard.api;

import com.gdrn.dashboard.application.DashboardService;
import com.gdrn.dashboard.application.DashboardSummary;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.util.Set;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DashboardController {
    private final DashboardService service;

    public DashboardController(DashboardService service) { this.service = service; }

    @GetMapping(value = "/api/dashboard", produces = "application/json")
    @Operation(operationId = "E16", summary = "Dashboard statistics (AUTHORITY)",
            description = "Optional paired from/to dates, inclusive in Asia/Ho_Chi_Minh. "
                    + "Reports by created_at, missions by assigned_at; teams always current.",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<DashboardSummary> summary(@Parameter(hidden = true) @AuthenticationPrincipal Jwt principal,
            @Parameter(description = "Inclusive date YYYY-MM-DD; requires to")
            @org.springframework.web.bind.annotation.RequestParam(required = false) String from,
            @Parameter(description = "Inclusive date YYYY-MM-DD; requires from")
            @org.springframework.web.bind.annotation.RequestParam(required = false) String to,
            HttpServletRequest request) {
        if (request.getContentLengthLong() > 0 || request.getHeader("Transfer-Encoding") != null) {
            throw new IllegalArgumentException("body");
        }
        request.getParameterMap().forEach((key, values) -> {
            if (!Set.of("from", "to").contains(key) || values.length != 1) {
                throw new IllegalArgumentException("query");
            }
        });
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.summarize(
                principal.getClaimAsString("role"), date(from), date(to)));
    }

    private static LocalDate date(String value) {
        if (value == null) return null;
        if (!value.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}")) throw new IllegalArgumentException("date");
        return LocalDate.parse(value);
    }
}

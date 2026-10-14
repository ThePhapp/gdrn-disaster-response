package com.gdrn.rescue.api;

import com.gdrn.rescue.application.DisasterNotActive;
import com.gdrn.rescue.application.ReportAlreadyAssigned;
import com.gdrn.rescue.application.ReportNotVerified;
import com.gdrn.rescue.application.RescueAccessDenied;
import com.gdrn.rescue.application.RescueNotFoundException;
import com.gdrn.rescue.application.TeamBusy;
import com.gdrn.rescue.domain.InvalidMissionTransition;
import com.gdrn.rescue.domain.InvalidRescueInput;
import com.gdrn.shared.api.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.List;

@RestControllerAdvice(assignableTypes = RescueController.class)
public class RescueErrors {

    @ExceptionHandler({InvalidRescueInput.class, HttpMessageNotReadableException.class, IllegalArgumentException.class})
    ResponseEntity<ApiError> invalid(Exception error, HttpServletRequest request) {
        String field = error instanceof InvalidRescueInput invalid ? invalid.field() : "body";
        return ResponseEntity.badRequest().cacheControl(CacheControl.noStore()).body(new ApiError(
                Instant.now(), 400, "VALIDATION_ERROR", "Invalid request.", request.getRequestURI(),
                List.of(new ApiError.FieldError(field, "Invalid " + field + "."))));
    }

    @ExceptionHandler(RescueNotFoundException.class)
    ResponseEntity<ApiError> notFound(HttpServletRequest request) {
        return error(404, "NOT_FOUND", "Resource not found.", request);
    }

    @ExceptionHandler(RescueAccessDenied.class)
    ResponseEntity<ApiError> forbidden(HttpServletRequest request) {
        return error(403, "FORBIDDEN", "Access denied.", request);
    }

    @ExceptionHandler(ReportNotVerified.class)
    ResponseEntity<ApiError> notVerified(HttpServletRequest request) {
        return error(409, "REPORT_NOT_VERIFIED", "Report is not verified.", request);
    }

    @ExceptionHandler(DisasterNotActive.class)
    ResponseEntity<ApiError> disasterInactive(HttpServletRequest request) {
        return error(409, "DISASTER_NOT_ACTIVE", "Associated disaster is not active.", request);
    }

    @ExceptionHandler(ReportAlreadyAssigned.class)
    ResponseEntity<ApiError> alreadyAssigned(HttpServletRequest request) {
        return error(409, "REPORT_ALREADY_ASSIGNED", "Report already has an assigned mission.", request);
    }

    @ExceptionHandler(TeamBusy.class)
    ResponseEntity<ApiError> teamBusy(HttpServletRequest request) {
        return error(409, "TEAM_BUSY", "Team already has an active mission.", request);
    }

    @ExceptionHandler(InvalidMissionTransition.class)
    ResponseEntity<ApiError> transition(HttpServletRequest request) {
        return error(409, "INVALID_TRANSITION", "Mission state transition is not allowed.", request);
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    ResponseEntity<ApiError> media(HttpServletRequest request) {
        return error(415, "UNSUPPORTED_MEDIA_TYPE", "Use application/json.", request);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> unexpected(HttpServletRequest request) {
        return error(500, "INTERNAL_ERROR", "Request could not be completed.", request);
    }

    private ResponseEntity<ApiError> error(int status, String code, String message, HttpServletRequest request) {
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore())
                .body(ApiError.of(status, code, message, request.getRequestURI()));
    }
}

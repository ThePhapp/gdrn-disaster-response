package com.gdrn.dashboard.api;

import com.gdrn.shared.api.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import java.time.DateTimeException;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = DashboardController.class)
public class DashboardErrors {
    @ExceptionHandler({IllegalArgumentException.class, DateTimeException.class})
    ResponseEntity<ApiError> invalid(HttpServletRequest request) {
        return error(400, "VALIDATION_ERROR", "Supply both from/to as valid ordered YYYY-MM-DD dates, or neither.", request);
    }

    @ExceptionHandler(SecurityException.class)
    ResponseEntity<ApiError> forbidden(HttpServletRequest request) {
        return error(403, "FORBIDDEN", "Access denied.", request);
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

package com.gdrn.reporting.api;

import com.gdrn.reporting.application.ReportAccessDenied;
import com.gdrn.reporting.application.ReportNotFound;
import com.gdrn.reporting.application.AttachmentLimitReached;
import com.gdrn.reporting.application.AttachmentNotEditable;
import com.gdrn.reporting.application.AttachmentStorageException;
import com.gdrn.reporting.application.AttachmentValidationException;
import com.gdrn.reporting.application.DisasterNotActive;
import com.gdrn.reporting.domain.InvalidReportTransition;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import com.gdrn.reporting.domain.InvalidReport;
import com.gdrn.shared.api.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

@RestControllerAdvice(assignableTypes = ReportController.class)
public class ReportErrors {
    @ExceptionHandler({InvalidReport.class, HttpMessageNotReadableException.class})
    ResponseEntity<ApiError> invalid(Exception error, HttpServletRequest request) {
        String field = error instanceof InvalidReport invalid ? invalid.field() : "body";
        return ResponseEntity.badRequest().cacheControl(CacheControl.noStore()).body(new ApiError(
                Instant.now(), 400, "VALIDATION_ERROR", "Invalid request.", request.getRequestURI(),
                List.of(new ApiError.FieldError(field, "Invalid " + field + "."))));
    }

    @ExceptionHandler(ReportNotFound.class)
    ResponseEntity<ApiError> missing(HttpServletRequest request) {
        return error(404, "NOT_FOUND", "Resource not found.", request);
    }

    @ExceptionHandler(ReportAccessDenied.class)
    ResponseEntity<ApiError> forbidden(HttpServletRequest request) {
        return error(403, "FORBIDDEN", "Access denied.", request);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> unexpected(HttpServletRequest request) {
        return error(500, "INTERNAL_ERROR", "Request could not be completed.", request);
    }

    @ExceptionHandler(InvalidReportTransition.class)
    ResponseEntity<ApiError> transition(HttpServletRequest request) {
        return error(409, "INVALID_TRANSITION", "Report transition is not allowed.", request);
    }

    @ExceptionHandler(DisasterNotActive.class)
    ResponseEntity<ApiError> inactive(HttpServletRequest request) {
        return error(409, "DISASTER_NOT_ACTIVE", "Disaster is not active.", request);
    }

    @ExceptionHandler(AttachmentValidationException.class)
    ResponseEntity<ApiError> attachmentInvalid(AttachmentValidationException error, HttpServletRequest request) {
        int status = error.code().equals("ATTACHMENT_TOO_LARGE") ? 413
                : error.code().equals("ATTACHMENT_UNSUPPORTED_FORMAT") ? 415 : 400;
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).body(new ApiError(
                Instant.now(), status, error.code(), error.getMessage(), request.getRequestURI(),
                List.of(new ApiError.FieldError(error.field(), error.getMessage()))));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<ApiError> uploadTooLarge(HttpServletRequest request) {
        return error(413, "ATTACHMENT_TOO_LARGE", "Images must be 5 MiB or smaller.", request);
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    ResponseEntity<ApiError> missingPart(HttpServletRequest request) {
        return error(400, "ATTACHMENT_FILE_REQUIRED", "An image file is required.", request);
    }

    @ExceptionHandler(AttachmentLimitReached.class)
    ResponseEntity<ApiError> attachmentLimit(HttpServletRequest request) {
        return error(409, "ATTACHMENT_LIMIT_REACHED", "A report can contain at most 5 images.", request);
    }

    @ExceptionHandler(AttachmentNotEditable.class)
    ResponseEntity<ApiError> attachmentNotEditable(HttpServletRequest request) {
        return error(409, "ATTACHMENT_REPORT_NOT_PENDING", "Images can only be changed while the report is pending.", request);
    }

    @ExceptionHandler(AttachmentStorageException.class)
    ResponseEntity<ApiError> attachmentStorage(AttachmentStorageException error, HttpServletRequest request) {
        return error(500, "ATTACHMENT_STORAGE_ERROR", "The image could not be stored or read.", request);
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    ResponseEntity<ApiError> media(HttpServletRequest request) {
        return error(415, "UNSUPPORTED_MEDIA_TYPE", "The request media type is not supported.", request);
    }

    private ResponseEntity<ApiError> error(int status, String code, String message, HttpServletRequest request) {
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore())
                .body(ApiError.of(status, code, message, request.getRequestURI()));
    }
}

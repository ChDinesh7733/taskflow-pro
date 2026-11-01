package com.taskflow.exception;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.Instant;
import java.util.*;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    /* ── Validation ── */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(
        MethodArgumentNotValidException ex, HttpServletRequest req) {

        Map<String, String> fieldErrors = new LinkedHashMap<>();
        ex.getBindingResult().getAllErrors().forEach(err -> {
            String field   = ((FieldError) err).getField();
            String message = err.getDefaultMessage();
            fieldErrors.put(field, message);
        });

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", 400);
        body.put("error", "Validation Failed");
        body.put("fieldErrors", fieldErrors);
        body.put("path", req.getRequestURI());
        body.put("timestamp", Instant.now().toString());
        String correlationId = org.slf4j.MDC.get("correlationId");
        if (correlationId != null) {
            body.put("correlationId", correlationId);
        }

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    /* ── Invalid enum / path param type ── */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(
        MethodArgumentTypeMismatchException ex, HttpServletRequest req) {

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body(
            400, "Bad Request",
            "Invalid value '%s' for parameter '%s'".formatted(ex.getValue(), ex.getName()),
            req));
    }

    /* ── Invalid status transition ── */
    @ExceptionHandler(InvalidStatusTransitionException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidTransition(
        InvalidStatusTransitionException ex, HttpServletRequest req) {

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body(
            400, "Invalid Status Transition", ex.getMessage(), req));
    }

    /* ── Email already taken ── */
    @ExceptionHandler(EmailAlreadyExistsException.class)
    public ResponseEntity<Map<String, Object>> handleEmailConflict(
        EmailAlreadyExistsException ex, HttpServletRequest req) {

        return ResponseEntity.status(HttpStatus.CONFLICT).body(body(
            409, "Conflict", ex.getMessage(), req));
    }

    /* ── Bad credentials ── */
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleBadCredentials(
        HttpServletRequest req) {

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body(
            401, "Unauthorized", "Invalid email or password", req));
    }

    /* ── Account disabled ── */
    @ExceptionHandler(DisabledException.class)
    public ResponseEntity<Map<String, Object>> handleDisabled(
        HttpServletRequest req) {

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body(
            401, "Unauthorized", "Account is disabled", req));
    }

    /* ── Invalid / expired token ── */
    @ExceptionHandler(InvalidTokenException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidToken(
        InvalidTokenException ex, HttpServletRequest req) {

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body(
            401, "Unauthorized", ex.getMessage(), req));
    }

    /* ── Business-rule validation (dueDate < startDate, etc.) ── */
    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(
        BadRequestException ex, HttpServletRequest req) {

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body(
            400, "Bad Request", ex.getMessage(), req));
    }

    /* ── ResourceNotFound ── */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(
        ResourceNotFoundException ex, HttpServletRequest req) {

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body(
            404, "Not Found", ex.getMessage(), req));
    }

    /* ── Access Denied (403) ── */
    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(
        org.springframework.security.access.AccessDeniedException ex, HttpServletRequest req) {

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body(
            403, "Forbidden", ex.getMessage() != null && !ex.getMessage().isBlank() ? ex.getMessage() : "Access denied", req));
    }

    /* ── File Size Exceeded (413) ── */
    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleMaxUploadSize(
        org.springframework.web.multipart.MaxUploadSizeExceededException ex, HttpServletRequest req) {

        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(body(
            413, "Payload Too Large", "Maximum upload size exceeded (limit: 10MB)", req));
    }

    /* ── Database Constraint Conflict (409) ── */
    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(
        org.springframework.dao.DataIntegrityViolationException ex, HttpServletRequest req) {

        log.error("Data integrity violation: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body(
            409, "Conflict", "Data integrity constraint violated", req));
    }

    /* ── Database / Persistence Failure (500) ── */
    @ExceptionHandler({org.springframework.dao.DataAccessException.class, jakarta.persistence.PersistenceException.class})
    public ResponseEntity<Map<String, Object>> handleDatabaseException(
        Exception ex, HttpServletRequest req) {

        log.error("Database error [{}]: {}", ex.getClass().getSimpleName(), ex.getMessage(), ex);
        String msg = (ex.getCause() != null && ex.getCause().getMessage() != null)
            ? ex.getCause().getMessage()
            : (ex.getMessage() != null ? ex.getMessage() : "Database operation failed");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body(
            500, "Database Error", msg, req));
    }

    /* ── Catch-all (never expose internals) ── */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(
        Exception ex, HttpServletRequest req) {

        log.error("Unhandled exception [{}]: {}", ex.getClass().getSimpleName(), ex.getMessage(), ex);
        String msg = (ex.getMessage() != null && !ex.getMessage().isBlank()) ? ex.getMessage() : "An unexpected error occurred";
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body(
            500, "Internal Server Error", msg, req));
    }

    /* ── Helper ── */
    private Map<String, Object> body(int status, String error, String message, HttpServletRequest req) {
        String correlationId = org.slf4j.MDC.get("correlationId");
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("status", status);
        map.put("error", error);
        map.put("message", message);
        map.put("path", req.getRequestURI());
        map.put("timestamp", Instant.now().toString());
        if (correlationId != null) {
            map.put("correlationId", correlationId);
        }
        return map;
    }
}


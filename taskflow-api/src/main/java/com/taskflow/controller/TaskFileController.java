package com.taskflow.controller;

import com.taskflow.service.TaskFileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
@Tag(name = "Task Files", description = "Task upload, backend storage, export, and import")
@SecurityRequirement(name = "bearerAuth")
public class TaskFileController {

    private final TaskFileService taskFileService;

    @PostMapping(value = "/upload/csv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload and store CSV file in backend store (and import tasks)")
    public ResponseEntity<Map<String, Object>> uploadCsv(
        @AuthenticationPrincipal UserDetails user,
        @RequestParam("file") MultipartFile file
    ) {
        Map<String, Object> result = taskFileService.uploadCsv(user.getUsername(), file);
        return ResponseEntity.ok(result);
    }

    @PostMapping(value = "/upload/pdf", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload and store PDF file in backend store")
    public ResponseEntity<Map<String, Object>> uploadPdf(
        @AuthenticationPrincipal UserDetails user,
        @RequestParam("file") MultipartFile file
    ) {
        Map<String, Object> result = taskFileService.uploadPdf(user.getUsername(), file);
        return ResponseEntity.ok(result);
    }

    @PostMapping(value = "/import/csv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Import tasks from uploaded CSV file")
    public ResponseEntity<Map<String, Object>> importCsv(
        @AuthenticationPrincipal UserDetails user,
        @RequestParam("file") MultipartFile file
    ) {
        Map<String, Object> result = taskFileService.uploadCsv(user.getUsername(), file);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/files")
    @Operation(summary = "List all uploaded and stored files in backend for current user")
    public ResponseEntity<List<Map<String, Object>>> getFiles(@AuthenticationPrincipal UserDetails user) {
        List<Map<String, Object>> files = taskFileService.getUploadedFiles(user.getUsername());
        return ResponseEntity.ok(files);
    }

    @GetMapping("/files/{id}/download")
    @Operation(summary = "Download a stored file from backend")
    public ResponseEntity<byte[]> downloadFile(
        @AuthenticationPrincipal UserDetails user,
        @PathVariable java.util.UUID id
    ) {
        return taskFileService.downloadFile(user.getUsername(), id);
    }

    @DeleteMapping("/files/{id}")
    @Operation(summary = "Delete an uploaded file from backend storage")
    public ResponseEntity<Map<String, Object>> deleteFile(
        @AuthenticationPrincipal UserDetails user,
        @PathVariable java.util.UUID id
    ) {
        taskFileService.deleteFile(user.getUsername(), id);
        return ResponseEntity.ok(Map.of("success", true, "message", "File deleted successfully"));
    }

    @GetMapping("/export/csv")
    @Operation(summary = "Export all user tasks as CSV file")
    public ResponseEntity<byte[]> exportCsv(@AuthenticationPrincipal UserDetails user) {
        byte[] csvData = taskFileService.exportCsv(user.getUsername());

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"tasks.csv\"")
            .header(HttpHeaders.CONTENT_TYPE, "text/csv; charset=UTF-8")
            .body(csvData);
    }

    @GetMapping("/export/pdf")
    @Operation(summary = "Export all user tasks as formatted PDF report")
    public ResponseEntity<byte[]> exportPdf(@AuthenticationPrincipal UserDetails user) {
        byte[] pdfData = taskFileService.exportPdf(user.getUsername());

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"tasks.pdf\"")
            .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
            .body(pdfData);
    }
}

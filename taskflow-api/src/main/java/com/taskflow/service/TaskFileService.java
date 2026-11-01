package com.taskflow.service;

import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;
import java.util.List;
import java.util.UUID;

public interface TaskFileService {
    byte[] exportCsv(String userEmail);
    byte[] exportPdf(String userEmail);
    Map<String, Object> uploadCsv(String userEmail, MultipartFile file);
    Map<String, Object> uploadPdf(String userEmail, MultipartFile file);
    Map<String, Object> importCsv(String userEmail, MultipartFile file);
    List<Map<String, Object>> getUploadedFiles(String userEmail);
    ResponseEntity<byte[]> downloadFile(String userEmail, UUID fileId);
    void deleteFile(String userEmail, UUID fileId);
}

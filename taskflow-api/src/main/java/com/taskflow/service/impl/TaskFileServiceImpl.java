package com.taskflow.service.impl;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.taskflow.entity.ActivityLog;
import com.taskflow.entity.Task;
import com.taskflow.entity.UploadedFile;
import com.taskflow.entity.User;
import com.taskflow.enums.TaskPriority;
import com.taskflow.enums.TaskStatus;
import com.taskflow.exception.BadRequestException;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.ActivityLogRepository;
import com.taskflow.repository.TaskRepository;
import com.taskflow.repository.UploadedFileRepository;
import com.taskflow.repository.UserRepository;
import com.taskflow.service.TaskEventPublisher;
import com.taskflow.service.TaskFileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.awt.Color;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class TaskFileServiceImpl implements TaskFileService {

    private final TaskRepository taskRepo;
    private final UserRepository userRepo;
    private final ActivityLogRepository logRepo;
    private final UploadedFileRepository uploadedFileRepo;
    private final TaskEventPublisher eventPublisher;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    @Value("${app.storage.upload-dir:./uploads}")
    private String uploadBaseDir;

    /* ── CSV EXPORT ──────────────────────────────────────────────────────── */

    @Override
    @Transactional(readOnly = true)
    public byte[] exportCsv(String userEmail) {
        User user = findUser(userEmail);
        java.util.List<Task> tasks = taskRepo.findByOwnerId(user.getId());

        StringBuilder sb = new StringBuilder();
        // UTF-8 BOM for Microsoft Excel compatibility
        sb.append('\uFEFF');
        // Header
        sb.append("ID,Title,Description,Status,Priority,Start Date,Due Date,Assignee,Tags,Created At\n");

        for (Task t : tasks) {
            sb.append(escapeCsv(t.getId() != null ? t.getId().toString() : "")).append(",");
            sb.append(escapeCsv(t.getTitle())).append(",");
            sb.append(escapeCsv(t.getDescription())).append(",");
            sb.append(escapeCsv(t.getStatus() != null ? t.getStatus().name() : "")).append(",");
            sb.append(escapeCsv(t.getPriority() != null ? t.getPriority().name() : "")).append(",");
            sb.append(escapeCsv(t.getStartDate() != null ? t.getStartDate().format(DATE_FMT) : "")).append(",");
            sb.append(escapeCsv(t.getDueDate() != null ? t.getDueDate().format(DATE_FMT) : "")).append(",");
            sb.append(escapeCsv(t.getAssigneeName())).append(",");
            sb.append(escapeCsv(t.getTags())).append(",");
            sb.append(escapeCsv(t.getCreatedAt() != null ? t.getCreatedAt().format(TIME_FMT) : "")).append("\n");
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    /* ── PDF EXPORT ──────────────────────────────────────────────────────── */

    @Override
    @Transactional(readOnly = true)
    public byte[] exportPdf(String userEmail) {
        User user = findUser(userEmail);
        java.util.List<Task> tasks = taskRepo.findByOwnerId(user.getId());

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4.rotate(), 24, 24, 28, 28);
            PdfWriter.getInstance(doc, out);
            doc.open();

            // Brand Colors
            Color indigoPrimary = new Color(79, 70, 229);   // #4F46E5
            Color textDark      = new Color(15, 23, 42);    // #0F172A
            Color textMuted     = new Color(100, 116, 139); // #64748B
            Color rowAlt        = new Color(248, 250, 252); // #F8FAFC
            Color borderColor   = new Color(226, 232, 240); // #E2E8F0

            // Header Section
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20, indigoPrimary);
            Paragraph title = new Paragraph("TaskFlow Pro - Task Report", titleFont);
            title.setSpacingAfter(4);
            doc.add(title);

            Font metaFont = FontFactory.getFont(FontFactory.HELVETICA, 10, textMuted);
            String metaText = String.format("Generated for: %s   |   Total Tasks: %d   |   Date: %s",
                user.getEmail(), tasks.size(), LocalDateTime.now().format(TIME_FMT));
            Paragraph meta = new Paragraph(metaText, metaFont);
            meta.setSpacingAfter(16);
            doc.add(meta);

            // Tasks Table (7 columns)
            PdfPTable table = new PdfPTable(7);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{3.2f, 1.4f, 1.2f, 1.4f, 1.4f, 1.6f, 1.8f});

            // Table Headers
            String[] headers = {"Title", "Status", "Priority", "Start Date", "Due Date", "Assignee", "Tags"};
            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE);

            for (String h : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(h, headerFont));
                cell.setBackgroundColor(indigoPrimary);
                cell.setPadding(7);
                cell.setBorderColor(indigoPrimary);
                cell.setHorizontalAlignment(Element.ALIGN_LEFT);
                table.addCell(cell);
            }

            // Table Content
            Font cellFont = FontFactory.getFont(FontFactory.HELVETICA, 9, textDark);
            Font badgeFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Color.WHITE);

            int rowIndex = 0;
            for (Task t : tasks) {
                Color bg = (rowIndex % 2 == 1) ? rowAlt : Color.WHITE;

                // Title
                PdfPCell titleCell = new PdfPCell(new Phrase(t.getTitle() != null ? t.getTitle() : "—", cellFont));
                titleCell.setBackgroundColor(bg);
                titleCell.setPadding(6);
                titleCell.setBorderColor(borderColor);
                table.addCell(titleCell);

                // Status
                String statusStr = t.getStatus() != null ? t.getStatus().name() : "TODO";
                Color statusBg = getStatusColor(t.getStatus());
                PdfPCell statusCell = new PdfPCell(new Phrase(statusStr, badgeFont));
                statusCell.setBackgroundColor(statusBg);
                statusCell.setPadding(6);
                statusCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                statusCell.setBorderColor(borderColor);
                table.addCell(statusCell);

                // Priority
                String priorityStr = t.getPriority() != null ? t.getPriority().name() : "MEDIUM";
                Color prioBg = getPriorityColor(t.getPriority());
                PdfPCell prioCell = new PdfPCell(new Phrase(priorityStr, badgeFont));
                prioCell.setBackgroundColor(prioBg);
                prioCell.setPadding(6);
                prioCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                prioCell.setBorderColor(borderColor);
                table.addCell(prioCell);

                // Start Date
                String startStr = t.getStartDate() != null ? t.getStartDate().format(DATE_FMT) : "—";
                PdfPCell startCell = new PdfPCell(new Phrase(startStr, cellFont));
                startCell.setBackgroundColor(bg);
                startCell.setPadding(6);
                startCell.setBorderColor(borderColor);
                table.addCell(startCell);

                // Due Date
                String dueStr = t.getDueDate() != null ? t.getDueDate().format(DATE_FMT) : "—";
                PdfPCell dueCell = new PdfPCell(new Phrase(dueStr, cellFont));
                dueCell.setBackgroundColor(bg);
                dueCell.setPadding(6);
                dueCell.setBorderColor(borderColor);
                table.addCell(dueCell);

                // Assignee
                String assigneeStr = t.getAssigneeName() != null && !t.getAssigneeName().isBlank() ? t.getAssigneeName() : "—";
                PdfPCell assigneeCell = new PdfPCell(new Phrase(assigneeStr, cellFont));
                assigneeCell.setBackgroundColor(bg);
                assigneeCell.setPadding(6);
                assigneeCell.setBorderColor(borderColor);
                table.addCell(assigneeCell);

                // Tags
                String tagsStr = t.getTags() != null && !t.getTags().isBlank() ? t.getTags() : "—";
                PdfPCell tagsCell = new PdfPCell(new Phrase(tagsStr, cellFont));
                tagsCell.setBackgroundColor(bg);
                tagsCell.setPadding(6);
                tagsCell.setBorderColor(borderColor);
                table.addCell(tagsCell);

                rowIndex++;
            }

            doc.add(table);
            doc.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate PDF for user {}", userEmail, e);
            throw new RuntimeException("Failed to export PDF: " + e.getMessage(), e);
        }
    }

    /* ── CSV UPLOAD & STORE ──────────────────────────────────────────────── */

    @Override
    @Transactional
    public Map<String, Object> uploadCsv(String userEmail, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Uploaded CSV file is empty");
        }

        User user = findUser(userEmail);
        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "tasks.csv";
        String storedFilename = UUID.randomUUID() + "_" + originalFilename;

        // 1. Store file physically in backend directory
        Path storageDir = Paths.get(uploadBaseDir, "csv");
        Path targetPath = storageDir.resolve(storedFilename);

        try {
            Files.createDirectories(storageDir);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            log.info("Stored CSV file at {}", targetPath.toAbsolutePath());
        } catch (IOException e) {
            log.error("Failed to store CSV file on disk", e);
            throw new RuntimeException("Failed to store file on backend: " + e.getMessage(), e);
        }

        // 2. Record uploaded file in database
        UploadedFile record = UploadedFile.builder()
            .originalFilename(originalFilename)
            .storedFilename(storedFilename)
            .fileType("CSV")
            .contentType(file.getContentType() != null ? file.getContentType() : "text/csv")
            .fileSize(file.getSize())
            .storagePath(targetPath.toString())
            .user(user)
            .build();
        uploadedFileRepo.save(record);

        // 3. Parse tasks from the stored CSV file and create them in MySQL
        java.util.List<Task> toSave = new ArrayList<>();
        int parsedRows = 0;

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(Files.newInputStream(targetPath), StandardCharsets.UTF_8))) {
            String line;
            boolean isFirstLine = true;
            Map<String, Integer> colIndex = new HashMap<>();

            while ((line = reader.readLine()) != null) {
                if (isFirstLine && line.startsWith("\uFEFF")) {
                    line = line.substring(1);
                }
                if (line.trim().isEmpty()) continue;

                java.util.List<String> columns = parseCsvLine(line);

                if (isFirstLine) {
                    isFirstLine = false;
                    for (int i = 0; i < columns.size(); i++) {
                        String h = columns.get(i).trim().toLowerCase().replaceAll("[_\\s]+", "");
                        colIndex.put(h, i);
                    }
                    if (colIndex.containsKey("title")) {
                        continue;
                    } else {
                        colIndex.clear();
                        colIndex.put("title", 0);
                        colIndex.put("description", 1);
                        colIndex.put("status", 2);
                        colIndex.put("priority", 3);
                        colIndex.put("startdate", 4);
                        colIndex.put("duedate", 5);
                        colIndex.put("assignee", 6);
                        colIndex.put("tags", 7);
                    }
                }

                parsedRows++;
                try {
                    String title = getCol(columns, colIndex, "title");
                    if (title == null || title.isBlank()) continue;

                    String desc = getCol(columns, colIndex, "description");
                    String statusRaw = getCol(columns, colIndex, "status");
                    String prioRaw = getCol(columns, colIndex, "priority");
                    String startRaw = getCol(columns, colIndex, "startdate");
                    String dueRaw = getCol(columns, colIndex, "duedate");
                    String assignee = getCol(columns, colIndex, "assignee");
                    if (assignee == null) assignee = getCol(columns, colIndex, "assigneename");
                    String tags = getCol(columns, colIndex, "tags");

                    Task task = Task.builder()
                        .title(title.trim())
                        .description(desc != null ? desc.trim() : null)
                        .status(parseStatus(statusRaw))
                        .priority(parsePriority(prioRaw))
                        .startDate(parseDate(startRaw))
                        .dueDate(parseDate(dueRaw))
                        .assigneeName(assignee != null ? assignee.trim() : null)
                        .tags(tags != null ? tags.trim() : null)
                        .owner(user)
                        .build();

                    toSave.add(task);
                } catch (Exception ex) {
                    log.warn("Error parsing row in CSV upload: {}", ex.getMessage());
                }
            }
        } catch (IOException e) {
            log.error("Failed to parse CSV file for user {}", userEmail, e);
        }

        java.util.List<Task> saved = java.util.Collections.emptyList();
        if (!toSave.isEmpty()) {
            saved = taskRepo.saveAll(toSave);
            for (Task t : saved) {
                ActivityLog entry = ActivityLog.builder()
                    .task(t)
                    .actor(user)
                    .action("CREATED")
                    .newValue("Imported via CSV file: " + originalFilename)
                    .build();
                logRepo.save(entry);
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("fileId", record.getId().toString());
        result.put("filename", originalFilename);
        result.put("storedFilename", storedFilename);
        result.put("fileSize", file.getSize());
        result.put("importedCount", saved.size());
        result.put("totalRowsParsed", parsedRows);
        result.put("message", String.format("CSV File '%s' uploaded and stored in backend successfully! (%d tasks created)", originalFilename, saved.size()));
        return result;
    }

    /* ── PDF UPLOAD & STORE ──────────────────────────────────────────────── */

    @Override
    @Transactional
    public Map<String, Object> uploadPdf(String userEmail, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Uploaded PDF file is empty");
        }

        User user = findUser(userEmail);
        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document.pdf";
        String storedFilename = UUID.randomUUID() + "_" + originalFilename;

        // 1. Store file physically in backend directory
        Path storageDir = Paths.get(uploadBaseDir, "pdf");
        Path targetPath = storageDir.resolve(storedFilename);

        try {
            Files.createDirectories(storageDir);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            log.info("Stored PDF file at {}", targetPath.toAbsolutePath());
        } catch (IOException e) {
            log.error("Failed to store PDF file on disk", e);
            throw new RuntimeException("Failed to store PDF on backend: " + e.getMessage(), e);
        }

        // 2. Record uploaded file in database
        UploadedFile record = UploadedFile.builder()
            .originalFilename(originalFilename)
            .storedFilename(storedFilename)
            .fileType("PDF")
            .contentType(file.getContentType() != null ? file.getContentType() : "application/pdf")
            .fileSize(file.getSize())
            .storagePath(targetPath.toString())
            .user(user)
            .build();
        uploadedFileRepo.save(record);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("fileId", record.getId().toString());
        result.put("filename", originalFilename);
        result.put("storedFilename", storedFilename);
        result.put("fileSize", file.getSize());
        result.put("storagePath", targetPath.toString());
        result.put("message", String.format("PDF File '%s' uploaded and stored in backend store successfully!", originalFilename));
        return result;
    }

    /* ── IMPORT CSV (Alias to uploadCsv) ─────────────────────────────────── */

    @Override
    @Transactional
    public Map<String, Object> importCsv(String userEmail, MultipartFile file) {
        return uploadCsv(userEmail, file);
    }

    /* ── LIST UPLOADED FILES ─────────────────────────────────────────────── */

    @Override
    @Transactional(readOnly = true)
    public java.util.List<Map<String, Object>> getUploadedFiles(String userEmail) {
        User user = findUser(userEmail);
        java.util.List<UploadedFile> files = uploadedFileRepo.findByUserIdOrderByCreatedAtDesc(user.getId());

        java.util.List<Map<String, Object>> result = new ArrayList<>();
        for (UploadedFile f : files) {
            Map<String, Object> m = new HashMap<>();
            m.put("id", f.getId().toString());
            m.put("originalFilename", f.getOriginalFilename());
            m.put("storedFilename", f.getStoredFilename());
            m.put("fileType", f.getFileType());
            m.put("fileSize", f.getFileSize());
            m.put("createdAt", f.getCreatedAt() != null ? f.getCreatedAt().format(TIME_FMT) : null);
            result.add(m);
        }
        return result;
    }

    /* ── DOWNLOAD UPLOADED FILE ──────────────────────────────────────────── */

    @Override
    @Transactional(readOnly = true)
    public org.springframework.http.ResponseEntity<byte[]> downloadFile(String userEmail, UUID fileId) {
        User user = findUser(userEmail);
        UploadedFile file = uploadedFileRepo.findById(fileId)
            .filter(f -> f.getUser().getId().equals(user.getId()))
            .orElseThrow(() -> new ResourceNotFoundException("File not found: " + fileId));

        Path filePath = Paths.get(file.getStoragePath());
        if (!Files.exists(filePath)) {
            throw new ResourceNotFoundException("File not found on backend storage");
        }

        try {
            byte[] data = Files.readAllBytes(filePath);
            String ct = file.getContentType() != null ? file.getContentType() : org.springframework.http.MediaType.APPLICATION_OCTET_STREAM_VALUE;
            return org.springframework.http.ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getOriginalFilename() + "\"")
                .header(org.springframework.http.HttpHeaders.CONTENT_TYPE, ct)
                .body(data);
        } catch (IOException e) {
            log.error("Failed to read file from storage", e);
            throw new RuntimeException("Failed to read stored file: " + e.getMessage(), e);
        }
    }

    /* ── DELETE UPLOADED FILE ────────────────────────────────────────────── */

    @Override
    @Transactional
    public void deleteFile(String userEmail, UUID fileId) {
        User user = findUser(userEmail);
        UploadedFile file = uploadedFileRepo.findById(fileId)
            .filter(f -> f.getUser().getId().equals(user.getId()))
            .orElseThrow(() -> new ResourceNotFoundException("File not found: " + fileId));

        try {
            Path filePath = Paths.get(file.getStoragePath());
            Files.deleteIfExists(filePath);
            log.info("Deleted file from disk: {}", filePath.toAbsolutePath());
        } catch (IOException e) {
            log.warn("Failed to delete file from disk: {}", e.getMessage());
        }

        uploadedFileRepo.delete(file);
    }

    /* ── HELPER METHODS ──────────────────────────────────────────────────── */

    private User findUser(String email) {
        return userRepo.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }

    private String escapeCsv(String val) {
        if (val == null) return "";
        if (val.contains(",") || val.contains("\"") || val.contains("\n") || val.contains("\r")) {
            return "\"" + val.replace("\"", "\"\"") + "\"";
        }
        return val;
    }

    private java.util.List<String> parseCsvLine(String line) {
        java.util.List<String> tokens = new ArrayList<>();
        StringBuilder cur = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '\"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '\"') {
                    cur.append('\"');
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c == ',' && !inQuotes) {
                tokens.add(cur.toString().trim());
                cur.setLength(0);
            } else {
                cur.append(c);
            }
        }
        tokens.add(cur.toString().trim());
        return tokens;
    }

    private String getCol(java.util.List<String> cols, Map<String, Integer> colIndex, String key) {
        Integer idx = colIndex.get(key);
        if (idx != null && idx < cols.size()) {
            String v = cols.get(idx);
            return (v != null && !v.isBlank()) ? v : null;
        }
        return null;
    }

    private TaskStatus parseStatus(String raw) {
        if (raw == null || raw.isBlank()) return TaskStatus.TODO;
        String normalized = raw.trim().toUpperCase().replace(" ", "_").replace("-", "_");
        try {
            return TaskStatus.valueOf(normalized);
        } catch (IllegalArgumentException e) {
            return TaskStatus.TODO;
        }
    }

    private TaskPriority parsePriority(String raw) {
        if (raw == null || raw.isBlank()) return TaskPriority.MEDIUM;
        String normalized = raw.trim().toUpperCase();
        try {
            return TaskPriority.valueOf(normalized);
        } catch (IllegalArgumentException e) {
            return TaskPriority.MEDIUM;
        }
    }

    private LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return LocalDate.parse(raw.trim(), DATE_FMT);
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private Color getStatusColor(TaskStatus s) {
        if (s == null) return new Color(100, 116, 139);
        return switch (s) {
            case TODO -> new Color(100, 116, 139);
            case IN_PROGRESS -> new Color(37, 99, 235);
            case IN_REVIEW -> new Color(147, 51, 234);
            case DONE -> new Color(16, 185, 129);
            case CANCELLED -> new Color(239, 68, 68);
        };
    }

    private Color getPriorityColor(TaskPriority p) {
        if (p == null) return new Color(100, 116, 139);
        return switch (p) {
            case LOW -> new Color(100, 116, 139);
            case MEDIUM -> new Color(234, 179, 8);
            case HIGH -> new Color(249, 115, 22);
            case URGENT -> new Color(225, 29, 72);
        };
    }
}

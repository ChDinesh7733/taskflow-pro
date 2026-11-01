package com.taskflow.dto.collaboration;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record PublicProjectResponse(
    UUID id,
    String name,
    String color,
    String ownerName,
    LocalDateTime sharedAt,
    List<PublicTaskResponse> tasks
) {
    public record PublicTaskResponse(
        UUID id,
        String title,
        String description,
        String status,
        String priority,
        LocalDate dueDate,
        List<String> subtasks
    ) {}
}

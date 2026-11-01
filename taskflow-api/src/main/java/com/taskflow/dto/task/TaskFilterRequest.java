package com.taskflow.dto.task;

import com.taskflow.enums.TaskPriority;
import com.taskflow.enums.TaskStatus;
import org.springframework.data.domain.Sort;
import java.util.UUID;

/** Query params for GET /api/tasks */
public record TaskFilterRequest(
    TaskStatus   status,
    TaskPriority priority,
    String       search,      // title / description LIKE
    UUID         categoryId,  // optional category filter
    String       sortBy,      // createdAt | dueDate | priority | title (default: createdAt)
    Sort.Direction direction, // ASC | DESC (default: DESC)
    int          page,        // 0-based (default: 0)
    int          size         // (default: 20, max: 100)
) {
    public TaskFilterRequest {
        if (sortBy  == null || sortBy.isBlank()) sortBy    = "createdAt";
        if (direction == null)                   direction = Sort.Direction.DESC;
        if (page < 0)                            page      = 0;
        if (size <= 0 || size > 100)             size      = 20;
    }

    public TaskFilterRequest(TaskStatus status, TaskPriority priority, String search, String sortBy, Sort.Direction direction, int page, int size) {
        this(status, priority, search, null, sortBy, direction, page, size);
    }
}

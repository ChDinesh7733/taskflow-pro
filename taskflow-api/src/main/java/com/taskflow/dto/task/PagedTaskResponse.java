package com.taskflow.dto.task;

import java.util.List;

public record PagedTaskResponse(
    List<TaskResponse> content,
    int  page,
    int  size,
    long totalElements,
    int  totalPages,
    boolean first,
    boolean last
) {}

package com.taskflow.dto.category;

import java.util.UUID;

public record CategoryResponse(
    UUID   id,
    String name,
    String color,
    String shareToken,
    Boolean isPublic
) {
    public CategoryResponse(UUID id, String name, String color) {
        this(id, name, color, null, false);
    }
}

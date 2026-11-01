package com.taskflow.dto.comment;

import com.taskflow.entity.TaskComment;
import java.time.LocalDateTime;
import java.util.UUID;

public record CommentResponse(
    UUID id,
    UUID taskId,
    UUID authorId,
    String authorName,
    String content,
    LocalDateTime createdAt
) {
    public static CommentResponse from(TaskComment c) {
        return new CommentResponse(
            c.getId(),
            c.getTask().getId(),
            c.getAuthor().getId(),
            c.getAuthor().getDisplayName(),
            c.getContent(),
            c.getCreatedAt()
        );
    }
}

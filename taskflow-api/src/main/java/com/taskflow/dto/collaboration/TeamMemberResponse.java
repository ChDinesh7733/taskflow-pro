package com.taskflow.dto.collaboration;

import com.taskflow.entity.TeamMember;
import java.time.LocalDateTime;
import java.util.UUID;

public record TeamMemberResponse(
    UUID id,
    String email,
    String name,
    String role,
    String status,
    LocalDateTime createdAt,
    String avatarUrl
) {
    public static TeamMemberResponse from(TeamMember tm) {
        String avatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=" + tm.getEmail();
        return new TeamMemberResponse(
            tm.getId(),
            tm.getEmail(),
            tm.getName(),
            tm.getRole(),
            tm.getStatus(),
            tm.getCreatedAt(),
            avatar
        );
    }
}

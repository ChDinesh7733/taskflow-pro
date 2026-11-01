package com.taskflow.dto.collaboration;

public record ShareLinkResponse(
    String shareToken,
    String shareUrl,
    boolean isPublic
) {}

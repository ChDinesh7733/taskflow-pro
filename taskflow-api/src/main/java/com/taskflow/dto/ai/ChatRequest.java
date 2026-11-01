package com.taskflow.dto.ai;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Request body for the conversational AI chat endpoint.
 *
 * @param message  The latest user message (required).
 * @param history  Prior turns in [{role, content}] format (may be null/empty).
 * @param apiKey   Optional client-provided Gemini API key.
 */
public record ChatRequest(
    @NotBlank(message = "Message cannot be blank")
    @Size(max = 4000, message = "Message too long (max 4000 chars)")
    String message,

    List<ChatTurn> history,

    String apiKey
) {
    /** A single prior conversation turn. */
    public record ChatTurn(String role, String content) {}
}

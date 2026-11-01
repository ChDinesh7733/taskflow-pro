package com.taskflow.controller;

import com.taskflow.dto.integrations.InboundEmailRequest;
import com.taskflow.dto.task.TaskResponse;
import com.taskflow.entity.Task;
import com.taskflow.service.IntegrationsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public/inbound-email")
@RequiredArgsConstructor
@Tag(name = "Inbound Email", description = "Public webhook for email forwarder to create tasks")
public class PublicInboundEmailController {

    private final IntegrationsService integrationsService;

    @PostMapping("/{token}")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    @Operation(summary = "Process incoming forwarded email and create a task")
    public TaskResponse processEmail(
            @PathVariable String token,
            @Valid @RequestBody InboundEmailRequest req) {
        Task task = integrationsService.processInboundEmail(token, req);
        return TaskResponse.from(task);
    }
}

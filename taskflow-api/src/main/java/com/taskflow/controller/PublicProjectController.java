package com.taskflow.controller;

import com.taskflow.dto.collaboration.PublicProjectResponse;
import com.taskflow.service.CollaborationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public/projects")
@RequiredArgsConstructor
@Tag(name = "Public Projects", description = "Unauthenticated public read-only project view")
public class PublicProjectController {

    private final CollaborationService collaborationService;

    @GetMapping("/{shareToken}")
    @Operation(summary = "Get public read-only project details and tasks by share token")
    public PublicProjectResponse getPublicProject(@PathVariable String shareToken) {
        return collaborationService.getPublicProject(shareToken);
    }
}

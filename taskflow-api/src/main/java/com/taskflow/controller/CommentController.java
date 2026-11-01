package com.taskflow.controller;

import com.taskflow.dto.comment.CommentResponse;
import com.taskflow.dto.comment.CreateCommentRequest;
import com.taskflow.entity.ActivityLog;
import com.taskflow.entity.Task;
import com.taskflow.entity.TaskComment;
import com.taskflow.entity.User;
import com.taskflow.entity.TeamMember;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.ActivityLogRepository;
import com.taskflow.repository.TaskCommentRepository;
import com.taskflow.repository.TaskRepository;
import com.taskflow.repository.TeamMemberRepository;
import com.taskflow.repository.UserRepository;
import com.taskflow.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/tasks/{taskId}/comments")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Comments", description = "Task comment management")
@SecurityRequirement(name = "bearerAuth")
public class CommentController {

    private final TaskRepository taskRepo;
    private final UserRepository userRepo;
    private final TaskCommentRepository commentRepo;
    private final ActivityLogRepository logRepo;
    private final TeamMemberRepository teamMemberRepo;
    private final NotificationService notificationService;

    private static final Pattern MENTION_PATTERN = Pattern.compile("@([a-zA-Z0-9._-]+)");

    @GetMapping
    @Operation(summary = "List all comments for a task")
    public List<CommentResponse> listComments(
            @PathVariable UUID taskId,
            @AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        Task task = resolveTask(taskId, user);
        return commentRepo.findByTaskIdOrderByCreatedAtAsc(task.getId())
                .stream()
                .map(CommentResponse::from)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    @Operation(summary = "Add a comment to a task")
    public CommentResponse addComment(
            @PathVariable UUID taskId,
            @Valid @RequestBody CreateCommentRequest req,
            @AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        Task task = resolveTask(taskId, user);

        TaskComment comment = TaskComment.builder()
                .task(task)
                .author(user)
                .content(req.content().trim())
                .build();
        TaskComment saved = commentRepo.save(comment);

        // Record activity log
        ActivityLog entry = ActivityLog.builder()
                .task(task)
                .actor(user)
                .action("COMMENT_ADDED")
                .oldValue(null)
                .newValue(req.content().length() > 50 ? req.content().substring(0, 47) + "..." : req.content())
                .build();
        logRepo.save(entry);

        // Process @mentions
        processMentions(req.content(), task, user);

        return CommentResponse.from(saved);
    }

    private void processMentions(String content, Task task, User sender) {
        if (content == null || !content.contains("@")) return;

        List<TeamMember> teamMembers = teamMemberRepo.findByOwnerIdOrderByCreatedAtDesc(sender.getId());
        Matcher matcher = MENTION_PATTERN.matcher(content);

        while (matcher.find()) {
            String mention = matcher.group(1).toLowerCase();
            // Check matching team member by email prefix or name
            for (TeamMember tm : teamMembers) {
                String nameClean = tm.getName().toLowerCase().replaceAll("\\s+", "");
                String emailPrefix = tm.getEmail().split("@")[0].toLowerCase();

                if (mention.equalsIgnoreCase(nameClean) || mention.equalsIgnoreCase(emailPrefix) || tm.getEmail().toLowerCase().contains(mention)) {
                    // If team member is linked to a registered User, notify them
                    if (tm.getUser() != null) {
                        notificationService.sendNotification(
                                tm.getUser(),
                                task.getId(),
                                "MENTION",
                                sender.getDisplayName() + " mentioned you in task \"" + task.getTitle() + "\""
                        );
                    }
                    // Record mention in activity log
                    ActivityLog mentionLog = ActivityLog.builder()
                            .task(task)
                            .actor(sender)
                            .action("MENTIONED_USER")
                            .oldValue(null)
                            .newValue("@" + tm.getName())
                            .build();
                    logRepo.save(mentionLog);
                    break;
                }
            }

            // Also check registered users directly by username/email
            userRepo.findByEmail(mention).ifPresent(mentionedUser -> {
                if (!mentionedUser.getId().equals(sender.getId())) {
                    notificationService.sendNotification(
                            mentionedUser,
                            task.getId(),
                            "MENTION",
                            sender.getDisplayName() + " mentioned you in task \"" + task.getTitle() + "\""
                    );
                }
            });
        }
    }

    private User resolveUser(UserDetails principal) {
        return userRepo.findByEmail(principal.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User", principal.getUsername()));
    }

    private Task resolveTask(UUID taskId, User user) {
        return taskRepo.findById(taskId)
                .filter(t -> t.getOwner().getId().equals(user.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Task", taskId));
    }
}

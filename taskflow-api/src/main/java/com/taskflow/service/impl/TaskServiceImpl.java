package com.taskflow.service.impl;

import com.taskflow.dto.task.*;
import com.taskflow.entity.*;
import com.taskflow.enums.TaskPriority;
import com.taskflow.enums.TaskStatus;
import com.taskflow.exception.BadRequestException;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.*;
import com.taskflow.service.GamificationService;
import com.taskflow.service.TaskEventPublisher;
import com.taskflow.service.TaskService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class TaskServiceImpl implements TaskService {

    private final TaskRepository        taskRepo;
    private final UserRepository        userRepo;
    private final CategoryRepository    categoryRepo;
    private final GoalRepository        goalRepo;
    private final ActivityLogRepository logRepo;
    private final TaskEventPublisher    eventPublisher;
    private final GamificationService   gamificationService;

    /* ─────────────────────────── CREATE ─────────────────────────────── */

    @Override
    public TaskResponse create(String ownerEmail, CreateTaskRequest req) {
        User owner = findUser(ownerEmail);

        Category category = null;
        if (req.categoryId() != null) {
            category = categoryRepo.findById(req.categoryId())
                .filter(c -> c.getOwner().getId().equals(owner.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        }

        // ── Service-layer cross-field validation ──────────────────────────
        if (req.startDate() != null && req.dueDate() != null
                && req.dueDate().isBefore(req.startDate())) {
            throw new BadRequestException("Due date must not be before the start date");
        }

        com.taskflow.entity.Goal goal = null;
        if (req.goalId() != null) {
            goal = goalRepo.findById(req.goalId())
                .filter(g -> g.getUser().getId().equals(owner.getId()))
                .orElse(null);
        }

        Task task = Task.builder()
            .title(req.title().trim())
            .description(req.description())
            .status(TaskStatus.TODO)
            .priority(req.priority() != null ? req.priority() : TaskPriority.MEDIUM)
            .startDate(req.startDate())
            .dueDate(req.dueDate())
            .tags(req.tags())
            .assigneeName(req.assigneeName())
            .owner(owner)
            .category(category)
            .goal(goal)
            .timeBlockDate(req.timeBlockDate())
            .timeBlockStart(req.timeBlockStart())
            .timeBlockEnd(req.timeBlockEnd())
            .build();

        Task saved = taskRepo.save(task);
        writeLog(saved, owner, "CREATED", null, null);
        log.info("Task [{}] created by {}", saved.getId(), ownerEmail);
        TaskResponse response = TaskResponse.from(saved);
        eventPublisher.publishTaskCreated(ownerEmail, response);
        return response;
    }

    /* ─────────────────────────── GET BY ID ──────────────────────────── */

    @Override
    @Transactional(readOnly = true)
    public TaskResponse getById(String ownerEmail, UUID taskId) {
        Task task = findOwnedTask(ownerEmail, taskId);
        return TaskResponse.from(task);
    }

    /* ─────────────────────────── LIST (filtered) ─────────────────────── */

    @Override
    @Transactional(readOnly = true)
    public PagedTaskResponse list(String ownerEmail, TaskFilterRequest f) {
        User owner = findUser(ownerEmail);

        // Validate sortBy against allowed columns to prevent injection
        String sortField = resolveSortField(f.sortBy());
        Pageable pageable = PageRequest.of(f.page(), f.size(),
            Sort.by(f.direction(), sortField));

        String search = (f.search() != null && !f.search().isBlank()) ? f.search().trim() : null;

        Page<Task> page = taskRepo.findFiltered(
            owner.getId(), f.status(), f.priority(), f.categoryId(), search, pageable);

        List<TaskResponse> content = page.getContent().stream()
            .map(TaskResponse::from)
            .toList();

        return new PagedTaskResponse(
            content,
            page.getNumber(),
            page.getSize(),
            page.getTotalElements(),
            page.getTotalPages(),
            page.isFirst(),
            page.isLast()
        );
    }

    /* ─────────────────────────── STATS ──────────────────────────────── */

    @Override
    @Transactional(readOnly = true)
    public TaskStatsResponse stats(String ownerEmail) {
        User owner = findUser(ownerEmail);
        List<Object[]> rows = taskRepo.countGroupedByStatus(owner.getId());

        Map<TaskStatus, Long> map = new EnumMap<>(TaskStatus.class);
        for (Object[] row : rows) {
            map.put((TaskStatus) row[0], (Long) row[1]);
        }

        long todo       = map.getOrDefault(TaskStatus.TODO,        0L);
        long inProgress = map.getOrDefault(TaskStatus.IN_PROGRESS, 0L);
        long inReview   = map.getOrDefault(TaskStatus.IN_REVIEW,   0L);
        long done       = map.getOrDefault(TaskStatus.DONE,        0L);
        long cancelled  = map.getOrDefault(TaskStatus.CANCELLED,   0L);
        long total      = todo + inProgress + inReview + done + cancelled;

        double rate = total == 0 ? 0.0
            : Math.round((done * 10000.0 / total)) / 100.0;

        return new TaskStatsResponse(total, todo, inProgress, inReview, done, cancelled, rate);
    }

    /* ─────────────────────────── UPDATE ─────────────────────────────── */

    @Override
    public TaskResponse update(String ownerEmail, UUID taskId, UpdateTaskRequest req) {
        Task task = findOwnedTask(ownerEmail, taskId);
        User owner = task.getOwner();

        if (req.title() != null && !req.title().isBlank())
            task.setTitle(req.title().trim());
        if (req.description() != null)
            task.setDescription(req.description());
        if (req.priority() != null)
            task.setPriority(req.priority());
        if (req.startDate() != null)
            task.setStartDate(req.startDate());
        if (req.dueDate() != null)
            task.setDueDate(req.dueDate());
        if (req.tags() != null)
            task.setTags(req.tags());
        if (req.assigneeName() != null)
            task.setAssigneeName(req.assigneeName());

        // Cross-field: re-validate after applying both dates
        java.time.LocalDate effectiveStart = task.getStartDate();
        java.time.LocalDate effectiveDue   = task.getDueDate();
        if (effectiveStart != null && effectiveDue != null && effectiveDue.isBefore(effectiveStart)) {
            throw new BadRequestException("Due date must not be before the start date");
        }

        if (req.categoryId() != null) {
            Category cat = categoryRepo.findById(req.categoryId())
                .filter(c -> c.getOwner().getId().equals(owner.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
            task.setCategory(cat);
        }

        Task saved = taskRepo.save(task);
        writeLog(saved, owner, "UPDATED", null, null);
        TaskResponse response = TaskResponse.from(saved);
        eventPublisher.publishTaskUpdated(ownerEmail, response);
        return response;
    }

    /* ─────────────────────────── STATUS CHANGE ──────────────────────── */

    @Override
    public TaskResponse changeStatus(String ownerEmail, UUID taskId, TaskStatus newStatus) {
        Task task = findOwnedTask(ownerEmail, taskId);
        TaskStatus old = task.getStatus();

        // throws InvalidStatusTransitionException on illegal move
        old.validateTransitionTo(newStatus);

        task.setStatus(newStatus);
        if (newStatus == TaskStatus.DONE) {
            task.setCompletedAt(LocalDateTime.now());
            gamificationService.awardTaskCompletionXp(task.getOwner(), task.getPriority());
        }
        if (old == TaskStatus.DONE && newStatus != TaskStatus.DONE) task.setCompletedAt(null);

        Task saved = taskRepo.save(task);
        writeLog(saved, task.getOwner(), "STATUS_CHANGED", old.name(), newStatus.name());
        log.info("Task [{}] status {} → {} by {}", taskId, old, newStatus, ownerEmail);
        TaskResponse response = TaskResponse.from(saved);
        eventPublisher.publishStatusChanged(ownerEmail, response);
        return response;
    }

    /* ─────────────────────────── DELETE ─────────────────────────────── */

    @Override
    public void delete(String ownerEmail, UUID taskId) {
        Task task = findOwnedTask(ownerEmail, taskId);
        writeLog(task, task.getOwner(), "DELETED", task.getStatus().name(), null);
        String taskIdStr = task.getId().toString();
        taskRepo.delete(task);
        eventPublisher.publishTaskDeleted(ownerEmail, taskIdStr);
        log.info("Task [{}] deleted by {}", taskId, ownerEmail);
    }

    @Override
    @Transactional(readOnly = true)
    public java.util.List<com.taskflow.dto.task.ActivityLogResponse> getActivity(UUID taskId) {
        return logRepo.findByTaskIdOrderByCreatedAtDesc(taskId).stream()
            .map(com.taskflow.dto.task.ActivityLogResponse::from)
            .toList();
    }

    /* ─────────────────────────── BULK ACTIONS ──────────────────────── */

    @Override
    @Transactional
    public BulkOperationResponse bulkChangeStatus(String ownerEmail, BulkStatusRequest req) {
        int count = 0;
        for (UUID id : req.taskIds()) {
            try {
                changeStatus(ownerEmail, id, req.status());
                count++;
            } catch (Exception ignored) {}
        }
        return new BulkOperationResponse(count, count + " tasks updated to " + req.status());
    }

    @Override
    @Transactional
    public BulkOperationResponse bulkChangePriority(String ownerEmail, BulkPriorityRequest req) {
        User owner = findUser(ownerEmail);
        int count = 0;
        for (UUID id : req.taskIds()) {
            try {
                Task t = findOwnedTask(ownerEmail, id);
                TaskPriority oldPrio = t.getPriority();
                t.setPriority(req.priority());
                taskRepo.save(t);
                writeLog(t, owner, "PRIORITY_CHANGED", oldPrio.name(), req.priority().name());
                count++;
            } catch (Exception ignored) {}
        }
        return new BulkOperationResponse(count, count + " tasks updated to priority " + req.priority());
    }

    @Override
    @Transactional
    public BulkOperationResponse bulkDelete(String ownerEmail, BulkDeleteRequest req) {
        int count = 0;
        for (UUID id : req.taskIds()) {
            try {
                delete(ownerEmail, id);
                count++;
            } catch (Exception ignored) {}
        }
        return new BulkOperationResponse(count, count + " tasks deleted successfully");
    }

    @Override
    @Transactional
    public BulkOperationResponse bulkAssignCategory(String ownerEmail, BulkCategoryRequest req) {
        User owner = findUser(ownerEmail);
        Category category = null;
        if (req.categoryId() != null) {
            category = categoryRepo.findById(req.categoryId()).orElse(null);
        }
        int count = 0;
        for (UUID id : req.taskIds()) {
            try {
                Task t = findOwnedTask(ownerEmail, id);
                t.setCategory(category);
                taskRepo.save(t);
                count++;
            } catch (Exception ignored) {}
        }
        String catName = category != null ? category.getName() : "None";
        return new BulkOperationResponse(count, count + " tasks assigned to project " + catName);
    }

    /* ─────────────────────────── Helpers ────────────────────────────── */

    /** Find a task that belongs to ownerEmail — returns 404 otherwise (hides other users' tasks). */
    private Task findOwnedTask(String ownerEmail, UUID taskId) {
        User owner = findUser(ownerEmail);
        return taskRepo.findById(taskId)
            .filter(t -> t.getOwner().getId().equals(owner.getId()))
            .orElseThrow(() -> new ResourceNotFoundException("Task not found: " + taskId));
    }

    private User findUser(String email) {
        return userRepo.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private void writeLog(Task task, User actor, String action, String oldVal, String newVal) {
        ActivityLog entry = ActivityLog.builder()
            .task(task)
            .actor(actor)
            .action(action)
            .oldValue(oldVal)
            .newValue(newVal)
            .build();
        logRepo.save(entry);
    }

    /** Whitelist sort fields to avoid JPQL injection */
    private String resolveSortField(String raw) {
        return switch (raw.toLowerCase()) {
            case "duedate"   -> "dueDate";
            case "priority"  -> "priority";
            case "title"     -> "title";
            case "status"    -> "status";
            case "updatedat" -> "updatedAt";
            default          -> "createdAt";
        };
    }
}

package com.taskflow.service;

import com.taskflow.dto.subtask.CreateSubtaskRequest;
import com.taskflow.dto.subtask.SubtaskResponse;
import com.taskflow.entity.Subtask;
import com.taskflow.entity.Task;
import com.taskflow.entity.User;
import com.taskflow.enums.TaskStatus;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.SubtaskRepository;
import com.taskflow.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubtaskService {

    private final SubtaskRepository subtaskRepository;
    private final TaskRepository    taskRepository;

    // ── Public API ──────────────────────────────────────────

    @Transactional
    public SubtaskResponse addSubtask(UUID taskId, CreateSubtaskRequest req, User currentUser) {
        Task task = findTaskOwnedBy(taskId, currentUser);
        Subtask subtask = Subtask.builder()
            .task(task)
            .title(req.title())
            .done(false)
            .build();
        return toResponse(subtaskRepository.save(subtask));
    }

    public List<SubtaskResponse> listSubtasks(UUID taskId, User currentUser) {
        findTaskOwnedBy(taskId, currentUser);   // ownership check
        return subtaskRepository.findByTaskIdOrderByCreatedAtAsc(taskId)
            .stream().map(this::toResponse).toList();
    }

    @Transactional
    public SubtaskResponse toggleDone(UUID taskId, UUID subtaskId, User currentUser) {
        Task task = findTaskOwnedBy(taskId, currentUser);
        Subtask subtask = subtaskRepository.findById(subtaskId)
            .filter(s -> s.getTask().getId().equals(taskId))
            .orElseThrow(() -> new ResourceNotFoundException("Subtask", subtaskId));

        subtask.setDone(!subtask.isDone());
        subtaskRepository.save(subtask);

        // Auto-complete parent when all subtasks are done
        autoCompleteParentIfNeeded(task);

        return toResponse(subtask);
    }

    @Transactional
    public void deleteSubtask(UUID taskId, UUID subtaskId, User currentUser) {
        findTaskOwnedBy(taskId, currentUser);
        Subtask subtask = subtaskRepository.findById(subtaskId)
            .filter(s -> s.getTask().getId().equals(taskId))
            .orElseThrow(() -> new ResourceNotFoundException("Subtask", subtaskId));
        subtaskRepository.delete(subtask);
    }

    // ── Helpers ─────────────────────────────────────────────

    private Task findTaskOwnedBy(UUID taskId, User user) {
        return taskRepository.findById(taskId)
            .filter(t -> t.getOwner().getId().equals(user.getId()))
            .orElseThrow(() -> new ResourceNotFoundException("Task", taskId));
    }

    private void autoCompleteParentIfNeeded(Task task) {
        long total     = subtaskRepository.countByTaskId(task.getId());
        long completed = subtaskRepository.countByTaskIdAndDoneTrue(task.getId());

        if (total > 0 && total == completed) {
            if (task.getStatus() != TaskStatus.DONE) {
                log.info("[Subtask] Auto-completing task {} — all {} subtasks done", task.getId(), total);
                task.setStatus(TaskStatus.DONE);
                java.time.LocalDateTime now = java.time.LocalDateTime.now();
                task.setCompletedAt(now);
                taskRepository.save(task);
            }
        }
    }

    private SubtaskResponse toResponse(Subtask s) {
        return new SubtaskResponse(s.getId(), s.getTitle(), s.isDone(), s.getCreatedAt());
    }
}

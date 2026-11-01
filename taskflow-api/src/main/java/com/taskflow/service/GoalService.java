package com.taskflow.service;

import com.taskflow.dto.productivity.CreateGoalRequest;
import com.taskflow.dto.productivity.GoalResponse;
import com.taskflow.dto.productivity.UpdateGoalRequest;
import com.taskflow.dto.task.TaskResponse;
import com.taskflow.entity.Goal;
import com.taskflow.entity.Task;
import com.taskflow.entity.User;
import com.taskflow.enums.TaskStatus;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.GoalRepository;
import com.taskflow.repository.TaskRepository;
import com.taskflow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class GoalService {

    private final GoalRepository goalRepo;
    private final TaskRepository taskRepo;
    private final UserRepository userRepo;

    @Transactional(readOnly = true)
    public List<GoalResponse> getGoals(String userEmail) {
        User user = findUser(userEmail);
        return goalRepo.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
            .map(g -> {
                long total = taskRepo.countByGoalId(g.getId());
                long completed = taskRepo.countByGoalIdAndStatus(g.getId(), TaskStatus.DONE);
                return GoalResponse.from(g, total, completed);
            })
            .toList();
    }

    @Transactional
    public GoalResponse createGoal(String userEmail, CreateGoalRequest req) {
        User user = findUser(userEmail);
        Goal g = Goal.builder()
            .user(user)
            .title(req.title().trim())
            .description(req.description())
            .targetDate(req.targetDate())
            .progress(0)
            .status("ACTIVE")
            .build();

        Goal saved = goalRepo.save(g);
        log.info("[Goals] User {} created goal \"{}\"", userEmail, saved.getTitle());
        return GoalResponse.from(saved, 0, 0);
    }

    @Transactional
    public GoalResponse updateGoal(String userEmail, UUID goalId, UpdateGoalRequest req) {
        User user = findUser(userEmail);
        Goal goal = goalRepo.findById(goalId)
            .filter(g -> g.getUser().getId().equals(user.getId()))
            .orElseThrow(() -> new ResourceNotFoundException("Goal", goalId));

        if (req.title() != null && !req.title().isBlank()) goal.setTitle(req.title().trim());
        if (req.description() != null) goal.setDescription(req.description());
        if (req.targetDate() != null) goal.setTargetDate(req.targetDate());
        if (req.progress() != null) goal.setProgress(req.progress());
        if (req.status() != null) goal.setStatus(req.status());

        Goal saved = goalRepo.save(goal);
        long total = taskRepo.countByGoalId(saved.getId());
        long completed = taskRepo.countByGoalIdAndStatus(saved.getId(), TaskStatus.DONE);
        return GoalResponse.from(saved, total, completed);
    }

    @Transactional
    public void deleteGoal(String userEmail, UUID goalId) {
        User user = findUser(userEmail);
        Goal goal = goalRepo.findById(goalId)
            .filter(g -> g.getUser().getId().equals(user.getId()))
            .orElseThrow(() -> new ResourceNotFoundException("Goal", goalId));

        // Unlink tasks
        List<Task> linked = taskRepo.findByGoalId(goalId);
        for (Task t : linked) {
            t.setGoal(null);
            taskRepo.save(t);
        }

        goalRepo.delete(goal);
        log.info("[Goals] User {} deleted goal {}", userEmail, goalId);
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> getTasksForGoal(String userEmail, UUID goalId) {
        findUser(userEmail);
        return taskRepo.findByGoalId(goalId).stream()
            .map(TaskResponse::from)
            .toList();
    }

    @Transactional
    public TaskResponse linkTaskToGoal(String userEmail, UUID goalId, UUID taskId) {
        User user = findUser(userEmail);
        Goal goal = goalRepo.findById(goalId)
            .filter(g -> g.getUser().getId().equals(user.getId()))
            .orElseThrow(() -> new ResourceNotFoundException("Goal", goalId));

        Task task = taskRepo.findById(taskId)
            .filter(t -> t.getOwner().getId().equals(user.getId()))
            .orElseThrow(() -> new ResourceNotFoundException("Task", taskId));

        task.setGoal(goal);
        Task saved = taskRepo.save(task);
        log.info("[Goals] Linked task {} to goal {}", taskId, goalId);
        return TaskResponse.from(saved);
    }

    private User findUser(String email) {
        return userRepo.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User", email));
    }
}

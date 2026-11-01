package com.taskflow.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskflow.dto.productivity.CreateTemplateRequest;
import com.taskflow.dto.productivity.TaskTemplateResponse;
import com.taskflow.dto.task.CreateTaskRequest;
import com.taskflow.entity.Category;
import com.taskflow.entity.TaskTemplate;
import com.taskflow.entity.User;
import com.taskflow.enums.TaskPriority;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.CategoryRepository;
import com.taskflow.repository.TaskTemplateRepository;
import com.taskflow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class TaskTemplateService {

    private final TaskTemplateRepository templateRepo;
    private final TaskService taskService;
    private final UserRepository userRepo;
    private final CategoryRepository categoryRepo;
    private final ObjectMapper objectMapper;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void seedDefaultTemplates() {
        if (templateRepo.count() > 0) return;

        log.info("[TaskTemplate] Seeding default starter templates...");

        List<TaskTemplate> defaults = List.of(
            TaskTemplate.builder()
                .title("🚀 Website Launch Checklist")
                .description("Production readiness checklist covering DNS, SSL, analytics, and SEO.")
                .category("Engineering")
                .tasksJson("""
                    [
                      {"title": "Verify custom domain DNS records and SSL certificates", "priority": "URGENT", "offsetDays": 1},
                      {"title": "Implement SEO OpenGraph tags, sitemap.xml, and robots.txt", "priority": "HIGH", "offsetDays": 2},
                      {"title": "Connect Google Analytics / PostHog tracking events", "priority": "HIGH", "offsetDays": 2},
                      {"title": "Perform cross-browser smoke tests on desktop and mobile", "priority": "MEDIUM", "offsetDays": 3},
                      {"title": "Verify database backups and production environment variables", "priority": "URGENT", "offsetDays": 1}
                    ]
                    """)
                .build(),

            TaskTemplate.builder()
                .title("📅 Weekly Review & Sprint Planning")
                .description("Weekly productivity routine for inbox zero, backlog refinement, and milestone setting.")
                .category("Routine")
                .tasksJson("""
                    [
                      {"title": "Clear communication inbox and triage unread notifications", "priority": "MEDIUM", "offsetDays": 1},
                      {"title": "Review completed tasks and log milestone achievements", "priority": "LOW", "offsetDays": 1},
                      {"title": "Identify slipped deliverables and adjust target deadlines", "priority": "HIGH", "offsetDays": 1},
                      {"title": "Select top 3 priority focus goals for the upcoming week", "priority": "URGENT", "offsetDays": 1},
                      {"title": "Schedule calendar time blocks for deep work sessions", "priority": "HIGH", "offsetDays": 2}
                    ]
                    """)
                .build(),

            TaskTemplate.builder()
                .title("🐛 Bug Triage & Hotfix Sprint")
                .description("Standard operating procedure for diagnosing, fixing, and verifying critical bugs.")
                .category("Engineering")
                .tasksJson("""
                    [
                      {"title": "Reproduce issue in local environment and isolate root cause", "priority": "URGENT", "offsetDays": 1},
                      {"title": "Write automated regression test reproducing the failure", "priority": "HIGH", "offsetDays": 1},
                      {"title": "Implement patch and verify all test suites pass", "priority": "URGENT", "offsetDays": 2},
                      {"title": "Conduct peer code review and obtain security sign-off", "priority": "HIGH", "offsetDays": 2},
                      {"title": "Deploy hotfix to staging and monitor error logging", "priority": "HIGH", "offsetDays": 3}
                    ]
                    """)
                .build(),

            TaskTemplate.builder()
                .title("📱 Mobile App Release Checklist")
                .description("Checklist for submitting new version to App Store and Google Play.")
                .category("Product")
                .tasksJson("""
                    [
                      {"title": "Increment version code, semantic build tag, and changelog", "priority": "MEDIUM", "offsetDays": 1},
                      {"title": "Capture high-resolution screenshots across all required form factors", "priority": "LOW", "offsetDays": 2},
                      {"title": "Verify privacy policy URLs and in-app permissions disclosures", "priority": "HIGH", "offsetDays": 2},
                      {"title": "Run release build smoke test on physical device", "priority": "URGENT", "offsetDays": 2},
                      {"title": "Submit app bundle for store review and monitor approval status", "priority": "URGENT", "offsetDays": 3}
                    ]
                    """)
                .build()
        );

        templateRepo.saveAll(defaults);
        log.info("[TaskTemplate] Successfully seeded {} starter templates", defaults.size());
    }

    @Transactional(readOnly = true)
    public List<TaskTemplateResponse> getTemplates(String userEmail) {
        User user = findUser(userEmail);
        return templateRepo.findAllAvailableForUser(user.getId()).stream()
            .map(TaskTemplateResponse::from)
            .toList();
    }

    @Transactional
    public TaskTemplateResponse createTemplate(String userEmail, CreateTemplateRequest req) {
        User user = findUser(userEmail);
        TaskTemplate t = TaskTemplate.builder()
            .user(user)
            .title(req.title().trim())
            .description(req.description())
            .category(req.category() != null ? req.category() : "CUSTOM")
            .tasksJson(req.tasksJson())
            .build();

        return TaskTemplateResponse.from(templateRepo.save(t));
    }

    @Transactional
    public List<UUID> applyTemplate(String userEmail, UUID templateId, UUID categoryId) {
        User user = findUser(userEmail);
        TaskTemplate template = templateRepo.findById(templateId)
            .orElseThrow(() -> new ResourceNotFoundException("TaskTemplate", templateId));

        List<Map<String, Object>> taskDefs;
        try {
            taskDefs = objectMapper.readValue(template.getTasksJson(), new TypeReference<>() {});
        } catch (Exception e) {
            log.error("Failed to parse template JSON: {}", template.getTasksJson(), e);
            throw new IllegalArgumentException("Invalid template JSON specification");
        }

        List<UUID> createdIds = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (Map<String, Object> def : taskDefs) {
            String title = (String) def.get("title");
            if (title == null || title.isBlank()) continue;

            String pStr = (String) def.getOrDefault("priority", "MEDIUM");
            TaskPriority priority;
            try {
                priority = TaskPriority.valueOf(pStr.toUpperCase());
            } catch (Exception ignored) {
                priority = TaskPriority.MEDIUM;
            }

            int offsetDays = def.get("offsetDays") instanceof Number num ? num.intValue() : 1;
            LocalDate dueDate = today.plusDays(offsetDays);

            CreateTaskRequest req = new CreateTaskRequest(
                title.trim(),
                "Generated from template: " + template.getTitle(),
                priority,
                today,
                dueDate,
                "template," + template.getCategory().toLowerCase(),
                null,
                categoryId,
                null,
                null,
                null,
                null
            );

            var created = taskService.create(userEmail, req);
            createdIds.add(created.id());
        }

        log.info("[TaskTemplate] Applied template \"{}\" for user {}: created {} tasks",
            template.getTitle(), userEmail, createdIds.size());
        return createdIds;
    }

    @Transactional
    public void deleteTemplate(String userEmail, UUID templateId) {
        User user = findUser(userEmail);
        TaskTemplate template = templateRepo.findById(templateId)
            .orElseThrow(() -> new ResourceNotFoundException("TaskTemplate", templateId));

        if (template.getUser() == null || !template.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("You can only delete your own custom templates.");
        }

        templateRepo.delete(template);
    }

    private User findUser(String email) {
        return userRepo.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User", email));
    }
}

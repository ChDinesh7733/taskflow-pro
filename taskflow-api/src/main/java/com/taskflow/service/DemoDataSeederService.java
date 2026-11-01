package com.taskflow.service;

import com.taskflow.dto.auth.AuthResponse;
import com.taskflow.dto.auth.UserResponse;
import com.taskflow.entity.*;
import com.taskflow.enums.TaskPriority;
import com.taskflow.enums.TaskStatus;
import com.taskflow.repository.*;
import com.taskflow.security.CustomUserDetailsService;
import com.taskflow.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DemoDataSeederService {

    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final TaskRepository taskRepository;
    private final SubtaskRepository subtaskRepository;
    private final TaskCommentRepository commentRepository;
    private final PomodoroSessionRepository pomodoroSessionRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;

    @Value("${jwt.refresh-token-expiry-ms}")
    private long refreshTokenExpiryMs;

    public static final String DEMO_EMAIL = "demo@taskflow.dev";
    public static final String DEMO_PASSWORD = "DemoUser123!";

    @Transactional
    public AuthResponse loginOrCreateDemoUser() {
        User user = userRepository.findByEmail(DEMO_EMAIL).orElse(null);

        if (user == null) {
            log.info("[DemoSeeder] Initializing new demo account with realistic seeded data...");
            user = User.builder()
                .email(DEMO_EMAIL)
                .displayName("Alex Rivera")
                .role(com.taskflow.enums.UserRole.ADMIN)
                .passwordHash(passwordEncoder.encode(DEMO_PASSWORD))
                .build();
            user = userRepository.save(user);

            seedDemoData(user);
        } else if (user.getRole() != com.taskflow.enums.UserRole.ADMIN) {
            user.setRole(com.taskflow.enums.UserRole.ADMIN);
            user = userRepository.save(user);
        }

        UserDetails details = userDetailsService.loadUserByUsername(DEMO_EMAIL);
        String accessToken = jwtService.generateAccessToken(details);
        String rawRefresh = UUID.randomUUID().toString();

        RefreshToken rt = RefreshToken.builder()
            .user(user)
            .tokenHash(passwordEncoder.encode(rawRefresh))
            .expiresAt(LocalDateTime.now().plusNanos(refreshTokenExpiryMs * 1_000_000L))
            .build();
        refreshTokenRepository.save(rt);

        log.info("[DemoSeeder] Demo user logged in: {}", DEMO_EMAIL);
        return new AuthResponse(
            accessToken,
            rawRefresh,
            jwtService.getAccessTokenExpiryMs(),
            UserResponse.from(user)
        );
    }

    private void seedDemoData(User user) {
        LocalDate today = LocalDate.now();
        LocalDateTime now = LocalDateTime.now();

        // 1. Categories
        Category catLaunch = categoryRepository.save(Category.builder()
            .name("Q4 Product Launch").color("#4f46e5").owner(user).build());
        Category catInfra = categoryRepository.save(Category.builder()
            .name("Infra & Performance").color("#0ea5e9").owner(user).build());
        Category catMobile = categoryRepository.save(Category.builder()
            .name("Mobile Redesign").color("#8b5cf6").owner(user).build());
        Category catGrowth = categoryRepository.save(Category.builder()
            .name("Growth & Analytics").color("#10b981").owner(user).build());

        // 2. Tasks
        // Task 1: Overdue TODO
        Task t1 = taskRepository.save(Task.builder()
            .title("Conduct WCAG AA accessibility audit on checkout flow")
            .description("Verify screen reader labels, keyboard focus rings, and color contrast on all payment modal steps.")
            .status(TaskStatus.TODO)
            .priority(TaskPriority.HIGH)
            .dueDate(today.plusDays(3))
            .tags("a11y, frontend, ui")
            .assigneeName("Alex Rivera")
            .category(catMobile)
            .owner(user)
            .build());

        // Task 2: URGENT Overdue
        Task t2 = taskRepository.save(Task.builder()
            .title("Finalize Stripe webhook idempotency keys & retry queue")
            .description("Prevent duplicate event processing for customer subscription charges during network retries.")
            .status(TaskStatus.TODO)
            .priority(TaskPriority.URGENT)
            .dueDate(today.minusDays(1)) // Overdue!
            .tags("billing, backend, security")
            .assigneeName("DevOps Lead")
            .category(catInfra)
            .owner(user)
            .build());

        // Task 3: In Progress
        Task t3 = taskRepository.save(Task.builder()
            .title("Optimize Docker multi-stage build cache layer")
            .description("Reduce container artifact size from 450MB to under 90MB using Eclipse Temurin JRE alpine base.")
            .status(TaskStatus.IN_PROGRESS)
            .priority(TaskPriority.HIGH)
            .dueDate(today.plusDays(1))
            .tags("devops, docker, speed")
            .assigneeName("Alex Rivera")
            .category(catInfra)
            .owner(user)
            .build());

        // Task 4: In Progress
        Task t4 = taskRepository.save(Task.builder()
            .title("Design interactive onboarding checklist component")
            .description("Guide first-time users through creating their initial task, inviting teammates, and running Pomodoro.")
            .status(TaskStatus.IN_PROGRESS)
            .priority(TaskPriority.MEDIUM)
            .dueDate(today.plusDays(4))
            .tags("ui, onboarding, react")
            .assigneeName("Product Design")
            .category(catLaunch)
            .owner(user)
            .build());

        // Task 5: In Review
        Task t5 = taskRepository.save(Task.builder()
            .title("Add Gemini 2.0 Flash function calling for automated sprint triage")
            .description("Automatically classify incoming user feedback into bug reports or feature requests.")
            .status(TaskStatus.IN_REVIEW)
            .priority(TaskPriority.HIGH)
            .dueDate(today.plusDays(2))
            .tags("ai, gemini, productivity")
            .assigneeName("Alex Rivera")
            .category(catLaunch)
            .owner(user)
            .build());

        // Task 6: In Review
        Task t6 = taskRepository.save(Task.builder()
            .title("Draft product changelog and release notes for v2.4")
            .description("Summarize the new Kanban drag-drop improvements, Pomodoro focus mode, and weekly AI executive digests.")
            .status(TaskStatus.IN_REVIEW)
            .priority(TaskPriority.LOW)
            .dueDate(today.plusDays(5))
            .tags("marketing, docs")
            .assigneeName("DevRel")
            .category(catGrowth)
            .owner(user)
            .build());

        // Task 7: DONE
        Task t7 = taskRepository.save(Task.builder()
            .title("Set up Pomodoro focus timer with auto-logging & confetti")
            .description("Canvas particle celebration cannon triggers on task completion and timer milestone achievements.")
            .status(TaskStatus.DONE)
            .completedAt(now.minusHours(4))
            .priority(TaskPriority.HIGH)
            .dueDate(today)
            .tags("gamification, pomodoro")
            .assigneeName("Alex Rivera")
            .category(catLaunch)
            .owner(user)
            .build());

        // Task 8: DONE
        Task t8 = taskRepository.save(Task.builder()
            .title("Design smart NLP task creation preview drawer")
            .description("Natural language input parser with editable modal review before saving into MySQL.")
            .status(TaskStatus.DONE)
            .completedAt(now.minusDays(1))
            .priority(TaskPriority.HIGH)
            .dueDate(today.minusDays(1))
            .tags("nlp, ai, ux")
            .assigneeName("Alex Rivera")
            .category(catLaunch)
            .owner(user)
            .build());

        // Task 9: DONE
        Task t9 = taskRepository.save(Task.builder()
            .title("Migrate PostgreSQL schema to V7 Flyway")
            .description("Added pomodoro_sessions and uploaded_files tables with foreign key cascades.")
            .status(TaskStatus.DONE)
            .completedAt(now.minusDays(2))
            .priority(TaskPriority.MEDIUM)
            .dueDate(today.minusDays(2))
            .tags("database, flyway")
            .assigneeName("Alex Rivera")
            .category(catInfra)
            .owner(user)
            .build());

        // 3. Subtasks
        subtaskRepository.save(Subtask.builder().task(t3).title("Benchmark current build time (3m 42s)").done(true).build());
        subtaskRepository.save(Subtask.builder().task(t3).title("Implement Maven layer caching").done(true).build());
        subtaskRepository.save(Subtask.builder().task(t3).title("Test minimal JRE runtime image in staging").done(false).build());

        subtaskRepository.save(Subtask.builder().task(t7).title("Zero-dependency confetti physics canvas").done(true).build());
        subtaskRepository.save(Subtask.builder().task(t7).title("Web Audio API victory synthesizer chime").done(true).build());
        subtaskRepository.save(Subtask.builder().task(t7).title("Auto-sync completed sessions to backend").done(true).build());

        // 4. Task Comments
        commentRepository.save(TaskComment.builder()
            .task(t3)
            .author(user)
            .content("Initial benchmarks showed a 65% reduction in build artifact size! Working on the runner layer now.")
            .build());

        commentRepository.save(TaskComment.builder()
            .task(t5)
            .author(user)
            .content("PR submitted for peer review. Tested with sample production payloads.")
            .build());

        // 5. Pomodoro Focus Sessions (3-day active streak!)
        // Day 1 (2 days ago)
        pomodoroSessionRepository.save(PomodoroSession.builder()
            .user(user).task(t9).durationMinutes(50).sessionType("WORK").interrupted(false)
            .startedAt(now.minusDays(2).minusMinutes(50)).completedAt(now.minusDays(2)).build());

        // Day 2 (yesterday)
        pomodoroSessionRepository.save(PomodoroSession.builder()
            .user(user).task(t8).durationMinutes(50).sessionType("WORK").interrupted(false)
            .startedAt(now.minusDays(1).minusMinutes(50)).completedAt(now.minusDays(1)).build());

        // Day 3 (today)
        pomodoroSessionRepository.save(PomodoroSession.builder()
            .user(user).task(t7).durationMinutes(25).sessionType("WORK").interrupted(false)
            .startedAt(now.minusMinutes(25)).completedAt(now).build());

        log.info("[DemoSeeder] Demo seed data creation completed successfully.");
    }
}

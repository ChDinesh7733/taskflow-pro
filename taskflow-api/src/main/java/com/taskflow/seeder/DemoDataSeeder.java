package com.taskflow.seeder;

import com.taskflow.entity.*;
import com.taskflow.enums.TaskPriority;
import com.taskflow.enums.TaskStatus;
import com.taskflow.enums.UserRole;
import com.taskflow.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Seeds demo data for recruiter@demo.com when Spring profile "demo" is active.
 * Idempotent — skips seeding if the demo user already exists.
 */
@Slf4j
@Component
@Profile("demo")
@RequiredArgsConstructor
public class DemoDataSeeder implements ApplicationRunner {

    private final UserRepository         userRepository;
    private final TaskRepository         taskRepository;
    private final SubtaskRepository      subtaskRepository;
    private final ActivityLogRepository  activityLogRepository;
    private final NotificationRepository notificationRepository;
    private final PasswordEncoder        passwordEncoder;

    private static final String DEMO_EMAIL    = "recruiter@demo.com";
    private static final String DEMO_PASSWORD = "Demo@1234!";
    private static final String DEMO_NAME     = "Alex Demo";

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.existsByEmail(DEMO_EMAIL)) {
            log.info("[DemoSeeder] Demo user already exists — skipping seed.");
            return;
        }

        log.info("[DemoSeeder] Seeding demo data for {}...", DEMO_EMAIL);

        User user        = seedUser();
        List<Task> tasks = seedTasks(user);
        seedSubtasks(tasks);
        seedActivityLogs(user, tasks);
        seedNotifications(user, tasks);

        log.info("[DemoSeeder] Done — created {} tasks for demo user.", tasks.size());
    }

    // ─────────────────────────────────────────────────────────────────────
    // User  — let Hibernate generate the UUID
    // ─────────────────────────────────────────────────────────────────────
    private User seedUser() {
        User u = new User();
        u.setDisplayName(DEMO_NAME);
        u.setEmail(DEMO_EMAIL);
        u.setPasswordHash(passwordEncoder.encode(DEMO_PASSWORD));
        u.setRole(UserRole.USER);
        u.setEmailDigestEnabled(true);
        // createdAt / updatedAt are @CreationTimestamp — set by Hibernate
        return userRepository.save(u);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Tasks  (30 realistic tasks across all statuses)
    // ─────────────────────────────────────────────────────────────────────
    private List<Task> seedTasks(User user) {
        record Blueprint(String title, String desc, TaskStatus status, TaskPriority priority, int dueDaysFromNow) {}

        List<Blueprint> blueprints = List.of(
            // ── DONE (8) ────────────────────────────────────────────────
            new Blueprint("Prepare resume for TCS",         "Update resume with latest projects and skills",  TaskStatus.DONE,        TaskPriority.HIGH,   -14),
            new Blueprint("Complete Java DSA module",        "Arrays, LinkedLists, Trees on GeeksForGeeks",   TaskStatus.DONE,        TaskPriority.HIGH,   -12),
            new Blueprint("Mock interview — System Design",  "Practice with Pramp, focus on HLD",             TaskStatus.DONE,        TaskPriority.HIGH,   -10),
            new Blueprint("Set up LinkedIn profile",         "Add projects, skills, and recommendations",     TaskStatus.DONE,        TaskPriority.MEDIUM,  -9),
            new Blueprint("Read Clean Code book",            "Chapters 1–8, take notes",                      TaskStatus.DONE,        TaskPriority.LOW,     -8),
            new Blueprint("Practice SQL queries",            "LeetCode database problems — 30 solved",        TaskStatus.DONE,        TaskPriority.MEDIUM,  -7),
            new Blueprint("Review Spring Boot concepts",     "REST, JPA, Security, Actuator",                 TaskStatus.DONE,        TaskPriority.HIGH,    -6),
            new Blueprint("Deploy portfolio to Vercel",      "Push latest build, check mobile layout",        TaskStatus.DONE,        TaskPriority.HIGH,    -5),

            // ── IN_REVIEW (3) ────────────────────────────────────────────
            new Blueprint("Code review — TaskFlow API",      "Review PR comments and fix requested changes",  TaskStatus.IN_REVIEW,   TaskPriority.HIGH,     2),
            new Blueprint("HR round preparation",            "Behavioural questions and salary negotiation",  TaskStatus.IN_REVIEW,   TaskPriority.MEDIUM,   3),
            new Blueprint("Docker deployment write-up",      "Document the Render + Aiven deploy process",    TaskStatus.IN_REVIEW,   TaskPriority.MEDIUM,   4),

            // ── IN_PROGRESS (6) ──────────────────────────────────────────
            new Blueprint("Build React dashboard",           "Implement charts, real-time updates, filters",  TaskStatus.IN_PROGRESS, TaskPriority.URGENT,   1),
            new Blueprint("Add WebSocket notifications",     "STOMP over WebSocket, push task events to UI",  TaskStatus.IN_PROGRESS, TaskPriority.HIGH,     2),
            new Blueprint("Write unit tests",                "JUnit 5 + Mockito for service layer",           TaskStatus.IN_PROGRESS, TaskPriority.HIGH,     3),
            new Blueprint("Prepare for Infosys interview",   "InfyTQ practice, OOP, Java 17 features",       TaskStatus.IN_PROGRESS, TaskPriority.HIGH,     5),
            new Blueprint("Learn Docker Compose",            "Multi-service setup with volumes and networks", TaskStatus.IN_PROGRESS, TaskPriority.MEDIUM,   7),
            new Blueprint("Complete DSA — Graph problems",   "BFS, DFS, Dijkstra — 20 problems",             TaskStatus.IN_PROGRESS, TaskPriority.MEDIUM,   8),

            // ── TODO (9) ─────────────────────────────────────────────────
            new Blueprint("Apply to Wipro openings",         "Search portal, tailor resume, apply to 5 JDs", TaskStatus.TODO,        TaskPriority.HIGH,     3),
            new Blueprint("Research Capgemini culture",      "Glassdoor reviews, interview questions",        TaskStatus.TODO,        TaskPriority.MEDIUM,   4),
            new Blueprint("Implement CI/CD pipeline",        "GitHub Actions — build, test, Docker push",     TaskStatus.TODO,        TaskPriority.HIGH,     5),
            new Blueprint("Prepare TCS NQT practice",       "Aptitude, coding sections — 2-hour mock",      TaskStatus.TODO,        TaskPriority.URGENT,   6),
            new Blueprint("Refactor AuthService",            "Extract token logic to dedicated TokenService", TaskStatus.TODO,        TaskPriority.LOW,      7),
            new Blueprint("Add Swagger documentation",       "Annotate all controllers with OpenAPI 3.0",    TaskStatus.TODO,        TaskPriority.MEDIUM,   8),
            new Blueprint("Study Microservices patterns",    "Saga, CQRS, Circuit Breaker — 3 chapters",     TaskStatus.TODO,        TaskPriority.MEDIUM,  10),
            new Blueprint("Practice English communication",  "Record 5-min intro video, watch playback",     TaskStatus.TODO,        TaskPriority.LOW,     12),
            new Blueprint("Set up Mailtrap for email tests", "Configure credentials, test digest email",      TaskStatus.TODO,        TaskPriority.LOW,     14),

            // ── CANCELLED (3) ────────────────────────────────────────────
            new Blueprint("Apply to startup XYZ",            "Company folded before interview",              TaskStatus.CANCELLED,   TaskPriority.MEDIUM,  -3),
            new Blueprint("Learn GraphQL",                   "Deprioritised — REST sufficient for now",       TaskStatus.CANCELLED,   TaskPriority.LOW,     -2),
            new Blueprint("Add OAuth2 login",                "Out of scope for v1 — moved to roadmap",       TaskStatus.CANCELLED,   TaskPriority.MEDIUM,   0)
        );

        List<Task> saved = new ArrayList<>();

        for (Blueprint bp : blueprints) {
            Task t = new Task();
            // Do NOT set id — let Hibernate generate UUID
            t.setTitle(bp.title());
            t.setDescription(bp.desc());
            t.setStatus(bp.status());
            t.setPriority(bp.priority());
            t.setDueDate(LocalDate.now().plusDays(bp.dueDaysFromNow()));
            t.setOwner(user);   // <-- correct field name is 'owner'

            if (bp.status() == TaskStatus.DONE) {
                t.setCompletedAt(LocalDateTime.now().minusDays(Math.max(0, -bp.dueDaysFromNow())));
            }
            saved.add(taskRepository.save(t));
        }
        return saved;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Subtasks
    // ─────────────────────────────────────────────────────────────────────
    private void seedSubtasks(List<Task> tasks) {
        addSubtasks(tasks, 0,  new String[]{"Update work experience section","Add project links","Proofread grammar","Export to PDF"}, new boolean[]{true,true,true,true});
        addSubtasks(tasks, 1,  new String[]{"Arrays & Strings","LinkedList problems","Tree traversals","Binary search","Dynamic programming intro"}, new boolean[]{true,true,true,true,true});
        addSubtasks(tasks, 2,  new String[]{"Design URL shortener","Design notification system","Design rate limiter","Review notes"}, new boolean[]{true,true,true,true});
        addSubtasks(tasks, 8,  new String[]{"Fix CORS config","Add missing Javadoc","Improve error messages","Add pagination to GET /tasks"}, new boolean[]{true,true,false,false});
        addSubtasks(tasks, 11, new String[]{"Stat cards component","Task list with filters","Recharts line graph","Skeleton loaders","Mobile responsive"}, new boolean[]{true,true,true,false,false});
        addSubtasks(tasks, 12, new String[]{"Configure STOMP broker","JWT auth for WS","useTaskSocket hook","Toast on event received"}, new boolean[]{true,true,false,false});
        addSubtasks(tasks, 13, new String[]{"AuthService tests","TaskService tests","AiBreakdownService tests","Integration test for Task CRUD"}, new boolean[]{true,false,false,false});
        addSubtasks(tasks, 14, new String[]{"InfyTQ verbal section","InfyTQ aptitude","OOP concepts revision","Java 17 new features","Mock coding round"}, new boolean[]{true,true,false,false,false});
        addSubtasks(tasks, 17, new String[]{"Search Wipro careers portal","Tailor resume for JD","Write cover letter","Submit applications","Follow up email"}, new boolean[]{false,false,false,false,false});
        addSubtasks(tasks, 19, new String[]{"GitHub Actions workflow","Docker build step","Run tests in CI","Push to GHCR"}, new boolean[]{false,false,false,false});
    }

    private void addSubtasks(List<Task> tasks, int idx, String[] titles, boolean[] dones) {
        Task parent = tasks.get(idx);
        for (int i = 0; i < titles.length; i++) {
            Subtask s = new Subtask();
            // id generated by Hibernate
            s.setTitle(titles[i]);
            s.setDone(dones[i]);
            s.setTask(parent);
            // createdAt has @Builder.Default = LocalDateTime.now() — set by entity default
            subtaskRepository.save(s);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Activity Logs
    // Note: createdAt is @CreationTimestamp — we use newValue field for context info
    // ─────────────────────────────────────────────────────────────────────
    private void seedActivityLogs(User user, List<Task> tasks) {
        // [taskIndex, actionIndex (0=CREATED,1=STATUS_CHANGED)]
        int[][] events = {
            {0,0},{0,1},{1,0},{1,1},{2,0},{2,1},
            {3,0},{3,1},{4,0},{4,1},{5,0},{5,1},
            {6,0},{6,1},{7,0},{7,1},{8,0},{8,1},
            {11,0},{11,1},{12,0},{12,1},{13,0},{14,0},
            {17,0},{19,0},{20,0},{21,0}
        };
        String[] actions = {"CREATED", "STATUS_CHANGED"};

        for (int[] ev : events) {
            int taskIdx   = ev[0];
            String action = actions[ev[1]];
            Task task     = tasks.get(taskIdx);

            ActivityLog entry = new ActivityLog();
            // id generated by Hibernate
            entry.setTask(task);
            entry.setActor(user);
            entry.setActorLabel(user.getDisplayName());
            entry.setAction(action);
            // Use newValue for human-readable context
            entry.setOldValue(action.equals("STATUS_CHANGED") ? "TODO"                    : null);
            entry.setNewValue(action.equals("STATUS_CHANGED") ? task.getStatus().name()    : "Task created");
            // createdAt is @CreationTimestamp — saved as current time (close enough for demo)
            activityLogRepository.save(entry);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Notifications
    // Note: Notification.taskId is UUID (not a Task relation), type field required
    // ─────────────────────────────────────────────────────────────────────
    private void seedNotifications(User user, List<Task> tasks) {
        seedNotif(user, tasks.get(11), "DUE_SOON", "Task due tomorrow: Build React dashboard",     false);
        seedNotif(user, tasks.get(17), "DUE_SOON", "Task due in 3 days: Apply to Wipro openings",  false);
        seedNotif(user, tasks.get(19), "DUE_SOON", "Upcoming: Implement CI/CD pipeline",            true);
        seedNotif(user, tasks.get(27), "OVERDUE",  "Overdue: Apply to startup XYZ (now cancelled)", true);
    }

    private void seedNotif(User user, Task task, String type, String message, boolean read) {
        Notification n = new Notification();
        n.setUser(user);
        n.setTaskId(task.getId());   // UUID field
        n.setType(type);
        n.setMessage(message);
        n.setRead(read);
        // createdAt defaults to LocalDateTime.now() via @Builder.Default
        notificationRepository.save(n);
    }
}

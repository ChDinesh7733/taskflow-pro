package com.taskmanagement.config;

import com.taskmanagement.entity.Task;
import com.taskmanagement.entity.User;
import com.taskmanagement.repository.TaskRepository;
import com.taskmanagement.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

/**
 * Non-destructive startup migration:
 *
 * 1. Ensures a bootstrap account exists (email/password from properties/env).
 * 2. Adopts any legacy tasks that have no owner into that account so that
 *    introducing per-user ownership never makes existing data disappear.
 *
 * Never deletes or rewrites task content.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${taskflow.seed.enabled:true}")
    private boolean seedEnabled;

    @Value("${taskflow.seed.email:demo@taskflow.app}")
    private String seedEmail;

    @Value("${taskflow.seed.password:Taskflow#Demo1}")
    private String seedPassword;

    @Value("${taskflow.seed.name:Demo User}")
    private String seedName;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        User owner = resolveOwner();
        adoptOrphanTasks(owner);
    }

    private User resolveOwner() {
        if (seedEnabled) {
            String email = seedEmail.trim().toLowerCase(Locale.ROOT);
            return userRepository.findByEmail(email).orElseGet(() -> {
                User user = User.builder()
                        .email(email)
                        .displayName(seedName.trim())
                        .passwordHash(passwordEncoder.encode(seedPassword))
                        .build();
                User saved = userRepository.save(user);
                log.info("Created bootstrap account '{}' — override the password via APP_SEED_PASSWORD before deploying",
                        saved.getEmail());
                return saved;
            });
        }
        return userRepository.findAll().stream().findFirst().orElse(null);
    }

    private void adoptOrphanTasks(User owner) {
        List<Task> orphans = taskRepository.findByUserIdIsNull();
        if (orphans.isEmpty()) {
            return;
        }
        if (owner == null) {
            log.warn("Found {} task(s) without an owner but no account exists — leaving them untouched", orphans.size());
            return;
        }
        orphans.forEach(task -> task.setUserId(owner.getId()));
        taskRepository.saveAll(orphans);
        log.info("Assigned {} pre-existing task(s) to {}", orphans.size(), owner.getEmail());
    }
}

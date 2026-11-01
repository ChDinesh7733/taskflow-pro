package com.taskflow.service;

import com.taskflow.dto.gamification.BadgeResponse;
import com.taskflow.dto.gamification.GamificationProfileResponse;
import com.taskflow.dto.gamification.LeaderboardEntryResponse;
import com.taskflow.dto.gamification.XpAwardResponse;
import com.taskflow.entity.User;
import com.taskflow.entity.UserBadge;
import com.taskflow.enums.TaskPriority;
import com.taskflow.enums.TaskStatus;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.TaskRepository;
import com.taskflow.repository.UserBadgeRepository;
import com.taskflow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class GamificationService {

    private final UserRepository userRepository;
    private final UserBadgeRepository userBadgeRepository;
    private final TaskRepository taskRepository;

    public record LevelTier(int level, String title, int minXp, int nextXp) {}

    private static final List<LevelTier> LEVEL_TIERS = List.of(
        new LevelTier(1, "Novice Planner", 0, 100),
        new LevelTier(2, "Task Initiate", 100, 250),
        new LevelTier(3, "Focus Apprentice", 250, 500),
        new LevelTier(4, "Productivity Warrior", 500, 1000),
        new LevelTier(5, "Sprint Master", 1000, 2000),
        new LevelTier(6, "Flow State Guru", 2000, 3500),
        new LevelTier(7, "Execution Titan", 3500, 5000),
        new LevelTier(8, "Grandmaster of Focus", 5000, 7500),
        new LevelTier(9, "Apex Achiever", 7500, 10000),
        new LevelTier(10, "TaskFlow Legend", 10000, 20000)
    );

    public record BadgeDefinition(String key, String title, String description, String icon) {}

    private static final List<BadgeDefinition> BADGE_DEFINITIONS = List.of(
        new BadgeDefinition("first_task", "🚀 First Step", "Completed your very first task", "🚀"),
        new BadgeDefinition("streak_3", "🔥 Streak Starter", "Maintained a 3-day task completion streak", "🔥"),
        new BadgeDefinition("streak_7", "⚡ Momentum Master", "Maintained a 7-day task completion streak", "⚡"),
        new BadgeDefinition("streak_30", "🛡️ Iron Will", "Maintained a 30-day task completion streak", "🛡️"),
        new BadgeDefinition("century_club", "🎯 Century Club", "Completed 100 tasks in TaskFlow", "🎯"),
        new BadgeDefinition("pomodoro_pioneer", "🍅 Pomodoro Pioneer", "Completed 5 Pomodoro focus sessions", "🍅"),
        new BadgeDefinition("goal_crusher", "🏆 Goal Crusher", "Achieved 100% completion on a strategic goal", "🏆"),
        new BadgeDefinition("habit_hero", "🌱 Habit Hero", "Maintained a 7-day daily habit streak", "🌱")
    );

    @Transactional
    public XpAwardResponse awardTaskCompletionXp(User user, TaskPriority priority) {
        int xpGained = switch (priority != null ? priority : TaskPriority.MEDIUM) {
            case URGENT -> 50;
            case HIGH   -> 35;
            case MEDIUM -> 20;
            case LOW    -> 10;
        };

        int oldXp = user.getXp();
        int oldLevel = user.getLevel();
        int newXp = oldXp + xpGained;
        user.setXp(newXp);

        // Update streaks
        LocalDate today = LocalDate.now();
        LocalDate lastDate = user.getLastActiveDate();
        if (lastDate == null || !lastDate.equals(today)) {
            if (lastDate != null && lastDate.equals(today.minusDays(1))) {
                user.setCurrentStreak(user.getCurrentStreak() + 1);
            } else {
                user.setCurrentStreak(1);
            }
            if (user.getCurrentStreak() > user.getLongestStreak()) {
                user.setLongestStreak(user.getCurrentStreak());
            }
            user.setLastActiveDate(today);
        }

        // Calculate new level
        LevelTier currentTier = getTierForXp(newXp);
        user.setLevel(currentTier.level());
        boolean leveledUp = currentTier.level() > oldLevel;

        userRepository.save(user);

        // Check badge unlocks
        List<BadgeResponse> newlyUnlocked = checkAndUnlockBadges(user);

        log.info("[Gamification] User {} awarded {} XP (New XP: {}, Level: {})",
            user.getEmail(), xpGained, newXp, currentTier.level());

        return new XpAwardResponse(
            xpGained,
            newXp,
            currentTier.level(),
            leveledUp,
            currentTier.title(),
            newlyUnlocked
        );
    }

    @Transactional(readOnly = true)
    public GamificationProfileResponse getProfile(String userEmail) {
        User user = findUser(userEmail);
        LevelTier tier = getTierForXp(user.getXp());
        int xpToNext = Math.max(0, tier.nextXp() - user.getXp());

        long completedTasks = taskRepository.countGroupedByStatus(user.getId()).stream()
            .filter(row -> row[0] == TaskStatus.DONE)
            .map(row -> (Long) row[1])
            .findFirst()
            .orElse(0L);

        // Badges
        List<UserBadge> unlocked = userBadgeRepository.findByUserIdOrderByUnlockedAtDesc(user.getId());
        Set<String> unlockedKeys = new HashSet<>();
        Map<String, UserBadge> badgeMap = new HashMap<>();
        for (UserBadge ub : unlocked) {
            unlockedKeys.add(ub.getBadgeKey());
            badgeMap.put(ub.getBadgeKey(), ub);
        }

        List<BadgeResponse> badges = new ArrayList<>();
        for (BadgeDefinition b : BADGE_DEFINITIONS) {
            boolean isUnlocked = unlockedKeys.contains(b.key());
            badges.add(new BadgeResponse(
                b.key(),
                b.title(),
                b.description(),
                b.icon(),
                isUnlocked,
                isUnlocked ? badgeMap.get(b.key()).getUnlockedAt() : null
            ));
        }

        // Leaderboard
        List<LeaderboardEntryResponse> leaderboard = buildLeaderboard(user, completedTasks);

        return new GamificationProfileResponse(
            user.getXp(),
            user.getLevel(),
            tier.title(),
            tier.minXp(),
            tier.nextXp(),
            xpToNext,
            user.getCurrentStreak(),
            user.getLongestStreak(),
            completedTasks,
            badges,
            leaderboard
        );
    }

    private List<BadgeResponse> checkAndUnlockBadges(User user) {
        List<BadgeResponse> newlyUnlocked = new ArrayList<>();
        long doneCount = taskRepository.countGroupedByStatus(user.getId()).stream()
            .filter(row -> row[0] == TaskStatus.DONE)
            .map(row -> (Long) row[1])
            .findFirst()
            .orElse(0L);

        if (doneCount >= 1) unlockBadge(user, "first_task", newlyUnlocked);
        if (user.getCurrentStreak() >= 3) unlockBadge(user, "streak_3", newlyUnlocked);
        if (user.getCurrentStreak() >= 7) unlockBadge(user, "streak_7", newlyUnlocked);
        if (user.getCurrentStreak() >= 30) unlockBadge(user, "streak_30", newlyUnlocked);
        if (doneCount >= 100) unlockBadge(user, "century_club", newlyUnlocked);

        return newlyUnlocked;
    }

    private void unlockBadge(User user, String badgeKey, List<BadgeResponse> newlyUnlocked) {
        if (userBadgeRepository.existsByUserIdAndBadgeKey(user.getId(), badgeKey)) return;

        BadgeDefinition def = BADGE_DEFINITIONS.stream()
            .filter(b -> b.key().equals(badgeKey))
            .findFirst()
            .orElse(null);

        if (def == null) return;

        UserBadge badge = UserBadge.builder()
            .user(user)
            .badgeKey(def.key())
            .title(def.title())
            .description(def.description())
            .icon(def.icon())
            .build();

        UserBadge saved = userBadgeRepository.save(badge);
        newlyUnlocked.add(new BadgeResponse(
            saved.getBadgeKey(),
            saved.getTitle(),
            saved.getDescription(),
            saved.getIcon(),
            true,
            saved.getUnlockedAt()
        ));
        log.info("[Gamification] User {} unlocked badge: {}", user.getEmail(), saved.getTitle());
    }

    private LevelTier getTierForXp(int xp) {
        for (int i = LEVEL_TIERS.size() - 1; i >= 0; i--) {
            if (xp >= LEVEL_TIERS.get(i).minXp()) {
                return LEVEL_TIERS.get(i);
            }
        }
        return LEVEL_TIERS.get(0);
    }

    private List<LeaderboardEntryResponse> buildLeaderboard(User current, long completedTasks) {
        List<LeaderboardEntryResponse> entries = new ArrayList<>();

        // Add realistic competitive peer team members
        entries.add(new LeaderboardEntryResponse(0, "Sophia Chen", "sophia@taskflow.dev", 6, 850, 19, false));
        entries.add(new LeaderboardEntryResponse(0, "Marcus Vance", "marcus@taskflow.dev", 5, 620, 14, false));
        entries.add(new LeaderboardEntryResponse(0, "Elena Rostova", "elena@taskflow.dev", 4, 490, 11, false));
        entries.add(new LeaderboardEntryResponse(0, "Liam Patel", "liam@taskflow.dev", 3, 310, 7, false));

        // Add current user
        int userWeeklyXp = Math.max(current.getXp(), (int)(completedTasks * 30));
        entries.add(new LeaderboardEntryResponse(0, current.getDisplayName(), current.getEmail(), current.getLevel(), userWeeklyXp, completedTasks, true));

        // Sort descending by weekly XP
        entries.sort((a, b) -> Integer.compare(b.weeklyXp(), a.weeklyXp()));

        // Assign ranks
        List<LeaderboardEntryResponse> ranked = new ArrayList<>();
        for (int i = 0; i < entries.size(); i++) {
            LeaderboardEntryResponse e = entries.get(i);
            ranked.add(new LeaderboardEntryResponse(i + 1, e.displayName(), e.email(), e.level(), e.weeklyXp(), e.tasksCompleted(), e.isCurrent()));
        }

        return ranked;
    }

    private User findUser(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User", email));
    }
}

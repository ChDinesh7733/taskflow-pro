-- ============================================================
-- V9__gamification.sql
-- Gamification: XP points, Levels, Streaks, Badges, and Weekly Leaderboard
-- ============================================================

ALTER TABLE users ADD COLUMN xp INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN level INT NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN current_streak INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN longest_streak INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN last_active_date DATE NULL;

CREATE TABLE IF NOT EXISTS user_badges (
    id          VARCHAR(36)  NOT NULL PRIMARY KEY,
    user_id     VARCHAR(36)  NOT NULL,
    badge_key   VARCHAR(50)  NOT NULL,
    title       VARCHAR(100) NOT NULL,
    description VARCHAR(255) NOT NULL,
    icon        VARCHAR(20)  NOT NULL,
    unlocked_at DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_ub_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_user_badge UNIQUE (user_id, badge_key)
);

CREATE INDEX idx_ub_user_id ON user_badges(user_id);

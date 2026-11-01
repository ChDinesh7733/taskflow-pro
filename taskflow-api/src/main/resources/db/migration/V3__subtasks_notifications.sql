-- ─────────────────────────────────────────────────────────
-- V3: subtasks + notifications
-- ─────────────────────────────────────────────────────────

-- Subtasks (belongs to a task)
CREATE TABLE IF NOT EXISTS subtasks (
    id          VARCHAR(36)  NOT NULL PRIMARY KEY,
    task_id     VARCHAR(36)  NOT NULL,
    title       VARCHAR(255) NOT NULL,
    done        TINYINT(1)   NOT NULL DEFAULT 0,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_subtask_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
CREATE INDEX idx_subtasks_task_id ON subtasks(task_id);

-- Notifications per user
CREATE TABLE IF NOT EXISTS notifications (
    id          VARCHAR(36)  NOT NULL PRIMARY KEY,
    user_id     VARCHAR(36)  NOT NULL,
    task_id     VARCHAR(36),
    type        VARCHAR(30)  NOT NULL,   -- DUE_SOON | OVERDUE | SYSTEM
    message     TEXT         NOT NULL,
    is_read     TINYINT(1)   NOT NULL DEFAULT 0,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notif_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);

-- User settings (email digest toggle) — added as column on users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_digest_enabled TINYINT(1) NOT NULL DEFAULT 1;

-- AI rate-limit audit (optional — we use in-memory map, table is for resilience)
CREATE TABLE IF NOT EXISTS ai_rate_limit_log (
    id          BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id     VARCHAR(36)  NOT NULL,
    requested_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_rl_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_ai_rl_user_time ON ai_rate_limit_log(user_id, requested_at);

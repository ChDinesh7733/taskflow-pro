-- ============================================================
-- V7__pomodoro_sessions.sql
-- Table to store Pomodoro focus timer sessions and duration
-- ============================================================

CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id               VARCHAR(36)  NOT NULL PRIMARY KEY,
    user_id          VARCHAR(36)  NOT NULL,
    task_id          VARCHAR(36)  NULL,
    duration_minutes INT          NOT NULL DEFAULT 25,
    session_type     VARCHAR(20)  NOT NULL DEFAULT 'WORK',
    interrupted      BOOLEAN      NOT NULL DEFAULT FALSE,
    started_at       DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    completed_at     DATETIME(6)  NULL,
    CONSTRAINT fk_pomo_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_pomo_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

CREATE INDEX idx_pomo_user_id ON pomodoro_sessions(user_id);
CREATE INDEX idx_pomo_task_id ON pomodoro_sessions(task_id);

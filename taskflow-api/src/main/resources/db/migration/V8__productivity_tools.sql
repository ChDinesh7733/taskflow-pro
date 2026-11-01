-- ============================================================
-- V8__productivity_tools.sql
-- Productivity suite: Task Templates, Habits, Goals/OKRs, and Time Blocking
-- ============================================================

-- 1. Task Templates (reusable checklists)
CREATE TABLE IF NOT EXISTS task_templates (
    id          VARCHAR(36)  NOT NULL PRIMARY KEY,
    user_id     VARCHAR(36)  NULL,
    title       VARCHAR(255) NOT NULL,
    description TEXT         NULL,
    category    VARCHAR(100) NOT NULL DEFAULT 'GENERAL',
    tasks_json  TEXT         NOT NULL,
    created_at  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_template_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_template_user_id ON task_templates(user_id);

-- 2. Habits (daily habits with streaks)
CREATE TABLE IF NOT EXISTS habits (
    id                  VARCHAR(36)  NOT NULL PRIMARY KEY,
    user_id             VARCHAR(36)  NOT NULL,
    title               VARCHAR(255) NOT NULL,
    description         VARCHAR(500) NULL,
    frequency           VARCHAR(50)  NOT NULL DEFAULT 'DAILY',
    current_streak      INT          NOT NULL DEFAULT 0,
    longest_streak      INT          NOT NULL DEFAULT 0,
    last_completed_date DATE         NULL,
    created_at          DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_habit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_habit_user_id ON habits(user_id);

-- 3. Goals / OKRs
CREATE TABLE IF NOT EXISTS goals (
    id          VARCHAR(36)  NOT NULL PRIMARY KEY,
    user_id     VARCHAR(36)  NOT NULL,
    title       VARCHAR(255) NOT NULL,
    description TEXT         NULL,
    target_date DATE         NULL,
    progress    INT          NOT NULL DEFAULT 0,
    status      VARCHAR(50)  NOT NULL DEFAULT 'ACTIVE',
    created_at  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_goal_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_goal_user_id ON goals(user_id);

-- 4. Alter tasks to link to goals and enable Time Blocking
ALTER TABLE tasks ADD COLUMN goal_id VARCHAR(36) NULL;
ALTER TABLE tasks ADD COLUMN time_block_date DATE NULL;
ALTER TABLE tasks ADD COLUMN time_block_start VARCHAR(10) NULL;
ALTER TABLE tasks ADD COLUMN time_block_end VARCHAR(10) NULL;
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_goal FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL;
CREATE INDEX idx_tasks_goal_id ON tasks(goal_id);

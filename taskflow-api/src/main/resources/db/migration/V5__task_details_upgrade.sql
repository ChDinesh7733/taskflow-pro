-- ============================================================
-- V5__task_details_upgrade.sql
-- Adds tags and assignee_name to tasks table,
-- and creates task_comments table.
-- ============================================================

ALTER TABLE tasks ADD COLUMN tags VARCHAR(255) NULL;
ALTER TABLE tasks ADD COLUMN assignee_name VARCHAR(100) NULL;

CREATE TABLE IF NOT EXISTS task_comments (
    id         VARCHAR(36) NOT NULL PRIMARY KEY,
    task_id    VARCHAR(36) NOT NULL,
    user_id    VARCHAR(36) NOT NULL,
    content    TEXT        NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_tc_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_tc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_tc_task_id ON task_comments(task_id);

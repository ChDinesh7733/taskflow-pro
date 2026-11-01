-- ============================================================
-- V4__date_validation_constraint.sql
-- Adds dueDate >= startDate CHECK constraint to tasks table.
-- Also ensures URGENT is present in priority CHECK (already is,
-- but we make it explicit and idempotent-safe via ALTER).
-- ============================================================

-- Drop old check constraints so we can redefine them cleanly.
-- MySQL 8.0.16+ supports CHECK constraints; this is safe.
ALTER TABLE tasks
    DROP CONSTRAINT IF EXISTS chk_task_priority,
    DROP CONSTRAINT IF EXISTS chk_task_status,
    DROP CONSTRAINT IF EXISTS chk_task_dates;

-- Re-add constraints (priority already had URGENT; dates constraint is new)
ALTER TABLE tasks
    ADD CONSTRAINT chk_task_status
        CHECK (status IN ('TODO','IN_PROGRESS','IN_REVIEW','DONE','CANCELLED')),
    ADD CONSTRAINT chk_task_priority
        CHECK (priority IN ('LOW','MEDIUM','HIGH','URGENT')),
    ADD CONSTRAINT chk_task_dates
        CHECK (due_date IS NULL OR start_date IS NULL OR due_date >= start_date);

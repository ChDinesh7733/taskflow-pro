-- V2: Make actor_id nullable (system/scheduler has no user actor)
--     Add actor_label for system-originated log entries

ALTER TABLE activity_logs
    MODIFY COLUMN actor_id VARCHAR(36) NULL;

ALTER TABLE activity_logs
    ADD COLUMN actor_label VARCHAR(50) NULL AFTER actor_id;

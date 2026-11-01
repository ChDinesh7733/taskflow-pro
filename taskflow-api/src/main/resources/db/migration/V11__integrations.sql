-- ============================================================
-- V11__integrations.sql
-- Integrations: Google Calendar, Email Inbound, Webhooks, API Keys
-- ============================================================

-- 1. Integration Settings per User
CREATE TABLE IF NOT EXISTS integration_settings (
    id                         VARCHAR(36)  NOT NULL PRIMARY KEY,
    user_id                    VARCHAR(36)  NOT NULL UNIQUE,
    gcal_enabled               BOOLEAN      NOT NULL DEFAULT FALSE,
    gcal_email                 VARCHAR(255) NULL,
    gcal_last_sync             DATETIME(6)  NULL,
    email_inbound_token        VARCHAR(64)  NULL UNIQUE,
    email_inbound_enabled      BOOLEAN      NOT NULL DEFAULT TRUE,
    webhook_enabled            BOOLEAN      NOT NULL DEFAULT FALSE,
    webhook_url                VARCHAR(500) NULL,
    webhook_provider           VARCHAR(50)  NOT NULL DEFAULT 'SLACK',
    webhook_notify_on_create   BOOLEAN      NOT NULL DEFAULT TRUE,
    webhook_notify_on_complete BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at                 DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at                 DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_is_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_is_user_id ON integration_settings(user_id);
CREATE INDEX idx_is_email_token ON integration_settings(email_inbound_token);

-- 2. API Keys for Browser Extensions, Automation & CLI
CREATE TABLE IF NOT EXISTS api_keys (
    id           VARCHAR(36)  NOT NULL PRIMARY KEY,
    user_id      VARCHAR(36)  NOT NULL,
    name         VARCHAR(100) NOT NULL,
    key_prefix   VARCHAR(16)  NOT NULL,
    key_hash     VARCHAR(128) NOT NULL UNIQUE,
    revoked      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    last_used_at DATETIME(6)  NULL,
    CONSTRAINT fk_ak_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_ak_user_id ON api_keys(user_id);
CREATE INDEX idx_ak_key_hash ON api_keys(key_hash);

-- 3. Synced Calendar Events Record
CREATE TABLE IF NOT EXISTS calendar_sync_events (
    id         VARCHAR(36)  NOT NULL PRIMARY KEY,
    user_id    VARCHAR(36)  NOT NULL,
    task_id    VARCHAR(36)  NULL,
    event_id   VARCHAR(100) NOT NULL,
    title      VARCHAR(255) NOT NULL,
    event_time DATETIME(6)  NOT NULL,
    synced_at  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_cse_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_cse_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

CREATE INDEX idx_cse_user_id ON calendar_sync_events(user_id);

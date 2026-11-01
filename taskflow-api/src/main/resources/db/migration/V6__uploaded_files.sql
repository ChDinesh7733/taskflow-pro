-- ============================================================
-- V6__uploaded_files.sql
-- Table to store uploaded CSV, PDF, and attachment files
-- ============================================================

CREATE TABLE IF NOT EXISTS uploaded_files (
    id                VARCHAR(36)  NOT NULL PRIMARY KEY,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename   VARCHAR(255) NOT NULL,
    file_type         VARCHAR(50)  NOT NULL,
    content_type      VARCHAR(100) NULL,
    file_size         BIGINT       NOT NULL,
    storage_path      VARCHAR(500) NOT NULL,
    user_id           VARCHAR(36)  NOT NULL,
    created_at        DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_uf_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_uf_user_id ON uploaded_files(user_id);

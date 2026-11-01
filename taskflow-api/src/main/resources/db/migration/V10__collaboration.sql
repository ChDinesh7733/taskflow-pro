-- ============================================================
-- V10__collaboration.sql
-- Collaboration: Team Members, Roles, Mentions, and Public Project Sharing
-- ============================================================

-- 1. Team Members & Invitations
CREATE TABLE IF NOT EXISTS team_members (
    id          VARCHAR(36)  NOT NULL PRIMARY KEY,
    owner_id    VARCHAR(36)  NOT NULL,
    user_id     VARCHAR(36)  NULL,
    email       VARCHAR(255) NOT NULL,
    name        VARCHAR(100) NOT NULL,
    role        VARCHAR(20)  NOT NULL DEFAULT 'MEMBER',
    status      VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_at  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_tm_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_tm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT uk_tm_owner_email UNIQUE (owner_id, email)
);

CREATE INDEX idx_tm_owner_id ON team_members(owner_id);
CREATE INDEX idx_tm_email ON team_members(email);

-- 2. Project Public Sharing on categories table
ALTER TABLE categories ADD COLUMN share_token VARCHAR(64) NULL UNIQUE;
ALTER TABLE categories ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT FALSE;

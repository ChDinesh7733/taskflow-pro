-- ============================================================
-- V1__init_schema.sql  — TaskFlow initial schema
-- Uses VARCHAR(36) for UUIDs so Hibernate @JdbcTypeCode(VARCHAR)
-- validation passes without issue.
-- ============================================================

-- ── users ────────────────────────────────────────────────
CREATE TABLE users (
    id            VARCHAR(36)  NOT NULL,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    display_name  VARCHAR(100) NOT NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'USER',
    enabled       TINYINT(1)   NOT NULL DEFAULT 1,
    created_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_users PRIMARY KEY (id),
    CONSTRAINT uk_users_email UNIQUE (email)
);

CREATE INDEX idx_users_email ON users (email);

-- ── refresh_tokens ───────────────────────────────────────
CREATE TABLE refresh_tokens (
    id          VARCHAR(36)  NOT NULL,
    user_id     VARCHAR(36)  NOT NULL,
    token_hash  VARCHAR(255) NOT NULL,
    expires_at  DATETIME(6)  NOT NULL,
    revoked     TINYINT(1)   NOT NULL DEFAULT 0,
    created_at  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_refresh_tokens PRIMARY KEY (id),
    CONSTRAINT uk_refresh_token  UNIQUE (token_hash),
    CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_rt_user_id ON refresh_tokens (user_id);

-- ── categories ───────────────────────────────────────────
CREATE TABLE categories (
    id         VARCHAR(36)  NOT NULL,
    name       VARCHAR(100) NOT NULL,
    color      VARCHAR(7)   NOT NULL DEFAULT '#6366f1',
    owner_id   VARCHAR(36)  NOT NULL,
    created_at DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_categories PRIMARY KEY (id),
    CONSTRAINT fk_cat_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_categories_owner ON categories (owner_id);

-- ── tasks ────────────────────────────────────────────────
CREATE TABLE tasks (
    id           VARCHAR(36)   NOT NULL,
    title        VARCHAR(255)  NOT NULL,
    description  TEXT,
    status       VARCHAR(20)   NOT NULL DEFAULT 'TODO',
    priority     VARCHAR(10)   NOT NULL DEFAULT 'MEDIUM',
    start_date   DATE,
    due_date     DATE,
    completed_at DATETIME(6),
    owner_id     VARCHAR(36)   NOT NULL,
    category_id  VARCHAR(36),
    created_at   DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at   DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_tasks         PRIMARY KEY (id),
    CONSTRAINT fk_task_owner    FOREIGN KEY (owner_id)    REFERENCES users (id)      ON DELETE CASCADE,
    CONSTRAINT fk_task_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL,
    CONSTRAINT chk_task_status   CHECK (status   IN ('TODO','IN_PROGRESS','IN_REVIEW','DONE','CANCELLED')),
    CONSTRAINT chk_task_priority CHECK (priority IN ('LOW','MEDIUM','HIGH','URGENT'))
);

CREATE INDEX idx_tasks_owner_id     ON tasks (owner_id);
CREATE INDEX idx_tasks_status       ON tasks (status);
CREATE INDEX idx_tasks_due_date     ON tasks (due_date);
CREATE INDEX idx_tasks_owner_status ON tasks (owner_id, status);

-- ── activity_logs ────────────────────────────────────────
CREATE TABLE activity_logs (
    id          VARCHAR(36)  NOT NULL,
    task_id     VARCHAR(36)  NOT NULL,
    actor_id    VARCHAR(36)  NOT NULL,
    action      VARCHAR(50)  NOT NULL,
    old_value   TEXT,
    new_value   TEXT,
    created_at  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_activity_logs PRIMARY KEY (id),
    CONSTRAINT fk_al_task  FOREIGN KEY (task_id)  REFERENCES tasks (id) ON DELETE CASCADE,
    CONSTRAINT fk_al_actor FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_al_task_id  ON activity_logs (task_id);
CREATE INDEX idx_al_actor_id ON activity_logs (actor_id);

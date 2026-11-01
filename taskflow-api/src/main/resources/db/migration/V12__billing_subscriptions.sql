-- ============================================================
-- V12__billing_subscriptions.sql
-- Billing, Subscriptions, and Admin Operations
-- ============================================================

-- 1. Add plan_tier to users
ALTER TABLE users ADD COLUMN plan_tier VARCHAR(20) NOT NULL DEFAULT 'FREE';

-- 2. Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
    id                 VARCHAR(36)  NOT NULL PRIMARY KEY,
    user_id            VARCHAR(36)  NOT NULL,
    plan_tier          VARCHAR(20)  NOT NULL,
    status             VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    provider           VARCHAR(20)  NOT NULL DEFAULT 'STRIPE',
    payment_method     VARCHAR(50)  NOT NULL DEFAULT 'CARD',
    amount             INT          NOT NULL DEFAULT 12,
    currency           VARCHAR(10)  NOT NULL DEFAULT 'USD',
    current_period_end DATETIME(6)  NOT NULL,
    created_at         DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at         DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_sub_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sub_user_id ON subscriptions(user_id);

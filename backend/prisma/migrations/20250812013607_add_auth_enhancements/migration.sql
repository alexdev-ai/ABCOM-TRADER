-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "remember_me" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used" DATETIME,
    CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "failed_login_attempts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "ip_address" TEXT NOT NULL,
    "attempt_time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_agent" TEXT,
    CONSTRAINT "failed_login_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_is_revoked_idx" ON "refresh_tokens"("user_id", "is_revoked");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "failed_login_attempts_user_id_attempt_time_idx" ON "failed_login_attempts"("user_id", "attempt_time");

-- CreateIndex
CREATE INDEX "failed_login_attempts_ip_address_attempt_time_idx" ON "failed_login_attempts"("ip_address", "attempt_time");

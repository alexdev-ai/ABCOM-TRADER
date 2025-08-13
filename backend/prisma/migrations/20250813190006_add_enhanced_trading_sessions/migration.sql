/*
  Warnings:

  - You are about to drop the column `loss_limit_percentage` on the `trading_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `total_trades` on the `trading_sessions` table. All the data in the column will be lost.
  - Added the required column `current_balance` to the `trading_sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `loss_limit_percent` to the `trading_sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `starting_balance` to the `trading_sessions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "session_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_data" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "session_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "trading_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_trading_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "loss_limit_amount" DECIMAL NOT NULL,
    "loss_limit_percent" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "start_time" DATETIME,
    "end_time" DATETIME,
    "actual_end_time" DATETIME,
    "current_balance" DECIMAL NOT NULL,
    "starting_balance" DECIMAL NOT NULL,
    "current_pnl" DECIMAL NOT NULL DEFAULT 0,
    "max_loss" DECIMAL NOT NULL DEFAULT 0,
    "max_gain" DECIMAL NOT NULL DEFAULT 0,
    "trade_count" INTEGER NOT NULL DEFAULT 0,
    "actual_duration_minutes" INTEGER,
    "realized_pnl" DECIMAL NOT NULL DEFAULT 0.00,
    "session_performance_percentage" DECIMAL NOT NULL DEFAULT 0.00,
    "termination_reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "trading_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_trading_sessions" ("actual_duration_minutes", "created_at", "duration_minutes", "end_time", "id", "loss_limit_amount", "realized_pnl", "session_performance_percentage", "start_time", "status", "termination_reason", "updated_at", "user_id") SELECT "actual_duration_minutes", "created_at", "duration_minutes", "end_time", "id", "loss_limit_amount", "realized_pnl", "session_performance_percentage", "start_time", "status", "termination_reason", "updated_at", "user_id" FROM "trading_sessions";
DROP TABLE "trading_sessions";
ALTER TABLE "new_trading_sessions" RENAME TO "trading_sessions";
CREATE INDEX "trading_sessions_user_id_status_idx" ON "trading_sessions"("user_id", "status");
CREATE INDEX "trading_sessions_status_idx" ON "trading_sessions"("status");
CREATE INDEX "trading_sessions_user_id_created_at_idx" ON "trading_sessions"("user_id", "created_at");
CREATE INDEX "trading_sessions_end_time_idx" ON "trading_sessions"("end_time");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "session_events_session_id_timestamp_idx" ON "session_events"("session_id", "timestamp");

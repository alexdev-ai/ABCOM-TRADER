/*
  Warnings:

  - You are about to drop the `TradingSession` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "TradingSession";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "trading_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "loss_limit_amount" DECIMAL NOT NULL,
    "loss_limit_percentage" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "start_time" DATETIME,
    "end_time" DATETIME,
    "actual_duration_minutes" INTEGER,
    "total_trades" INTEGER NOT NULL DEFAULT 0,
    "realized_pnl" DECIMAL NOT NULL DEFAULT 0.00,
    "session_performance_percentage" DECIMAL NOT NULL DEFAULT 0.00,
    "termination_reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "trading_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "trading_sessions_user_id_status_idx" ON "trading_sessions"("user_id", "status");

-- CreateIndex
CREATE INDEX "trading_sessions_status_idx" ON "trading_sessions"("status");

-- CreateIndex
CREATE INDEX "trading_sessions_user_id_created_at_idx" ON "trading_sessions"("user_id", "created_at");

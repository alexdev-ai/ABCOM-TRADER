/*
  Warnings:

  - You are about to drop the column `cumulativeReturn` on the `benchmark_data` table. All the data in the column will be lost.
  - You are about to drop the column `dailyReturn` on the `benchmark_data` table. All the data in the column will be lost.
  - You are about to drop the column `lastUpdated` on the `benchmark_data` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `performance_attribution` table. All the data in the column will be lost.
  - You are about to drop the column `positionReturn` on the `performance_attribution` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `performance_attribution` table. All the data in the column will be lost.
  - You are about to drop the column `annualizedReturn` on the `performance_snapshots` table. All the data in the column will be lost.
  - You are about to drop the column `benchmarkReturn` on the `performance_snapshots` table. All the data in the column will be lost.
  - You are about to drop the column `benchmarkReturnPercent` on the `performance_snapshots` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `performance_snapshots` table. All the data in the column will be lost.
  - You are about to drop the column `lastUpdated` on the `performance_snapshots` table. All the data in the column will be lost.
  - You are about to drop the column `maxDrawdown` on the `performance_snapshots` table. All the data in the column will be lost.
  - You are about to drop the column `sharpeRatio` on the `performance_snapshots` table. All the data in the column will be lost.
  - You are about to drop the column `sortinoRatio` on the `performance_snapshots` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `performance_snapshots` table. All the data in the column will be lost.
  - You are about to drop the column `totalReturn` on the `performance_snapshots` table. All the data in the column will be lost.
  - You are about to drop the column `totalReturnPercent` on the `performance_snapshots` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `performance_snapshots` table. All the data in the column will be lost.
  - You are about to drop the column `avgLoss` on the `portfolio_performance` table. All the data in the column will be lost.
  - You are about to drop the column `avgWin` on the `portfolio_performance` table. All the data in the column will be lost.
  - You are about to drop the column `benchmarkReturn` on the `portfolio_performance` table. All the data in the column will be lost.
  - You are about to drop the column `consecutiveLosses` on the `portfolio_performance` table. All the data in the column will be lost.
  - You are about to drop the column `consecutiveWins` on the `portfolio_performance` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `portfolio_performance` table. All the data in the column will be lost.
  - You are about to drop the column `cumulativeReturn` on the `portfolio_performance` table. All the data in the column will be lost.
  - You are about to drop the column `dailyReturn` on the `portfolio_performance` table. All the data in the column will be lost.
  - You are about to drop the column `largestGain` on the `portfolio_performance` table. All the data in the column will be lost.
  - You are about to drop the column `largestLoss` on the `portfolio_performance` table. All the data in the column will be lost.
  - You are about to drop the column `maxDrawdown` on the `portfolio_performance` table. All the data in the column will be lost.
  - You are about to drop the column `portfolioValue` on the `portfolio_performance` table. All the data in the column will be lost.
  - You are about to drop the column `sharpeRatio` on the `portfolio_performance` table. All the data in the column will be lost.
  - You are about to drop the column `totalTrades` on the `portfolio_performance` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `portfolio_performance` table. All the data in the column will be lost.
  - You are about to drop the column `winRate` on the `portfolio_performance` table. All the data in the column will be lost.
  - You are about to alter the column `average_cost` on the `portfolio_positions` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to alter the column `current_price` on the `portfolio_positions` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to alter the column `market_value` on the `portfolio_positions` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to alter the column `quantity` on the `portfolio_positions` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to alter the column `unrealized_pnl` on the `portfolio_positions` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to alter the column `unrealized_pnl_percent` on the `portfolio_positions` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to alter the column `cash_balance` on the `portfolio_summary` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to alter the column `total_pnl` on the `portfolio_summary` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to alter the column `total_pnl_percent` on the `portfolio_summary` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to alter the column `total_value` on the `portfolio_summary` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - Added the required column `user_id` to the `performance_attribution` table without a default value. This is not possible if the table is not empty.
  - Added the required column `end_date` to the `performance_snapshots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_date` to the `performance_snapshots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total_return` to the `performance_snapshots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total_return_percent` to the `performance_snapshots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `performance_snapshots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `portfolio_value` to the `portfolio_performance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `portfolio_performance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `risk_management` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "portfolio_targets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_name" TEXT NOT NULL,
    "target_percentage" DECIMAL NOT NULL,
    "min_percentage" DECIMAL,
    "max_percentage" DECIMAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "portfolio_targets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rebalancing_recommendations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "recommendation_date" DATETIME NOT NULL,
    "symbol" TEXT NOT NULL,
    "current_allocation" DECIMAL,
    "target_allocation" DECIMAL,
    "recommended_action" TEXT NOT NULL,
    "recommended_quantity" DECIMAL,
    "estimated_cost" DECIMAL,
    "tax_impact" DECIMAL,
    "priority_score" DECIMAL,
    "reasoning" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "rebalancing_recommendations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "optimization_results" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "optimization_date" DATETIME NOT NULL,
    "optimization_type" TEXT NOT NULL,
    "current_sharpe_ratio" DECIMAL,
    "optimized_sharpe_ratio" DECIMAL,
    "current_risk" DECIMAL,
    "optimized_risk" DECIMAL,
    "improvement_score" DECIMAL,
    "implementation_cost" DECIMAL,
    "results_data" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "optimization_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_benchmark_data" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "price" DECIMAL NOT NULL,
    "daily_return" DECIMAL,
    "cumulative_return" DECIMAL,
    "last_updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_benchmark_data" ("date", "id", "name", "price", "symbol") SELECT "date", "id", "name", "price", "symbol" FROM "benchmark_data";
DROP TABLE "benchmark_data";
ALTER TABLE "new_benchmark_data" RENAME TO "benchmark_data";
CREATE INDEX "benchmark_data_symbol_date_idx" ON "benchmark_data"("symbol", "date");
CREATE TABLE "new_performance_attribution" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "symbol" TEXT NOT NULL,
    "position_return" DECIMAL,
    "contribution" DECIMAL,
    "weight" DECIMAL,
    "sector" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "performance_attribution_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_performance_attribution" ("contribution", "date", "id", "sector", "symbol", "weight") SELECT "contribution", "date", "id", "sector", "symbol", "weight" FROM "performance_attribution";
DROP TABLE "performance_attribution";
ALTER TABLE "new_performance_attribution" RENAME TO "performance_attribution";
CREATE INDEX "performance_attribution_user_id_date_idx" ON "performance_attribution"("user_id", "date");
CREATE INDEX "performance_attribution_symbol_idx" ON "performance_attribution"("symbol");
CREATE TABLE "new_performance_snapshots" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME NOT NULL,
    "total_return" DECIMAL NOT NULL,
    "total_return_percent" DECIMAL NOT NULL,
    "annualized_return" DECIMAL,
    "volatility" DECIMAL,
    "sharpe_ratio" DECIMAL,
    "sortino_ratio" DECIMAL,
    "max_drawdown" DECIMAL,
    "benchmark_return" DECIMAL,
    "benchmark_return_percent" DECIMAL,
    "alpha" DECIMAL,
    "beta" DECIMAL,
    "correlation" DECIMAL,
    "last_updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "performance_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_performance_snapshots" ("alpha", "beta", "correlation", "id", "period", "volatility") SELECT "alpha", "beta", "correlation", "id", "period", "volatility" FROM "performance_snapshots";
DROP TABLE "performance_snapshots";
ALTER TABLE "new_performance_snapshots" RENAME TO "performance_snapshots";
CREATE INDEX "performance_snapshots_user_id_period_idx" ON "performance_snapshots"("user_id", "period");
CREATE UNIQUE INDEX "performance_snapshots_user_id_period_start_date_end_date_key" ON "performance_snapshots"("user_id", "period", "start_date", "end_date");
CREATE TABLE "new_portfolio_performance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "portfolio_value" DECIMAL NOT NULL,
    "daily_return" DECIMAL,
    "cumulative_return" DECIMAL,
    "benchmark_return" DECIMAL,
    "volatility" DECIMAL,
    "sharpe_ratio" DECIMAL,
    "max_drawdown" DECIMAL,
    "win_rate" DECIMAL,
    "avg_win" DECIMAL,
    "avg_loss" DECIMAL,
    "largest_gain" DECIMAL,
    "largest_loss" DECIMAL,
    "consecutive_wins" INTEGER NOT NULL DEFAULT 0,
    "consecutive_losses" INTEGER NOT NULL DEFAULT 0,
    "total_trades" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "portfolio_performance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_portfolio_performance" ("date", "id", "volatility") SELECT "date", "id", "volatility" FROM "portfolio_performance";
DROP TABLE "portfolio_performance";
ALTER TABLE "new_portfolio_performance" RENAME TO "portfolio_performance";
CREATE INDEX "portfolio_performance_user_id_date_idx" ON "portfolio_performance"("user_id", "date");
CREATE INDEX "portfolio_performance_date_idx" ON "portfolio_performance"("date");
CREATE TABLE "new_portfolio_positions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "average_cost" DECIMAL NOT NULL,
    "current_price" DECIMAL,
    "market_value" DECIMAL,
    "unrealized_pnl" DECIMAL,
    "unrealized_pnl_percent" DECIMAL,
    "sector" TEXT,
    "last_updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "portfolio_positions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_portfolio_positions" ("average_cost", "created_at", "current_price", "id", "last_updated", "market_value", "quantity", "sector", "symbol", "unrealized_pnl", "unrealized_pnl_percent", "updated_at", "user_id") SELECT "average_cost", "created_at", "current_price", "id", "last_updated", "market_value", "quantity", "sector", "symbol", "unrealized_pnl", "unrealized_pnl_percent", "updated_at", "user_id" FROM "portfolio_positions";
DROP TABLE "portfolio_positions";
ALTER TABLE "new_portfolio_positions" RENAME TO "portfolio_positions";
CREATE INDEX "portfolio_positions_user_id_symbol_idx" ON "portfolio_positions"("user_id", "symbol");
CREATE INDEX "portfolio_positions_last_updated_idx" ON "portfolio_positions"("last_updated");
CREATE INDEX "portfolio_positions_user_id_last_updated_idx" ON "portfolio_positions"("user_id", "last_updated");
CREATE UNIQUE INDEX "portfolio_positions_user_id_symbol_key" ON "portfolio_positions"("user_id", "symbol");
CREATE TABLE "new_portfolio_summary" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "total_value" DECIMAL NOT NULL,
    "cash_balance" DECIMAL NOT NULL,
    "total_pnl" DECIMAL NOT NULL,
    "total_pnl_percent" DECIMAL NOT NULL,
    "number_of_positions" INTEGER NOT NULL,
    "last_updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "portfolio_summary_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_portfolio_summary" ("cash_balance", "created_at", "id", "last_updated", "number_of_positions", "total_pnl", "total_pnl_percent", "total_value", "updated_at", "user_id") SELECT "cash_balance", "created_at", "id", "last_updated", "number_of_positions", "total_pnl", "total_pnl_percent", "total_value", "updated_at", "user_id" FROM "portfolio_summary";
DROP TABLE "portfolio_summary";
ALTER TABLE "new_portfolio_summary" RENAME TO "portfolio_summary";
CREATE UNIQUE INDEX "portfolio_summary_user_id_key" ON "portfolio_summary"("user_id");
CREATE TABLE "new_risk_management" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "risk_profile" TEXT NOT NULL,
    "risk_score" INTEGER NOT NULL DEFAULT 0,
    "risk_level" TEXT NOT NULL DEFAULT 'LOW',
    "risk_factors" TEXT NOT NULL DEFAULT '{}',
    "risk_limits" TEXT NOT NULL DEFAULT '{}',
    "daily_loss_limit" DECIMAL NOT NULL,
    "weekly_loss_limit" DECIMAL NOT NULL,
    "monthly_loss_limit" DECIMAL NOT NULL,
    "last_assessment" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "next_review" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "risk_management_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_risk_management" ("created_at", "daily_loss_limit", "id", "monthly_loss_limit", "risk_profile", "user_id", "weekly_loss_limit") SELECT "created_at", "daily_loss_limit", "id", "monthly_loss_limit", "risk_profile", "user_id", "weekly_loss_limit" FROM "risk_management";
DROP TABLE "risk_management";
ALTER TABLE "new_risk_management" RENAME TO "risk_management";
CREATE UNIQUE INDEX "risk_management_user_id_key" ON "risk_management"("user_id");
CREATE INDEX "risk_management_next_review_idx" ON "risk_management"("next_review");
CREATE INDEX "risk_management_risk_level_idx" ON "risk_management"("risk_level");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "portfolio_targets_user_id_idx" ON "portfolio_targets"("user_id");

-- CreateIndex
CREATE INDEX "portfolio_targets_user_id_target_type_idx" ON "portfolio_targets"("user_id", "target_type");

-- CreateIndex
CREATE INDEX "rebalancing_recommendations_user_id_idx" ON "rebalancing_recommendations"("user_id");

-- CreateIndex
CREATE INDEX "rebalancing_recommendations_user_id_recommendation_date_idx" ON "rebalancing_recommendations"("user_id", "recommendation_date");

-- CreateIndex
CREATE INDEX "rebalancing_recommendations_status_idx" ON "rebalancing_recommendations"("status");

-- CreateIndex
CREATE INDEX "optimization_results_user_id_idx" ON "optimization_results"("user_id");

-- CreateIndex
CREATE INDEX "optimization_results_user_id_optimization_date_idx" ON "optimization_results"("user_id", "optimization_date");

-- CreateIndex
CREATE INDEX "optimization_results_optimization_type_idx" ON "optimization_results"("optimization_type");

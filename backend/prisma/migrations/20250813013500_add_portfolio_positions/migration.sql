-- CreateTable for Portfolio Positions
CREATE TABLE "portfolio_positions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "average_cost" REAL NOT NULL,
    "current_price" REAL,
    "market_value" REAL,
    "unrealized_pnl" REAL,
    "unrealized_pnl_percent" REAL,
    "sector" TEXT,
    "last_updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "portfolio_positions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable for Portfolio Summary
CREATE TABLE "portfolio_summary" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL UNIQUE,
    "total_value" REAL NOT NULL,
    "cash_balance" REAL NOT NULL,
    "total_pnl" REAL NOT NULL,
    "total_pnl_percent" REAL NOT NULL,
    "number_of_positions" INTEGER NOT NULL,
    "last_updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "portfolio_summary_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndexes for performance optimization
CREATE INDEX "portfolio_positions_user_id_symbol_idx" ON "portfolio_positions"("user_id", "symbol");
CREATE INDEX "portfolio_positions_last_updated_idx" ON "portfolio_positions"("last_updated");
CREATE INDEX "portfolio_positions_user_id_last_updated_idx" ON "portfolio_positions"("user_id", "last_updated");
CREATE UNIQUE INDEX "portfolio_positions_user_id_symbol_key" ON "portfolio_positions"("user_id", "symbol");

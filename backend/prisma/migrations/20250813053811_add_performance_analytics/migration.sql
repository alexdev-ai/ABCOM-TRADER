-- CreateTable: Portfolio Performance Analytics Tables
CREATE TABLE "portfolio_performance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "portfolioValue" DECIMAL NOT NULL,
    "dailyReturn" DECIMAL,
    "cumulativeReturn" DECIMAL,
    "benchmarkReturn" DECIMAL,
    "volatility" DECIMAL,
    "sharpeRatio" DECIMAL,
    "maxDrawdown" DECIMAL,
    "winRate" DECIMAL,
    "avgWin" DECIMAL,
    "avgLoss" DECIMAL,
    "largestGain" DECIMAL,
    "largestLoss" DECIMAL,
    "consecutiveWins" INTEGER DEFAULT 0,
    "consecutiveLosses" INTEGER DEFAULT 0,
    "totalTrades" INTEGER DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "portfolio_performance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: Performance Attribution
CREATE TABLE "performance_attribution" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "symbol" TEXT NOT NULL,
    "positionReturn" DECIMAL,
    "contribution" DECIMAL,
    "weight" DECIMAL,
    "sector" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "performance_attribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: Benchmark Data
CREATE TABLE "benchmark_data" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "price" DECIMAL NOT NULL,
    "dailyReturn" DECIMAL,
    "cumulativeReturn" DECIMAL,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable: Performance Snapshots (for caching)
CREATE TABLE "performance_snapshots" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL, -- '1D', '1W', '1M', '3M', '6M', '1Y', 'YTD', 'ALL'
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "totalReturn" DECIMAL NOT NULL,
    "totalReturnPercent" DECIMAL NOT NULL,
    "annualizedReturn" DECIMAL,
    "volatility" DECIMAL,
    "sharpeRatio" DECIMAL,
    "sortinoRatio" DECIMAL,
    "maxDrawdown" DECIMAL,
    "benchmarkReturn" DECIMAL,
    "benchmarkReturnPercent" DECIMAL,
    "alpha" DECIMAL,
    "beta" DECIMAL,
    "correlation" DECIMAL,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "performance_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndexes
CREATE INDEX "portfolio_performance_userId_date_idx" ON "portfolio_performance"("userId", "date");
CREATE INDEX "portfolio_performance_date_idx" ON "portfolio_performance"("date");
CREATE INDEX "performance_attribution_userId_date_idx" ON "performance_attribution"("userId", "date");
CREATE INDEX "performance_attribution_symbol_idx" ON "performance_attribution"("symbol");
CREATE INDEX "benchmark_data_symbol_date_idx" ON "benchmark_data"("symbol", "date");
CREATE INDEX "performance_snapshots_userId_period_idx" ON "performance_snapshots"("userId", "period");
CREATE UNIQUE INDEX "performance_snapshots_userId_period_dates_key" ON "performance_snapshots"("userId", "period", "startDate", "endDate");

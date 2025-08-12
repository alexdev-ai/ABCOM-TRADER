-- CreateTable
CREATE TABLE "TradingSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "lossLimitAmount" DECIMAL(10,2) NOT NULL,
    "lossLimitPercentage" DECIMAL(5,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startTime" DATETIME,
    "endTime" DATETIME,
    "actualDurationMinutes" INTEGER,
    "totalTrades" INTEGER NOT NULL DEFAULT 0,
    "realizedPnl" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "sessionPerformancePercentage" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "terminationReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TradingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TradingSession_userId_status_idx" ON "TradingSession"("userId", "status");

-- CreateIndex
CREATE INDEX "TradingSession_status_idx" ON "TradingSession"("status");

-- CreateIndex
CREATE INDEX "TradingSession_userId_createdAt_idx" ON "TradingSession"("userId", "createdAt");

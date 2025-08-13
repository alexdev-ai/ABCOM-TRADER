-- CreateTable
CREATE TABLE "algorithm_decisions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "session_id" TEXT,
    "symbol" TEXT NOT NULL,
    "decision_type" TEXT NOT NULL,
    "confidence" DECIMAL NOT NULL,
    "reasoning" TEXT,
    "market_condition" TEXT,
    "volatility_index" DECIMAL,
    "risk_score" DECIMAL,
    "position_size" DECIMAL,
    "entry_price" DECIMAL,
    "stop_loss" DECIMAL,
    "take_profit" DECIMAL,
    "technical_indicators" TEXT,
    "fundamental_data" TEXT,
    "is_executed" BOOLEAN NOT NULL DEFAULT false,
    "executed_at" DATETIME,
    "execution_price" DECIMAL,
    "actual_quantity" DECIMAL,
    "outcome" TEXT,
    "profit_loss" DECIMAL,
    "profit_loss_percent" DECIMAL,
    "holding_duration" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "algorithm_decisions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "algorithm_decisions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "trading_sessions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "algorithm_performance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "date" DATETIME NOT NULL,
    "timeframe" TEXT NOT NULL DEFAULT 'daily',
    "total_decisions" INTEGER NOT NULL DEFAULT 0,
    "executed_decisions" INTEGER NOT NULL DEFAULT 0,
    "win_count" INTEGER NOT NULL DEFAULT 0,
    "loss_count" INTEGER NOT NULL DEFAULT 0,
    "break_even_count" INTEGER NOT NULL DEFAULT 0,
    "win_rate" DECIMAL,
    "avg_win" DECIMAL,
    "avg_loss" DECIMAL,
    "avg_holding_time" DECIMAL,
    "total_profit_loss" DECIMAL,
    "return_percentage" DECIMAL,
    "avg_confidence" DECIMAL,
    "high_confidence_win_rate" DECIMAL,
    "low_confidence_win_rate" DECIMAL,
    "sharpe_ratio" DECIMAL,
    "max_drawdown" DECIMAL,
    "volatility" DECIMAL,
    "bull_market_performance" DECIMAL,
    "bear_market_performance" DECIMAL,
    "sideways_performance" DECIMAL,
    "volatile_performance" DECIMAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "algorithm_performance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "market_conditions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "overall_condition" TEXT NOT NULL,
    "trend_strength" DECIMAL,
    "volatility_index" DECIMAL,
    "market_sentiment" TEXT,
    "spy_price" DECIMAL,
    "spy_change" DECIMAL,
    "spy_change_percent" DECIMAL,
    "volume" BIGINT,
    "sma_20" DECIMAL,
    "sma_50" DECIMAL,
    "sma_200" DECIMAL,
    "rsi" DECIMAL,
    "macd" DECIMAL,
    "boll_band_upper" DECIMAL,
    "boll_band_lower" DECIMAL,
    "advance_decline_ratio" DECIMAL,
    "new_highs_news" INTEGER,
    "sector_rotation" TEXT,
    "analysis_version" TEXT,
    "data_quality" TEXT NOT NULL DEFAULT 'good',
    "confidence" DECIMAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "algorithm_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "parameters" TEXT NOT NULL,
    "risk_parameters" TEXT NOT NULL,
    "market_condition_weights" TEXT NOT NULL,
    "min_confidence_threshold" DECIMAL NOT NULL DEFAULT 50,
    "max_position_size" DECIMAL NOT NULL DEFAULT 0.1,
    "stop_loss_percent" DECIMAL NOT NULL DEFAULT 5,
    "take_profit_percent" DECIMAL NOT NULL DEFAULT 10,
    "enable_technical_analysis" BOOLEAN NOT NULL DEFAULT true,
    "enable_fundamental_analysis" BOOLEAN NOT NULL DEFAULT true,
    "enable_sentiment_analysis" BOOLEAN NOT NULL DEFAULT true,
    "enable_risk_management" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "algorithm_decisions_user_id_idx" ON "algorithm_decisions"("user_id");

-- CreateIndex
CREATE INDEX "algorithm_decisions_user_id_created_at_idx" ON "algorithm_decisions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "algorithm_decisions_symbol_idx" ON "algorithm_decisions"("symbol");

-- CreateIndex
CREATE INDEX "algorithm_decisions_decision_type_idx" ON "algorithm_decisions"("decision_type");

-- CreateIndex
CREATE INDEX "algorithm_decisions_is_executed_idx" ON "algorithm_decisions"("is_executed");

-- CreateIndex
CREATE INDEX "algorithm_decisions_outcome_idx" ON "algorithm_decisions"("outcome");

-- CreateIndex
CREATE INDEX "algorithm_decisions_session_id_idx" ON "algorithm_decisions"("session_id");

-- CreateIndex
CREATE INDEX "algorithm_performance_user_id_date_idx" ON "algorithm_performance"("user_id", "date");

-- CreateIndex
CREATE INDEX "algorithm_performance_date_idx" ON "algorithm_performance"("date");

-- CreateIndex
CREATE INDEX "algorithm_performance_timeframe_idx" ON "algorithm_performance"("timeframe");

-- CreateIndex
CREATE INDEX "market_conditions_timestamp_idx" ON "market_conditions"("timestamp");

-- CreateIndex
CREATE INDEX "market_conditions_overall_condition_idx" ON "market_conditions"("overall_condition");

-- CreateIndex
CREATE INDEX "market_conditions_timestamp_overall_condition_idx" ON "market_conditions"("timestamp", "overall_condition");

-- CreateIndex
CREATE UNIQUE INDEX "algorithm_configs_name_key" ON "algorithm_configs"("name");

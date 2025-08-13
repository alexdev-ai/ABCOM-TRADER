-- CreateTable for Portfolio Positions
CREATE TABLE "portfolio_positions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "symbol" VARCHAR(10) NOT NULL,
    "quantity" DECIMAL(15,6) NOT NULL,
    "average_cost" DECIMAL(15,4) NOT NULL,
    "current_price" DECIMAL(15,4),
    "market_value" DECIMAL(15,2),
    "unrealized_pnl" DECIMAL(15,2),
    "unrealized_pnl_percent" DECIMAL(8,4),
    "sector" VARCHAR(50),
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable for Portfolio Summary
CREATE TABLE "portfolio_summary" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "total_value" DECIMAL(15,2) NOT NULL,
    "cash_balance" DECIMAL(15,2) NOT NULL,
    "total_pnl" DECIMAL(15,2) NOT NULL,
    "total_pnl_percent" DECIMAL(8,4) NOT NULL,
    "number_of_positions" INTEGER NOT NULL,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_summary_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes for performance optimization
CREATE INDEX "idx_portfolio_positions_user_symbol" ON "portfolio_positions"("user_id", "symbol");
CREATE INDEX "idx_portfolio_positions_updated" ON "portfolio_positions"("last_updated");
CREATE INDEX "idx_portfolio_positions_user_updated" ON "portfolio_positions"("user_id", "last_updated" DESC);
CREATE UNIQUE INDEX "idx_portfolio_summary_user" ON "portfolio_summary"("user_id");

-- Add Foreign Key Constraints
ALTER TABLE "portfolio_positions" ADD CONSTRAINT "portfolio_positions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "portfolio_summary" ADD CONSTRAINT "portfolio_summary_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

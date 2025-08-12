-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "reference_id" TEXT,
    "description" TEXT,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "holdings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "average_cost" DECIMAL NOT NULL,
    "total_cost" DECIMAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "holdings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "price" DECIMAL NOT NULL,
    "total_amount" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "executed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "stock_prices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "price" DECIMAL NOT NULL,
    "change" DECIMAL NOT NULL DEFAULT 0.00,
    "change_percent" DECIMAL NOT NULL DEFAULT 0.00,
    "volume" INTEGER NOT NULL DEFAULT 0,
    "last_updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "transactions_user_id_type_idx" ON "transactions"("user_id", "type");

-- CreateIndex
CREATE INDEX "transactions_user_id_created_at_idx" ON "transactions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "holdings_user_id_idx" ON "holdings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "holdings_user_id_symbol_key" ON "holdings"("user_id", "symbol");

-- CreateIndex
CREATE INDEX "orders_user_id_created_at_idx" ON "orders"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "orders_symbol_idx" ON "orders"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "stock_prices_symbol_key" ON "stock_prices"("symbol");

-- CreateIndex
CREATE INDEX "stock_prices_symbol_idx" ON "stock_prices"("symbol");

-- CreateIndex
CREATE INDEX "stock_prices_last_updated_idx" ON "stock_prices"("last_updated");

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "date_of_birth" DATETIME NOT NULL,
    "phone_number" TEXT NOT NULL,
    "account_balance" DECIMAL NOT NULL DEFAULT 0.0000,
    "risk_tolerance" TEXT NOT NULL,
    "kyc_status" TEXT NOT NULL DEFAULT 'pending',
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "onboarding_step" INTEGER NOT NULL DEFAULT 0,
    "onboarding_completed_at" DATETIME,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_users" ("account_balance", "created_at", "date_of_birth", "email", "first_name", "id", "is_active", "kyc_status", "last_name", "password_hash", "phone_number", "risk_tolerance", "updated_at") SELECT "account_balance", "created_at", "date_of_birth", "email", "first_name", "id", "is_active", "kyc_status", "last_name", "password_hash", "phone_number", "risk_tolerance", "updated_at" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "email" TEXT,
ADD COLUMN "passwordHash" TEXT;

-- Backfill existing rows so NOT NULL constraints can be applied
UPDATE "User"
SET
  "email" = 'user_' || "id" || '@placeholder.local',
  "passwordHash" = ''
WHERE "email" IS NULL OR "passwordHash" IS NULL;

-- Make columns required
ALTER TABLE "User" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "passwordHash" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

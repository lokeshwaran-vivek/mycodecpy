/*
  Warnings:

  - You are about to drop the column `error` on the `ComplianceResult` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ComplianceResult" DROP COLUMN "error",
ADD COLUMN     "errors" JSONB;

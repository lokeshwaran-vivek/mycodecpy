-- AlterTable
ALTER TABLE "ComplianceResult" ADD COLUMN     "config" JSONB;

-- AlterTable
ALTER TABLE "ComplianceTest" ADD COLUMN     "config" JSONB;

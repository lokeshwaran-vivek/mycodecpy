/*
  Warnings:

  - You are about to drop the `ComplianceTest` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "AnalysisStatus" ADD VALUE 'QUEUED';

-- DropForeignKey
ALTER TABLE "ComplianceResult" DROP CONSTRAINT "ComplianceResult_testId_fkey";

-- DropTable
DROP TABLE "ComplianceTest";

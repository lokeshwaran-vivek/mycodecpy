/*
  Warnings:

  - You are about to drop the `BusinessProject` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BusinessProject" DROP CONSTRAINT "BusinessProject_businessId_fkey";

-- DropForeignKey
ALTER TABLE "BusinessProject" DROP CONSTRAINT "BusinessProject_projectId_fkey";

-- AlterTable
ALTER TABLE "Template" ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'ACTIVE';

-- DropTable
DROP TABLE "BusinessProject";

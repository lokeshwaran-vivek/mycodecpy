-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('PROPRIETOR_FIRM', 'PARTNERSHIP_FIRM', 'CONSULTANCY_COMPANY');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "businessType" "BusinessType" NOT NULL DEFAULT 'PROPRIETOR_FIRM';

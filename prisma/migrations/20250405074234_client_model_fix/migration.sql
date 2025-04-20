/*
  Warnings:

  - You are about to drop the column `cin` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `gst` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `industry` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Client` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ClientClass" AS ENUM ('PRIVATE', 'PUBLIC_LISTED', 'PCAOB', 'OTHERS');

-- AlterTable
ALTER TABLE "Client" DROP COLUMN "cin",
DROP COLUMN "country",
DROP COLUMN "gst",
DROP COLUMN "industry",
DROP COLUMN "phone",
DROP COLUMN "state",
DROP COLUMN "type",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "class" "ClientClass" NOT NULL DEFAULT 'PRIVATE',
ADD COLUMN     "clientRiskCategory" TEXT,
ADD COLUMN     "contactPersonEmail" TEXT,
ADD COLUMN     "contactPersonName" TEXT,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "regulatoryLicenseNumber" TEXT,
ADD COLUMN     "taxRegistrationNumber" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "type" SET DEFAULT 'BUSINESS';

-- DropEnum
DROP TYPE "ClientType";

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

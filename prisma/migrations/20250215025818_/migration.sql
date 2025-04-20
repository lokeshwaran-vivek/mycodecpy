/*
  Warnings:

  - You are about to drop the column `email` on the `Business` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Business` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Business_email_key";

-- AlterTable
ALTER TABLE "Business" DROP COLUMN "email",
DROP COLUMN "phone";

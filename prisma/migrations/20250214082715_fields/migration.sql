/*
  Warnings:

  - You are about to drop the column `templateId` on the `Field` table. All the data in the column will be lost.
  - Added the required column `fields` to the `Template` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Field" DROP CONSTRAINT "Field_templateId_fkey";

-- AlterTable
ALTER TABLE "Field" DROP COLUMN "templateId";

-- AlterTable
ALTER TABLE "Template" ADD COLUMN     "fields" JSONB NOT NULL;

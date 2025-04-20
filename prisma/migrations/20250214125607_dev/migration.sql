/*
  Warnings:

  - The `fields` column on the `Template` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Template" DROP COLUMN "fields",
ADD COLUMN     "fields" JSONB[];

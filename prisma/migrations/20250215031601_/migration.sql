/*
  Warnings:

  - Made the column `gst` on table `Business` required. This step will fail if there are existing NULL values in that column.
  - Made the column `cin` on table `Business` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Business" ALTER COLUMN "gst" SET NOT NULL,
ALTER COLUMN "cin" SET NOT NULL;

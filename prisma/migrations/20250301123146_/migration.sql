-- AlterTable
ALTER TABLE "Analysis" ADD COLUMN     "businessId" TEXT;

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

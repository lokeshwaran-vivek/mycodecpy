-- AlterTable
ALTER TABLE "Analysis" ADD COLUMN     "ranByUserId" TEXT;

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_ranByUserId_fkey" FOREIGN KEY ("ranByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

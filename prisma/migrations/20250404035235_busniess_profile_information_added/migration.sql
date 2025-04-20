-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "employeesSize" TEXT,
ADD COLUMN     "establishedDate" TIMESTAMP(3),
ADD COLUMN     "keyAchievements" TEXT,
ADD COLUMN     "location" TEXT;

-- CreateTable
CREATE TABLE "BusinessAttachment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "businessId" TEXT,

    CONSTRAINT "BusinessAttachment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BusinessAttachment" ADD CONSTRAINT "BusinessAttachment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

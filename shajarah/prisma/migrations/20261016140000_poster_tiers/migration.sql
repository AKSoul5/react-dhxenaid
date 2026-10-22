-- AlterTable
ALTER TABLE "FamilyTree" ADD COLUMN     "soilText" TEXT,
ADD COLUMN     "trunkStartId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "FamilyTree_trunkStartId_key" ON "FamilyTree"("trunkStartId");

-- AddForeignKey
ALTER TABLE "FamilyTree" ADD CONSTRAINT "FamilyTree_trunkStartId_fkey" FOREIGN KEY ("trunkStartId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;


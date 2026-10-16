-- AlterTable
ALTER TABLE "FamilyTree" ADD COLUMN     "crownBaseId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "FamilyTree_crownBaseId_key" ON "FamilyTree"("crownBaseId");

-- AddForeignKey
ALTER TABLE "FamilyTree" ADD CONSTRAINT "FamilyTree_crownBaseId_fkey" FOREIGN KEY ("crownBaseId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;


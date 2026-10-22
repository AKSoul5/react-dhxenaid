-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "Lineage" AS ENUM ('PATRILINEAL', 'MATRILINEAL');

-- CreateTable
CREATE TABLE "FamilyTree" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "lineage" "Lineage" NOT NULL DEFAULT 'PATRILINEAL',
    "rootMemberId" TEXT,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyTree_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "laqab" TEXT,
    "gender" "Gender" NOT NULL DEFAULT 'MALE',
    "birthYear" INTEGER,
    "deathYear" INTEGER,
    "isDeceased" BOOLEAN NOT NULL DEFAULT false,
    "birthOrder" INTEGER NOT NULL DEFAULT 0,
    "generation" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "fatherId" TEXT,
    "motherId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Marriage" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "spouseAId" TEXT NOT NULL,
    "spouseBId" TEXT NOT NULL,
    "startYear" INTEGER,
    "endYear" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Marriage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FamilyTree_rootMemberId_key" ON "FamilyTree"("rootMemberId");

-- CreateIndex
CREATE INDEX "Member_treeId_idx" ON "Member"("treeId");

-- CreateIndex
CREATE INDEX "Member_fatherId_idx" ON "Member"("fatherId");

-- CreateIndex
CREATE INDEX "Member_motherId_idx" ON "Member"("motherId");

-- CreateIndex
CREATE INDEX "Member_treeId_generation_idx" ON "Member"("treeId", "generation");

-- CreateIndex
CREATE INDEX "Marriage_treeId_idx" ON "Marriage"("treeId");

-- CreateIndex
CREATE UNIQUE INDEX "Marriage_spouseAId_spouseBId_key" ON "Marriage"("spouseAId", "spouseBId");

-- AddForeignKey
ALTER TABLE "FamilyTree" ADD CONSTRAINT "FamilyTree_rootMemberId_fkey" FOREIGN KEY ("rootMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "FamilyTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_fatherId_fkey" FOREIGN KEY ("fatherId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Marriage" ADD CONSTRAINT "Marriage_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "FamilyTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Marriage" ADD CONSTRAINT "Marriage_spouseAId_fkey" FOREIGN KEY ("spouseAId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Marriage" ADD CONSTRAINT "Marriage_spouseBId_fkey" FOREIGN KEY ("spouseBId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

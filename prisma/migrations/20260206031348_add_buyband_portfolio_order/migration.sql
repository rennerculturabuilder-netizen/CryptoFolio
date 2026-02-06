/*
  Warnings:

  - Added the required column `portfolioId` to the `BuyBand` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BuyBand" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "portfolioId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "BuyBand_portfolioId_idx" ON "BuyBand"("portfolioId");

-- AddForeignKey
ALTER TABLE "BuyBand" ADD CONSTRAINT "BuyBand_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "PreOrder" (
    "id" TEXT NOT NULL,
    "targetPrice" DECIMAL(18,8) NOT NULL,
    "value" DECIMAL(18,8) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "executed" BOOLEAN NOT NULL DEFAULT false,
    "zoneOrder" INTEGER NOT NULL,
    "assetSymbol" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "dcaZoneId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PreOrder_portfolioId_idx" ON "PreOrder"("portfolioId");

-- CreateIndex
CREATE INDEX "PreOrder_assetSymbol_idx" ON "PreOrder"("assetSymbol");

-- CreateIndex
CREATE INDEX "PreOrder_active_idx" ON "PreOrder"("active");

-- AddForeignKey
ALTER TABLE "PreOrder" ADD CONSTRAINT "PreOrder_dcaZoneId_fkey" FOREIGN KEY ("dcaZoneId") REFERENCES "DcaZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

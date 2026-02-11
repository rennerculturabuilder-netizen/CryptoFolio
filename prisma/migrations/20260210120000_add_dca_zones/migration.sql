-- CreateTable
CREATE TABLE "DcaZone" (
    "id" TEXT NOT NULL,
    "priceMin" DECIMAL(18,8) NOT NULL,
    "priceMax" DECIMAL(18,8) NOT NULL,
    "percentualBase" DECIMAL(5,2) NOT NULL,
    "label" TEXT,
    "order" INTEGER NOT NULL DEFAULT 1,
    "executed" BOOLEAN NOT NULL DEFAULT false,
    "assetSymbol" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DcaZone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DcaZone_portfolioId_idx" ON "DcaZone"("portfolioId");

-- CreateIndex
CREATE UNIQUE INDEX "DcaZone_portfolioId_assetSymbol_order_key" ON "DcaZone"("portfolioId", "assetSymbol", "order");

-- AddForeignKey
ALTER TABLE "DcaZone" ADD CONSTRAINT "DcaZone_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseFiat" TEXT NOT NULL DEFAULT 'USD',
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,
    "notes" TEXT,
    "baseAssetId" TEXT,
    "baseQty" DECIMAL(18,8),
    "quoteAssetId" TEXT,
    "quoteQty" DECIMAL(18,8),
    "price" DECIMAL(18,8),
    "feeAssetId" TEXT,
    "feeQty" DECIMAL(18,8),
    "costBasisUsd" DECIMAL(18,8),
    "valueUsd" DECIMAL(18,8),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceSnapshot" (
    "id" TEXT NOT NULL,
    "price" DECIMAL(18,8) NOT NULL,
    "assetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyBand" (
    "id" TEXT NOT NULL,
    "targetPrice" DECIMAL(18,8) NOT NULL,
    "quantity" DECIMAL(18,8) NOT NULL,
    "executed" BOOLEAN NOT NULL DEFAULT false,
    "assetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyBand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Portfolio_ownerId_idx" ON "Portfolio"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_symbol_key" ON "Asset"("symbol");

-- CreateIndex
CREATE INDEX "Transaction_portfolioId_idx" ON "Transaction"("portfolioId");

-- CreateIndex
CREATE INDEX "Transaction_baseAssetId_idx" ON "Transaction"("baseAssetId");

-- CreateIndex
CREATE INDEX "Transaction_quoteAssetId_idx" ON "Transaction"("quoteAssetId");

-- CreateIndex
CREATE INDEX "Transaction_timestamp_idx" ON "Transaction"("timestamp");

-- CreateIndex
CREATE INDEX "PriceSnapshot_assetId_idx" ON "PriceSnapshot"("assetId");

-- CreateIndex
CREATE INDEX "PriceSnapshot_createdAt_idx" ON "PriceSnapshot"("createdAt");

-- CreateIndex
CREATE INDEX "BuyBand_assetId_idx" ON "BuyBand"("assetId");

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_baseAssetId_fkey" FOREIGN KEY ("baseAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_quoteAssetId_fkey" FOREIGN KEY ("quoteAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_feeAssetId_fkey" FOREIGN KEY ("feeAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceSnapshot" ADD CONSTRAINT "PriceSnapshot_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyBand" ADD CONSTRAINT "BuyBand_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

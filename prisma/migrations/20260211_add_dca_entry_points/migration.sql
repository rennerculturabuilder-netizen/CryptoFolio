-- CreateTable
CREATE TABLE "DcaEntryPoint" (
    "id" TEXT NOT NULL,
    "targetPrice" DECIMAL(18,8) NOT NULL,
    "value" DECIMAL(18,8) NOT NULL,
    "preOrderPlaced" BOOLEAN NOT NULL DEFAULT false,
    "purchaseConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(3),
    "zoneOrder" INTEGER NOT NULL,
    "dcaZoneId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DcaEntryPoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DcaEntryPoint_dcaZoneId_idx" ON "DcaEntryPoint"("dcaZoneId");

-- CreateIndex
CREATE INDEX "DcaEntryPoint_preOrderPlaced_idx" ON "DcaEntryPoint"("preOrderPlaced");

-- CreateIndex
CREATE INDEX "DcaEntryPoint_purchaseConfirmed_idx" ON "DcaEntryPoint"("purchaseConfirmed");

-- AddForeignKey
ALTER TABLE "DcaEntryPoint" ADD CONSTRAINT "DcaEntryPoint_dcaZoneId_fkey" FOREIGN KEY ("dcaZoneId") REFERENCES "DcaZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

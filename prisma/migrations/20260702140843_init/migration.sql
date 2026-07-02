-- CreateEnum
CREATE TYPE "Restaurant" AS ENUM ('A', 'B');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('GRAIN', 'KIMCHI', 'PRODUCE', 'PROCESSED', 'MEAT');

-- CreateEnum
CREATE TYPE "SlipStatus" AS ENUM ('DRAFT', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('EXACT', 'FUZZY_CONFIRMED', 'NONE');

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "businessNo" TEXT,
    "contact" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "title" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractItem" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliverySlip" (
    "id" TEXT NOT NULL,
    "restaurant" "Restaurant" NOT NULL,
    "vendorId" TEXT NOT NULL,
    "deliveryDate" TIMESTAMP(3) NOT NULL,
    "status" "SlipStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceType" TEXT NOT NULL DEFAULT 'MANUAL',
    "sourceFileUrl" TEXT,
    "ocrRawResponse" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliverySlip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliverySlipItem" (
    "id" TEXT NOT NULL,
    "slipId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" "Category",
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "matchedContractItemId" TEXT,
    "matchType" "MatchType" NOT NULL DEFAULT 'NONE',
    "priceOverridden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliverySlipItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vendor_name_idx" ON "Vendor"("name");

-- CreateIndex
CREATE INDEX "Contract_vendorId_idx" ON "Contract"("vendorId");

-- CreateIndex
CREATE INDEX "Contract_startDate_endDate_idx" ON "Contract"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "ContractItem_contractId_itemName_idx" ON "ContractItem"("contractId", "itemName");

-- CreateIndex
CREATE INDEX "ContractItem_itemName_idx" ON "ContractItem"("itemName");

-- CreateIndex
CREATE INDEX "DeliverySlip_restaurant_deliveryDate_idx" ON "DeliverySlip"("restaurant", "deliveryDate");

-- CreateIndex
CREATE INDEX "DeliverySlip_vendorId_deliveryDate_idx" ON "DeliverySlip"("vendorId", "deliveryDate");

-- CreateIndex
CREATE INDEX "DeliverySlip_status_idx" ON "DeliverySlip"("status");

-- CreateIndex
CREATE INDEX "DeliverySlipItem_slipId_idx" ON "DeliverySlipItem"("slipId");

-- CreateIndex
CREATE INDEX "DeliverySlipItem_itemName_category_idx" ON "DeliverySlipItem"("itemName", "category");

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractItem" ADD CONSTRAINT "ContractItem_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliverySlip" ADD CONSTRAINT "DeliverySlip_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliverySlipItem" ADD CONSTRAINT "DeliverySlipItem_slipId_fkey" FOREIGN KEY ("slipId") REFERENCES "DeliverySlip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

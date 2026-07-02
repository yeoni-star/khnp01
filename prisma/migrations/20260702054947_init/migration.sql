-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "businessNo" TEXT,
    "contact" TEXT,
    "memo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurant" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "title" TEXT,
    "memo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contract_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContractItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contractId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContractItem_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeliverySlip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurant" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "deliveryDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sourceType" TEXT NOT NULL DEFAULT 'MANUAL',
    "sourceFileUrl" TEXT,
    "ocrRawResponse" TEXT,
    "confirmedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeliverySlip_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeliverySlipItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slipId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "matchedContractItemId" TEXT,
    "matchType" TEXT NOT NULL DEFAULT 'NONE',
    "priceOverridden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeliverySlipItem_slipId_fkey" FOREIGN KEY ("slipId") REFERENCES "DeliverySlip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Vendor_name_idx" ON "Vendor"("name");

-- CreateIndex
CREATE INDEX "Contract_restaurant_vendorId_idx" ON "Contract"("restaurant", "vendorId");

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

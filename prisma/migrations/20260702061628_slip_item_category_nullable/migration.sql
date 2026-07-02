-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DeliverySlipItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slipId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" TEXT,
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
INSERT INTO "new_DeliverySlipItem" ("amount", "category", "createdAt", "id", "itemName", "matchType", "matchedContractItemId", "priceOverridden", "quantity", "slipId", "unit", "unitPrice", "updatedAt") SELECT "amount", "category", "createdAt", "id", "itemName", "matchType", "matchedContractItemId", "priceOverridden", "quantity", "slipId", "unit", "unitPrice", "updatedAt" FROM "DeliverySlipItem";
DROP TABLE "DeliverySlipItem";
ALTER TABLE "new_DeliverySlipItem" RENAME TO "DeliverySlipItem";
CREATE INDEX "DeliverySlipItem_slipId_idx" ON "DeliverySlipItem"("slipId");
CREATE INDEX "DeliverySlipItem_itemName_category_idx" ON "DeliverySlipItem"("itemName", "category");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

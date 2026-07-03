-- CreateTable
CREATE TABLE "InspectionTemplate" (
    "id" TEXT NOT NULL,
    "restaurant" "Restaurant" NOT NULL,
    "columns" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspectionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionLog" (
    "id" TEXT NOT NULL,
    "restaurant" "Restaurant" NOT NULL,
    "logDate" TIMESTAMP(3) NOT NULL,
    "inspectorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspectionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionLogRow" (
    "id" TEXT NOT NULL,
    "logId" TEXT NOT NULL,
    "sourceItemId" TEXT,
    "itemName" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "vendorName" TEXT NOT NULL,
    "values" JSONB NOT NULL DEFAULT '{}',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspectionLogRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InspectionTemplate_restaurant_key" ON "InspectionTemplate"("restaurant");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionLog_restaurant_logDate_key" ON "InspectionLog"("restaurant", "logDate");

-- CreateIndex
CREATE INDEX "InspectionLogRow_logId_idx" ON "InspectionLogRow"("logId");

-- AddForeignKey
ALTER TABLE "InspectionLogRow" ADD CONSTRAINT "InspectionLogRow_logId_fkey" FOREIGN KEY ("logId") REFERENCES "InspectionLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;


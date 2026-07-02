-- AlterTable
ALTER TABLE "Contract" ADD COLUMN "category" "Category" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_name_key" ON "Vendor"("name");

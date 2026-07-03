-- CreateEnum
CREATE TYPE "TaxType" AS ENUM ('EXEMPT', 'TAXABLE');

-- AlterTable
ALTER TABLE "DeliverySlip" ADD COLUMN "taxType" "TaxType" NOT NULL DEFAULT 'TAXABLE';

-- AlterTable
ALTER TABLE "DeliverySlipItem" ADD COLUMN "taxAmount" INTEGER;


-- CreateEnum
CREATE TYPE "InspectionLogStatus" AS ENUM ('DRAFT', 'CONFIRMED');

-- AlterTable
ALTER TABLE "InspectionLog" ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "status" "InspectionLogStatus" NOT NULL DEFAULT 'DRAFT';


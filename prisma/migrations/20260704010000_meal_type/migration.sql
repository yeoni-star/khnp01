-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('LUNCH', 'DINNER');

-- AlterTable
ALTER TABLE "MealRegistration" ADD COLUMN     "mealType" "MealType" NOT NULL;


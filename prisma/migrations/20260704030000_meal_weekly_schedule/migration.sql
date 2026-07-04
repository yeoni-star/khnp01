-- DropTable
DROP TABLE "MealAcceptanceSetting";

-- CreateTable
CREATE TABLE "MealWeeklySchedule" (
    "id" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "restaurant" "Restaurant" NOT NULL,
    "mealType" "MealType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealWeeklySchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MealWeeklySchedule_dayOfWeek_restaurant_mealType_key" ON "MealWeeklySchedule"("dayOfWeek", "restaurant", "mealType");


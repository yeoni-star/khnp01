-- DropTable
DROP TABLE "MealWeeklySchedule";

-- CreateTable
CREATE TABLE "MealDailySchedule" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "restaurant" "Restaurant" NOT NULL,
    "mealType" "MealType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealDailySchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MealDailySchedule_date_idx" ON "MealDailySchedule"("date");

-- CreateIndex
CREATE UNIQUE INDEX "MealDailySchedule_date_restaurant_mealType_key" ON "MealDailySchedule"("date", "restaurant", "mealType");


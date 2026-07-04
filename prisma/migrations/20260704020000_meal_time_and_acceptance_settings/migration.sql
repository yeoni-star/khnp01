-- CreateTable
CREATE TABLE "MealTimeSettings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "lunchStart" TEXT NOT NULL DEFAULT '11:00',
    "lunchEnd" TEXT NOT NULL DEFAULT '13:30',
    "dinnerStart" TEXT NOT NULL DEFAULT '17:00',
    "dinnerEnd" TEXT NOT NULL DEFAULT '19:30',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealTimeSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealAcceptanceSetting" (
    "id" TEXT NOT NULL,
    "restaurant" "Restaurant" NOT NULL,
    "mealType" "MealType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealAcceptanceSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MealAcceptanceSetting_restaurant_mealType_key" ON "MealAcceptanceSetting"("restaurant", "mealType");


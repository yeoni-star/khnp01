-- CreateTable
CREATE TABLE "MealCompany" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pricePerMeal" INTEGER NOT NULL,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealRegistration" (
    "id" TEXT NOT NULL,
    "restaurant" "Restaurant" NOT NULL,
    "companyId" TEXT NOT NULL,
    "submitterName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "mealDate" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MealRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MealCompany_name_key" ON "MealCompany"("name");

-- CreateIndex
CREATE INDEX "MealCompany_name_idx" ON "MealCompany"("name");

-- CreateIndex
CREATE INDEX "MealRegistration_restaurant_mealDate_idx" ON "MealRegistration"("restaurant", "mealDate");

-- CreateIndex
CREATE INDEX "MealRegistration_companyId_mealDate_idx" ON "MealRegistration"("companyId", "mealDate");

-- AddForeignKey
ALTER TABLE "MealRegistration" ADD CONSTRAINT "MealRegistration_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "MealCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


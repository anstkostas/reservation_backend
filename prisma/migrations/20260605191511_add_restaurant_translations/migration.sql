-- CreateTable
CREATE TABLE "restaurant_translations" (
    "id" UUID NOT NULL,
    "restaurantId" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "description" TEXT,

    CONSTRAINT "restaurant_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_translations_restaurantId_locale_key" ON "restaurant_translations"("restaurantId", "locale");

-- AddForeignKey
ALTER TABLE "restaurant_translations" ADD CONSTRAINT "restaurant_translations_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

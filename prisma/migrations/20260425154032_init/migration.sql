-- CreateEnum
CREATE TYPE "Role" AS ENUM ('customer', 'owner');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('active', 'canceled', 'completed', 'no-show');

-- CreateTable
CREATE TABLE "Users" (
    "id" UUID NOT NULL,
    "firstname" VARCHAR(100) NOT NULL,
    "lastname" VARCHAR(100) NOT NULL,
    "email" VARCHAR(50) NOT NULL,
    "password" VARCHAR(100) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'customer',

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Restaurants" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "logoUrl" TEXT NOT NULL,
    "coverImageUrl" TEXT NOT NULL,
    "ownerId" UUID,

    CONSTRAINT "Restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservations" (
    "id" UUID NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "people" INTEGER NOT NULL DEFAULT 1,
    "status" "ReservationStatus" NOT NULL DEFAULT 'active',
    "restaurantId" UUID NOT NULL,
    "customerId" UUID NOT NULL,

    CONSTRAINT "Reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Restaurants_ownerId_key" ON "Restaurants"("ownerId");

-- AddForeignKey
ALTER TABLE "Restaurants" ADD CONSTRAINT "Restaurants_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservations" ADD CONSTRAINT "Reservations_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservations" ADD CONSTRAINT "Reservations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

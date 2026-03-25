/*
  Warnings:

  - You are about to drop the column `date` on the `Reservations` table. All the data in the column will be lost.
  - You are about to drop the column `time` on the `Reservations` table. All the data in the column will be lost.
  - Added the required column `scheduledAt` to the `Reservations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Reservations" DROP COLUMN "date",
DROP COLUMN "time",
ADD COLUMN     "scheduledAt" TIMESTAMP(3) NOT NULL;

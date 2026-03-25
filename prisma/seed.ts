import bcrypt from "bcryptjs";
import { Role, ReservationStatus } from "../src/generated/prisma/index.js";
import { prisma } from "../src/config/prismaClient.js";
import { SALT_ROUNDS } from "../src/constants/index.js";

/**
 * Returns a random scheduledAt within ±2 months of now, with a random
 * hour between 15:00 and 23:00, and whether it falls in the past.
 */
function getRandomScheduledAt(): { scheduledAt: Date; inPast: boolean } {
  const now = new Date();
  const twoMonths = 60 * 24 * 60 * 60 * 1000;
  const randomOffset = Math.floor(Math.random() * (2 * twoMonths + 1)) - twoMonths;
  const scheduledAt = new Date(now.getTime() + randomOffset);
  const hour = 19 + Math.floor(Math.random() * 9) - 4; // 15–23
  scheduledAt.setHours(hour, 0, 0, 0);
  return { scheduledAt, inPast: scheduledAt < now };
}

async function main(): Promise<void> {
  const passwordHash = (password: string): Promise<string> =>
    bcrypt.hash(password, SALT_ROUNDS);

  // --- Users ---
  await prisma.user.createMany({
    data: [
      { firstname: "Owner", lastname: "One", email: "owner1@restaurant.com", password: await passwordHash("rest123"), role: Role.owner },
      { firstname: "Owner", lastname: "Two", email: "owner2@restaurant.com", password: await passwordHash("rest123"), role: Role.owner },
      { firstname: "Owner", lastname: "Three", email: "owner3@restaurant.com", password: await passwordHash("rest123"), role: Role.owner },
      { firstname: "Owner", lastname: "Four", email: "owner4@restaurant.com", password: await passwordHash("rest123"), role: Role.owner },
      { firstname: "Owner", lastname: "Five", email: "owner5@restaurant.com", password: await passwordHash("rest123"), role: Role.owner },
      { firstname: "Owner", lastname: "Six", email: "owner6@restaurant.com", password: await passwordHash("rest123"), role: Role.owner },
      { firstname: "Customer", lastname: "One", email: "customer1@test.com", password: await passwordHash("cust123"), role: Role.customer },
      { firstname: "Customer", lastname: "Two", email: "customer2@test.com", password: await passwordHash("cust123"), role: Role.customer },
    ],
  });

  const owners = await prisma.user.findMany({ where: { role: Role.owner } });
  const customers = await prisma.user.findMany({ where: { role: Role.customer } });

  // --- Restaurants ---
  await prisma.restaurant.createMany({
    data: [
      { name: "Ocean View Taverna", description: "Fresh seafood with a beautiful sea view.", capacity: 25, address: "123 Seaside Blvd", phone: "555-0101", logoUrl: "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?q=80&w=200&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", coverImageUrl: "https://images.unsplash.com/photo-1698676972614-9cf3e93b7f77?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", ownerId: owners[0]?.id ?? null },
      { name: "Mountain Grill", description: "Traditional grill house in the mountains.", capacity: 40, address: "456 Highland Dr", phone: "555-0102", logoUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=200&auto=format&fit=crop", coverImageUrl: "https://images.unsplash.com/photo-1543007630-9710e4a00a20?q=80&w=1200&auto=format&fit=crop", ownerId: owners[1]?.id ?? null },
      { name: "Urban Bistro", description: "Modern cuisine in the city center.", capacity: 10, address: "789 Downtown Ave", phone: "555-0103", logoUrl: "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=200&auto=format&fit=crop", coverImageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1200&auto=format&fit=crop", ownerId: owners[2]?.id ?? null },
      { name: "Garden Café", description: "Cozy café with outdoor seating in a lush garden.", capacity: 40, address: "321 Park Lane", phone: "555-0104", logoUrl: "https://images.unsplash.com/photo-1505253304499-671c55fb57fe?q=80&w=200&auto=format&fit=crop", coverImageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1200&auto=format&fit=crop", ownerId: owners[3]?.id ?? null },
      { name: "Sunset Deli", description: "Casual deli with sandwiches and fresh salads.", capacity: 15, address: "654 Beach Rd", phone: "555-0105", logoUrl: "https://images.unsplash.com/photo-1554433607-66b5efe9d304?q=80&w=200&auto=format&fit=crop", coverImageUrl: "https://images.unsplash.com/photo-1601606903106-8cee0dc66cdc?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", ownerId: owners[4]?.id ?? null },
      { name: "The Steakhouse", description: "Premium steaks grilled to perfection.", capacity: 30, address: "987 Meatpacker St", phone: "555-0106", logoUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=200&auto=format&fit=crop", coverImageUrl: "https://images.unsplash.com/photo-1544148103-0773bf10d330?q=80&w=1200&auto=format&fit=crop", ownerId: owners[5]?.id ?? null },
      { name: "Pasta Palace", description: "Homemade pasta and Italian classics.", capacity: 70, address: "147 Little Italy Way", phone: "555-0107", logoUrl: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?q=80&w=200&auto=format&fit=crop", coverImageUrl: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?q=80&w=1200&auto=format&fit=crop", ownerId: null },
      { name: "Sushi Corner", description: "Fresh sushi and Japanese delicacies.", capacity: 20, address: "258 Tokyo St", phone: "555-0108", logoUrl: "https://images.unsplash.com/photo-1553621042-f6e147245754?q=80&w=200&auto=format&fit=crop", coverImageUrl: "https://images.unsplash.com/photo-1568018508399-e53bc8babdde?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", ownerId: null },
      { name: "Vegan Delight", description: "100% plant-based menu with healthy options.", capacity: 50, address: "369 Green St", phone: "555-0109", logoUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=200&auto=format&fit=crop", coverImageUrl: "https://images.unsplash.com/photo-1540914124281-342587941389?q=80&w=1200&auto=format&fit=crop", ownerId: null },
      { name: "Mediterraneo", description: "Mediterranean cuisine with fresh ingredients.", capacity: 80, address: "159 Olive Grove", phone: "555-0110", logoUrl: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=200&auto=format&fit=crop", coverImageUrl: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?q=80&w=1200&auto=format&fit=crop", ownerId: null },
    ],
  });

  const restaurants = await prisma.restaurant.findMany();

  // --- Reservations ---
  const random = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  const reservationData = Array.from({ length: 10 }, () => {
    const { scheduledAt, inPast } = getRandomScheduledAt();
    return {
      scheduledAt,
      persons: Math.floor(Math.random() * 10) + 2,
      status: inPast
        ? Math.random() < 0.6
          ? ReservationStatus.completed
          : ReservationStatus.no_show
        : ReservationStatus.active,
      customerId: random(customers).id,
      restaurantId: random(restaurants).id,
    };
  });

  await prisma.reservation.createMany({ data: reservationData });

  console.log("[LOG] seed.main: Database seeded successfully");
}

main()
  .catch((err) => {
    console.error("[LOG] seed.main:", err instanceof Error ? err.stack : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

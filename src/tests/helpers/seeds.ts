import bcrypt from 'bcryptjs';
import type { Prisma } from '../../generated/prisma/index.js';
import { testPrisma } from './testPrismaClient.js';
import { SALT_ROUNDS } from '../../constants/index.js';

export const testSeeds = {
  async createUser(
    overrides: Partial<Prisma.UserCreateInput> = {},
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? testPrisma;
    const password = await bcrypt.hash('Test@1234', SALT_ROUNDS);
    return client.user.create({
      data: {
        firstname: 'Test',
        lastname: 'User',
        email: `test-${Date.now()}@example.com`,
        password,
        role: 'customer',
        ...overrides,
      },
    });
  },

  async createRestaurant(
    overrides: Partial<Prisma.RestaurantCreateInput> = {},
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? testPrisma;
    return client.restaurant.create({
      data: {
        name: 'Test Restaurant',
        description: 'A test restaurant',
        address: '1 Test Street',
        phone: '0000000000',
        capacity: 5,
        logoUrl: 'https://example.com/logo.png',
        coverImageUrl: 'https://example.com/cover.png',
        ...overrides,
      },
    });
  },

  async createReservation(
    data: {
      restaurantId: string;
      customerId: string;
      scheduledAt?: Date;
      people?: number;
      status?: 'active' | 'canceled' | 'completed' | 'no_show';
    },
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? testPrisma;
    // Default: 3 hours from now — within booking window, past min lead time
    const scheduledAt = data.scheduledAt ?? new Date(Date.now() + 3 * 60 * 60 * 1000);
    return client.reservation.create({
      data: {
        scheduledAt,
        people: data.people ?? 2,
        status: data.status ?? 'active',
        restaurant: { connect: { id: data.restaurantId } },
        customer: { connect: { id: data.customerId } },
      },
    });
  },
};

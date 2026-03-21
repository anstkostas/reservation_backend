import { prisma } from "../config/prismaClient.js";
import { Prisma, type Reservation } from "../generated/prisma/client.js";
import { PRISMA_ERROR_CODES } from "../constants/index.js";
import type { ReservationWithRelations } from "../dtos/reservationDTO.js";

// Transaction client omits connection/lifecycle methods — typed for use inside prisma.$transaction
type TxClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

interface ReservationFilter {
  restaurantId?: string;
  customerId?: string;
  status?: string;
}

export const reservationRepository = {
  /**
   * Creates a new reservation record.
   *
   * @param {Prisma.ReservationCreateInput} data - Fields for the new reservation
   * @param {TxClient} [tx] - Optional Prisma transaction client
   * @returns {Promise<Reservation>} The created reservation
   */
  async create(
    data: Prisma.ReservationCreateInput,
    tx?: TxClient
  ): Promise<Reservation> {
    const client = tx ?? prisma;
    return client.reservation.create({ data });
  },

  /**
   * Finds a single reservation by primary key.
   *
   * @param {string} id - Reservation UUID
   * @param {TxClient} [tx] - Optional Prisma transaction client
   * @returns {Promise<Reservation | null>} The reservation, or null if not found
   */
  async findById(id: string, tx?: TxClient): Promise<Reservation | null> {
    const client = tx ?? prisma;
    return client.reservation.findUnique({ where: { id } });
  },

  /**
   * Finds all reservations matching the given filter, with restaurant and customer joined.
   *
   * @param {ReservationFilter} [filter={}] - Optional filter: restaurantId, customerId, status
   * @returns {Promise<ReservationWithRelations[]>} Reservations ordered by date/time descending
   */
  async findAll(
    filter: ReservationFilter = {}
  ): Promise<ReservationWithRelations[]> {
    const where: Prisma.ReservationWhereInput = {};
    if (filter.restaurantId) where.restaurantId = filter.restaurantId;
    if (filter.customerId) where.customerId = filter.customerId;
    if (filter.status) where.status = { equals: filter.status as Reservation["status"] };

    const results = await prisma.reservation.findMany({
      where,
      include: {
        restaurant: { select: { name: true, address: true, phone: true } },
        customer: {
          select: { id: true, firstname: true, lastname: true, email: true },
        },
      },
      orderBy: [{ date: "desc" }, { time: "desc" }],
    });

    return results as ReservationWithRelations[];
  },

  /**
   * Updates a reservation by ID with the provided data.
   *
   * @param {string} id - Reservation UUID
   * @param {Prisma.ReservationUpdateInput} data - Fields to update
   * @param {TxClient} [tx] - Optional Prisma transaction client — must be forwarded
   *   when called within a transaction to ensure the write is part of the same atomic operation
   * @returns {Promise<Reservation | null>} The updated reservation, or null if not found
   */
  async update(
    id: string,
    data: Prisma.ReservationUpdateInput,
    tx?: TxClient
  ): Promise<Reservation | null> {
    const client = tx ?? prisma;
    try {
      return await client.reservation.update({ where: { id }, data });
    } catch (err) {
      // P2025 — record not found
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND
      ) {
        return null;
      }
      throw err;
    }
  },

  /**
   * Deletes a reservation by ID.
   *
   * @param {string} id - Reservation UUID
   * @param {TxClient} [tx] - Optional Prisma transaction client
   * @returns {Promise<Reservation | null>} The deleted reservation, or null if not found
   */
  async delete(id: string, tx?: TxClient): Promise<Reservation | null> {
    const client = tx ?? prisma;
    try {
      return await client.reservation.delete({ where: { id } });
    } catch (err) {
      // P2025 — record not found
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND
      ) {
        return null;
      }
      throw err;
    }
  },

  /**
   * Counts reservations matching the given filter.
   *
   * @param {ReservationFilter} [filter={}] - Optional filter: restaurantId, customerId
   * @returns {Promise<number>} Total count of matching reservations
   */
  async count(filter: ReservationFilter = {}): Promise<number> {
    const where: Prisma.ReservationWhereInput = {};
    if (filter.restaurantId) where.restaurantId = filter.restaurantId;
    if (filter.customerId) where.customerId = filter.customerId;
    return prisma.reservation.count({ where });
  },

  /**
   * Counts active reservations for a specific restaurant, date, and time slot.
   * Used to check capacity before creating or updating a reservation.
   *
   * Always uses $queryRaw for reliable TIME column comparison via PostgreSQL casting.
   * When called within a transaction (tx provided), appends FOR UPDATE to lock the
   * matching rows and prevent race conditions on concurrent bookings.
   *
   * @param {string} restaurantId - Restaurant UUID
   * @param {Date} date - Reservation date
   * @param {string} time - Reservation time in HH:MM format
   * @param {TxClient} [tx] - Prisma transaction client — pass when inside a capacity-check transaction
   * @returns {Promise<number>} Count of active reservations for that slot
   */
  async countActiveBySlot(
    restaurantId: string,
    date: Date,
    time: string,
    tx?: TxClient
  ): Promise<number> {
    const client = tx ?? prisma;
    // PostgreSQL TIME cast requires HH:MM:SS — append seconds to the HH:MM string from Zod
    const timeWithSeconds = `${time}:00`;
    // FOR UPDATE is appended only inside a transaction to prevent overbooking race conditions;
    // Prisma.raw injects the clause as a literal SQL fragment (not a parameter)
    const lockClause = tx ? Prisma.raw("FOR UPDATE") : Prisma.raw("");
    const result = await client.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count
      FROM "Reservations"
      WHERE "restaurantId" = ${restaurantId}::uuid
        AND date = ${date}::date
        AND time = ${timeWithSeconds}::time
        AND status = 'active'::"ReservationStatus"
      ${lockClause}
    `;
    return Number(result[0].count);
  },
};

import { testPrisma } from './testPrismaClient.js';
import type { Prisma } from '../../generated/prisma/index.js';

// Captured here so test files can pass it into repository calls
let tx: Prisma.TransactionClient;

// Holds the reject function — calling it aborts the transaction (rollback)
let rollback: (reason?: unknown) => void;

export function getTestTx(): Prisma.TransactionClient {
  return tx;
}

export async function startTestTransaction(): Promise<void> {
  await new Promise<void>((_resolve, reject) => {
    rollback = reject;
    testPrisma
      .$transaction(async (transactionClient) => {
        tx = transactionClient;
        // This inner Promise never resolves — keeps the transaction open
        // until rollbackTestTransaction() is called
        await new Promise<void>((innerResolve) => {
          void innerResolve;
        });
      })
      .catch(() => {});
  }).catch(() => {});
}

export function rollbackTestTransaction(): void {
  if (rollback) rollback(new Error('test rollback'));
}

const FORCED_ROLLBACK = new Error('forced rollback');

/**
 * Runs [work] inside a test-DB transaction, then forces a rollback and returns what [work]
 * returned. Lets a test prove a repository method really uses the tx it was given: a read
 * through the tx sees rows created earlier in it, and a write through the tx is gone afterwards.
 *
 * @param work - Callback receiving the transaction client
 * @returns {Promise<T>} The value [work] returned before the rollback
 * @throws Any error [work] throws (only the internal rollback signal is swallowed)
 */
export async function inRolledBackTx<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  const results: T[] = [];
  const thrown = await testPrisma
    .$transaction(async (transactionClient) => {
      results.push(await work(transactionClient));
      throw FORCED_ROLLBACK;
    })
    .catch((e: unknown) => e);
  if (thrown !== FORCED_ROLLBACK) throw thrown;
  return results[0];
}

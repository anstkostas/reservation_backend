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

import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    // Use child process forks instead of worker threads.
    // Prisma's pg pool uses Node.js net sockets which are not
    // shareable across worker_threads — forks get their own process.
    pool: 'forks',
    env: { NODE_ENV: 'test' },
    // Run test files sequentially to avoid concurrent transactions
    // conflicting on the same DB connection
    sequence: { concurrent: false },
    testTimeout: 15000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
    // Allow Vitest to resolve .ts files when source imports use .js extensions
    // (required by NodeNext module resolution)
    extensionOrder: ['.ts', '.js'],
    conditions: ['import', 'node'],
  },
});

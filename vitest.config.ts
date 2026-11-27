import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    include: ['src/tests/**/*.test.ts'],
    // Use child process forks instead of worker threads.
    // Prisma's pg pool uses Node.js net sockets which are not
    // shareable across worker_threads — forks get their own process.
    pool: 'forks',
    env: { NODE_ENV: 'test' },
    // Run test files one at a time — integration files share the test DB, and parallel
    // files race on table-wide reads/writes (counts, pruneExpired, findAll).
    fileParallelism: false,
    // Run tests inside a file one after another (this does NOT affect file parallelism).
    sequence: { concurrent: false },
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/tests/**', 'src/generated/**', 'src/**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
    conditions: ['import', 'node'],
  },
});

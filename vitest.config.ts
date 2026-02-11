import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/*/tests/**/*.{test,spec}.ts'],
    exclude: ['_reference/**', 'node_modules/**'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      exclude: ['node_modules/**', '_reference/**', '**/*.config.*', '**/dist/**'],
    },
  },
});

import { defineConfig } from 'vitest/config';

const isIntegration = process.env['RUN_INTEGRATION_TESTS'] === '1';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: isIntegration
      ? ['src/**/*.test.ts', 'src/__integration__/**/*.test.ts']
      : ['src/**/*.test.ts'],
    exclude: isIntegration ? [] : ['src/__integration__/**'],
  },
});

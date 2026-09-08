import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // `test` / `expect` como globales → los mismos tests/*.test.js corren también
    // en el harness del navegador (tests/index.html).
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});

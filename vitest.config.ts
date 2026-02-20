import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // This tells Vitest where your tests are
        include: ['test/**/*.test.ts'],
    },
});
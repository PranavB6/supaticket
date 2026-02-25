import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        server: {
            deps: {
                inline: ['@fastify/autoload']
            }
        },
        include: ['test/**/*.test.ts'],
        setupFiles: ['./test/vitest.setup.ts'],
    }
});
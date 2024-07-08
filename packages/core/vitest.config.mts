/// <reference types='vitest' />

import { defineConfig } from 'vite';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        reporters: ['default'],
        include: ['src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
        coverage: {
            enabled: true,
            reportsDirectory: '../../coverage/packages/core',
            provider: 'v8',
            include: ['src/**/*.ts'],
        },
    },
});

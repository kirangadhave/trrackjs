/// <reference types="vitest" />
import { defineConfig } from 'vite';

import { join } from 'path';
import dts from 'vite-plugin-dts';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig({
    root: __dirname,
    cacheDir: '../../node_modules/.vite/redux',
    define: {
        'process.env': {},
    },
    plugins: [
        dts({
            tsConfigFilePath: join(__dirname, 'tsconfig.lib.json'),
            // Faster builds by skipping tests. Set this to false to enable type checking.
            skipDiagnostics: true,
        }),

        nxViteTsPaths(),
    ],

    // Uncomment this if you are using workers.
    // worker: {
    //  plugins: [
    //    viteTsConfigPaths({
    //      root: '../../',
    //    }),
    //  ],
    // },

    // Configuration for building your library.
    // See: https://vitejs.dev/guide/build.html#library-mode
    build: {
        outDir: '../../dist/packages/redux',
        reportCompressedSize: true,
        commonjsOptions: { transformMixedEsModules: true },
        sourcemap: true,
        lib: {
            // Could also be a dictionary or array of multiple entry points.
            entry: 'src/index.ts',
            fileName: 'index',

            // UMD name
            name: 'TrrackRTK',
            // Change this to the formats you want to support.
            // Don't forgot to update your package.json as well.
            formats: ['es', 'cjs', 'umd'],
        },
        rollupOptions: {
            // External packages that should not be bundled into your library.
            external: ['@reduxjs/toolkit', '@trrack/core'],
            output: {
                globals: {
                    '@reduxjs/toolkit': 'RTK',
                    '@trrack/core': 'Trrack',
                },
            },
        },
    },

    test: {
        reporters: ['default'],
        coverage: {
            reportsDirectory: '../../coverage/packages/redux',
            provider: 'v8',
        },
        globals: true,
        environment: 'jsdom',
        include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    },
});
import { defineConfig } from 'tsup';

export default defineConfig([
  // ESM + CJS builds
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    treeshake: true,
    outExtension({ format }) {
      return { js: format === 'esm' ? '.js' : '.cjs' };
    },
  },
  // IIFE build for script tag
  {
    entry: { trrack: 'src/index.ts' },
    format: ['iife'],
    globalName: 'Trrack',
    outExtension: () => ({ js: '.global.js' }),
    outDir: 'dist',
    minify: true,
    sourcemap: true,
  },
]);

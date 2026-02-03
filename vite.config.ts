import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import nodeResolve from '@rollup/plugin-node-resolve';
import { builtinModules } from 'module';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const nodeModules = [...builtinModules, builtinModules.map((m) => `node:${m}`)].flat();

const external = [
  'napcat-types',
  'puppeteer-core',
  ...nodeModules
];

export default defineConfig({
  resolve: {
    conditions: ['node', 'default']
  },
  build: {
    sourcemap: false,
    target: 'esnext',
    minify: false,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'index.mjs'
    },
    rollupOptions: {
      external,
      output: {
        inlineDynamicImports: false
      }
    }
  },
  plugins: [nodeResolve()]
});

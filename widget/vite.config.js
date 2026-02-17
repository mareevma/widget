import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/main.js',
      name: 'MerchConfigurator',
      fileName: () => 'configurator.js',
      formats: ['iife'],
    },
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
  },
});

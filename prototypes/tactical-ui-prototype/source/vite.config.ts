import { defineConfig } from 'vite'

export default defineConfig({
  base: '/arena-test/prototypes/tactical-ui-prototype/',
  root: 'tactical-ui-prototype',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
})

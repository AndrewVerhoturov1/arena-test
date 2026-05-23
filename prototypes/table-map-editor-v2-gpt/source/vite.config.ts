import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/arena-test/prototypes/table-map-editor-v2-gpt/',
});

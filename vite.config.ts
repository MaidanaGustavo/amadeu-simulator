import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',            // permite abrir a pasta dist de qualquer subcaminho
  build: { chunkSizeWarningLimit: 1500 },
});

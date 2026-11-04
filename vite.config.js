import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Nisbiy yo'llar: ilova ham GitHub Pages'da, ham Android ichida ishlaydi.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1200 },
});

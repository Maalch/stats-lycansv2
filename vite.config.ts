import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
  base: '/', // Changed from '/stats-lycansv2/' for custom domain
  publicDir: 'public',
  // Ensure data directory is copied to build output
  assetsInclude: ['**/*.json'],
})
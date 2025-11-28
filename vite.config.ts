import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 10240, // Only compress files > 10KB
      deleteOriginFile: false, // Keep original as fallback
    })
  ],
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
  base: '/', // Changed from '/stats-lycansv2/' for custom domain
  publicDir: 'public',
  // Ensure data directory is copied to build output
  assetsInclude: ['**/*.json'],
})
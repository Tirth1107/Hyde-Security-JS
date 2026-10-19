import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: 'website',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'website/index.html')
      }
    }
  }
})

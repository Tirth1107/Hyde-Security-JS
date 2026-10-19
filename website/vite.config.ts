import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import pkg from '../package.json' with { type: 'json' }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // The library reads its version from this at build time
    __HYDE_VERSION__: JSON.stringify(pkg.version)
  },
  resolve: {
    alias: {
      'hyde-security-js': path.resolve(__dirname, '../src/index.ts')
    }
  }
})

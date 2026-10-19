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
    // Library source in ../src would otherwise pick up the root's React copy
    dedupe: ['react', 'react-dom'],
    // Use the library source directly (most specific path first)
    alias: [
      { find: 'hyde-security-js/react', replacement: path.resolve(__dirname, '../src/react.ts') },
      { find: 'hyde-security-js', replacement: path.resolve(__dirname, '../src/index.ts') }
    ]
  }
})

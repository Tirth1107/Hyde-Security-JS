import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: '/examples/full-test.html'
  },
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'HydeSecurity',
      formats: ['es', 'umd', 'cjs'],
      fileName: (format) => {
        const formatMap: Record<string, string> = {
          es: 'hyde-security-js.esm.js',
          umd: 'hyde-security-js.umd.js',
          cjs: 'hyde-security-js.cjs.js'
        }
        return formatMap[format] || `hyde-security-js.${format}.js`
      }
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime'
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime'
        }
      }
    },
    sourcemap: true
  }
})

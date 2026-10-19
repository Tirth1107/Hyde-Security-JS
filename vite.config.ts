import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json'

const reactExternals = ['react', 'react-dom', 'react/jsx-runtime']
// ESM/CJS builds leave dependencies to the app's bundler (no duplicate copies).
// UMD is loaded straight in the browser, so it bundles them.
const deps = Object.keys(pkg.dependencies)
const isDependency = (id: string) => deps.some(d => id === d || id.startsWith(`${d}/`))
const globals = {
  react: 'React',
  'react-dom': 'ReactDOM',
  'react/jsx-runtime': 'jsxRuntime'
}

// `vite build` builds the ESM/CJS entries (main + react).
// `vite build --mode umd` builds the single-file UMD bundle (UMD can't have two entries).
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: {
    __HYDE_VERSION__: JSON.stringify(pkg.version)
  },
  server: {
    port: 5173,
    open: '/examples/full-test.html'
  },
  build: {
    emptyOutDir: mode !== 'umd',
    sourcemap: true,
    lib: mode === 'umd'
      ? {
          entry: 'src/index.ts',
          name: 'HydeSecurity',
          formats: ['umd'],
          fileName: () => 'hyde-security-js.umd.js'
        }
      : {
          entry: {
            'hyde-security-js': 'src/index.ts',
            react: 'src/react.ts'
          },
          formats: ['es', 'cjs'],
          fileName: (format, entryName) => format === 'es' ? `${entryName}.esm.mjs` : `${entryName}.cjs.js`
        },
    rollupOptions: {
      external: mode === 'umd'
        ? reactExternals
        : (id: string) => reactExternals.includes(id) || isDependency(id),
      output: { globals }
    }
  }
}))

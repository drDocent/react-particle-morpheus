import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src/ParticleWrapper'],
      tsconfigPath: './tsconfig.app.json',
      insertTypesEntry: true,
      rollupTypes: true,
    })
  ],
  build: {
    lib: {
      // Punkt wejściowy naszej paczki
      entry: resolve(__dirname, 'src/ParticleWrapper/index.ts'),
      name: 'ParticleWrapper',
      // Nazwy plików wynikowych (Vite wygeneruje domyślnie index.js i index.umd.js)
      fileName: 'index'
    },
    rollupOptions: {
      // Wykluczamy biblioteki wbudowane w kod końcowy (będą w peerDependencies)
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        // Określamy zmienne globalne w razie użycia formatu UMD
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  }
})

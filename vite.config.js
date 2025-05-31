// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.wasm', '**/*.data'],   // keeps .wasm/.data public
  worker: {
    format: 'es'
  }
})


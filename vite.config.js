import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    hmr: {
      overlay: false // Puedes desactivar temporalmente el overlay
    }
  }
})// redeploy trigger

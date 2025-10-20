// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(() => {
  // Let workflows set this; fallback to '/' for local dev
  const base = process.env.VITE_BASE || '/'

  return {
    base,
    plugins: [react()],
    server: {
      port: 3001,
      open: true
    }
  }
})

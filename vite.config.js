// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => {
  // Use VITE_BASE if explicitly set (e.g. for GitHub Pages with /TTP_Coach_Web_Public/).
  // Otherwise, default to '/' for all environments including Netlify production builds.
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

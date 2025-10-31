// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => {
  // When building for production (e.g. GitHub Pages) ensure assets are
  // served from the repository sub-path. Allow overriding via VITE_BASE for
  // deployments with a custom base.
  const base =
    process.env.VITE_BASE || (command === 'build' ? '/TTP_Coach_Web_Public/' : '/')

  return {
    base,
    plugins: [react()],
    server: {
      port: 3001,
      open: true
    }
  }
})

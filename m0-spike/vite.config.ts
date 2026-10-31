import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so dist/ works at a domain root or under a subpath (GitHub Pages).
export default defineConfig({
  base: './',
  plugins: [react()],
})

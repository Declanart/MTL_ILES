import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: change base to "/<repo-name>/" before deploying to GitHub Pages.
export default defineConfig({
  plugins: [react()],
  base: '/REPO_NAME/', // ← replace REPO_NAME with your GitHub repo name
})

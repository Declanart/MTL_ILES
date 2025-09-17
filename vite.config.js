import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: change base to "/<repo-name>/" before deploying to GitHub Pages.
export default defineConfig({
  plugins: [react()],
  base: '/MTL_ILES/', // ← replace REPO_NAME with your GitHub repo name
})

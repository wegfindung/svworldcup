import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // react-router-dom is only pulled in transitively (e.g. via SquadPitchModal), which Vite's dep
    // scanner can miss; processing it inline lets vitest's resolver handle it reliably.
    server: { deps: { inline: ['react-router-dom'] } },
  },
})

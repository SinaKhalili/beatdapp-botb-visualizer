import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig({
  server: {
    port: 3000,
  },
  // leva and r3f must share the app's single React instance.
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  plugins: [
    // Deploy target: Cloudflare Workers (server entry runs in the 'ssr' env).
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    tsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tanstackStart(),
    viteReact(),
  ],
})

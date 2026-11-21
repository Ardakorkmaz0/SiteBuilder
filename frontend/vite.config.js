import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              test: /node_modules[\\/](?:react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
              priority: 20,
            },
            {
              name: 'vendor-dnd',
              test: /node_modules[\\/]@dnd-kit[\\/]/,
              priority: 15,
            },
            {
              name: 'vendor-state',
              test: /node_modules[\\/](?:zustand|axios)[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
})

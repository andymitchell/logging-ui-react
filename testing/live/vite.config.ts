import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // The pages import React from here while the library source in ../../src resolves the repo root's copy.
    // Two Reacts break hooks ("Invalid hook call"), so pin both to one.
    dedupe: ['react', 'react-dom'],
  },
  server: {
    fs: {
      // Serve the library source and the root node_modules (logging, react-json-view-lite).
      allow: ['../..'],
    },
  },
  build: {
    // The pages use top-level await.
    target: 'esnext',
    rollupOptions: {
      input: ['index.html', 'trace.html', 'trace-search.html', 'prompt-trace-search.html'],
    },
  },
})

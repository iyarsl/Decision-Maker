import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // A GitHub Pages project site is served from /<repo>/, so the build has to know its own
  // subpath or every asset 404s. Set by the deploy workflow; empty everywhere else, which
  // keeps the dev server and a local build at the root.
  base: process.env.BASE_PATH ?? '/',
  server: { port: 5183, strictPort: true },
});

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    // Base path for deployment: './' ensures all assets load via relative paths in Tauri WKWebView, static bundles, and previews
    base: './',
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // Tauri bundle optimization
    clearScreen: false,
    envPrefix: ['VITE_', 'TAURI_PLATFORM', 'TAURI_ARCH', 'TAURI_FAMILY', 'TAURI_VERSION', 'TAURI_ENV_DEBUG'],
    build: {
      // Support for Tauri WKWebView (Safari 15+) and modern desktop engines
      target: ['es2022', 'safari15'],
      // Minification behavior
      minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
      sourcemap: !!process.env.TAURI_DEBUG,
      // Increase limit for complex React apps
      chunkSizeWarningLimit: 2500,
    },
    server: {
      // Tauri specific settings
      port: 1420,
      strictPort: true,
      host: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
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
      // Support for Tauri
      target: process.env.TAURI_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
      // Minification behavior
      minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
      sourcemap: !!process.env.TAURI_DEBUG,
      // Increase limit for complex React apps
      chunkSizeWarningLimit: 1000,
      // Code splitting to address large chunk warnings
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('recharts') || id.includes('d3')) {
                return 'vendor-charts';
              }
              if (id.includes('framer-motion') || id.includes('motion')) {
                return 'vendor-animation';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('leaflet') || id.includes('google-maps')) {
                return 'vendor-maps';
              }
              if (id.includes('fit-file-parser') || id.includes('react-markdown')) {
                return 'vendor-utils';
              }
              return 'vendor';
            }
          }
        }
      }
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

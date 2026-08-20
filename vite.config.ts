import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const localVisitorAnalytics = () => ({
  name: 'local-visitor-analytics',
  configureServer(server: import('vite').ViteDevServer) {
    server.middlewares.use('/api/visits', (_request, response) => {
      response.statusCode = 200;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end(JSON.stringify({
        status: 'ready',
        totals: { visitors: 0, visits: 0, coveredRegions: 0 },
        regions: [],
      }));
    });
  },
});

export default defineConfig({
  plugins: [react(), localVisitorAnalytics()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api/assistant': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: false,
      },
    },
    watch: {
      ignored: ['**/process_logs/**', '**/playwright-report/**'],
    },
  },
});

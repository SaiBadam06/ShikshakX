import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (!id.includes('node_modules')) {
                return undefined;
              }

              if (id.includes('firebase/firestore')) {
                return 'firebase-firestore';
              }

              if (id.includes('firebase/auth')) {
                return 'firebase-auth';
              }

              if (id.includes('firebase/app')) {
                return 'firebase-core';
              }

              if (id.includes('react') || id.includes('scheduler')) {
                return 'react';
              }

              if (id.includes('groq-sdk') || id.includes('@google/genai')) {
                return 'ai';
              }

              if (id.includes('@heroicons') || id.includes('antd') || id.includes('@ant-design/icons')) {
                return 'ui';
              }

              return 'vendor';
            },
          },
        },
      }
    };
});

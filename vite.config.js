import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// Standalone Vue 3 SPA. Builds static assets to dist/ (index.html + hashed
// JS/CSS). Talks to the AS Travel platform API over bearer tokens; the API
// base URL comes from VITE_API_URL (see .env).
export default defineConfig({
    plugins: [vue()],
    server: {
        host: 'localhost',
        port: 5173,
    },
});

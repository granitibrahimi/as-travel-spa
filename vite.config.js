import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { renameSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// After the build, rename the generated index.html to index.php so a PHP host
// serves the SPA entry as index.php.
function htmlToPhp() {
    let outDir;
    return {
        name: 'html-to-php',
        apply: 'build',
        configResolved(config) {
            outDir = resolve(config.root, config.build.outDir);
        },
        closeBundle() {
            const html = resolve(outDir, 'index.html');
            const php = resolve(outDir, 'index.php');
            if (existsSync(html)) renameSync(html, php);
        },
    };
}

// Standalone Vue 3 SPA. Builds static assets to public/ (index.php + hashed
// JS/CSS). Static files that should be copied verbatim live in static/.
// Talks to the AS Travel platform API over bearer tokens; the API base URL
// comes from VITE_API_URL (see .env).
export default defineConfig({
    plugins: [vue(), htmlToPhp()],
    publicDir: 'static',
    build: {
        outDir: 'public',
        emptyOutDir: true,
        rollupOptions: {
            output: {
                // Split heavy third-party libs into their own long-term-cacheable
                // chunks. chart.js is only imported by the (lazy) report pages, so
                // its chunk is fetched only when a report is opened.
                manualChunks(id) {
                    if (! id.includes('node_modules')) {
                        return undefined;
                    }

                    if (id.includes('chart.js')) {
                        return 'chart';
                    }

                    if (id.includes('pusher-js') || id.includes('laravel-echo')) {
                        return 'realtime';
                    }

                    if (id.includes('vue-router') || id.includes('/pinia/') || /node_modules\/@?vue\//.test(id)) {
                        return 'vue';
                    }

                    return 'vendor';
                },
            },
        },
    },
    server: {
        host: 'localhost',
        port: 5173,
    },
});
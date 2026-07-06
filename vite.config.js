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
    },
    server: {
        host: 'localhost',
        port: 5173,
    },
});
// Stale-deploy recovery.
//
// Every deploy overwrites `public/` with freshly hash-named chunks. A tab that
// loaded the app before the deploy still holds the previous `index.php`, which
// points at chunk filenames that no longer exist. When such a tab lazy-loads a
// route it hasn't fetched yet, the request 404s and the PHP host serves
// `index.php` (HTML) as its SPA fallback — so the dynamic `import()` blows up
// with "Failed to fetch dynamically imported module" or a "text/html" MIME
// error instead of loading the page.
//
// The recovery is a single hard navigation: reloading pulls the current
// `index.php` and the current chunk names. We guard with a short-lived
// sessionStorage stamp so a genuinely broken deploy (chunk really is gone)
// can't put the tab in a reload loop.

const RELOAD_STAMP = 'stale-chunk-reload-at';
const RELOAD_COOLDOWN_MS = 15_000;

function isStaleChunkError(error) {
    const message = (error && (error.message || error.toString())) || '';

    return (
        /Failed to fetch dynamically imported module/i.test(message) ||
        /error loading dynamically imported module/i.test(message) ||
        /Importing a module script failed/i.test(message) ||
        /Unable to preload CSS/i.test(message) ||
        // Browsers phrase the MIME rejection a few different ways.
        (/module script/i.test(message) && /MIME type|text\/html/i.test(message))
    );
}

// Reload once to recover from a stale deploy. Returns true if a reload was
// triggered (caller should stop handling the error). `targetPath` is the route
// the user was trying to reach, so we land there rather than on the previous
// page.
export function recoverFromStaleChunk(error, targetPath) {
    if (! isStaleChunkError(error)) {
        return false;
    }

    let lastReload = 0;
    try {
        lastReload = Number(sessionStorage.getItem(RELOAD_STAMP) || 0);
    } catch {
        // sessionStorage can throw in private modes; fall through to reload.
    }

    if (Date.now() - lastReload < RELOAD_COOLDOWN_MS) {
        // We already reloaded and it still failed — the chunk is really missing.
        // Let the error surface instead of looping.
        return false;
    }

    try {
        sessionStorage.setItem(RELOAD_STAMP, String(Date.now()));
    } catch {
        // ignore
    }

    const dest = targetPath || (window.location.pathname + window.location.search);
    window.location.assign(dest);

    return true;
}

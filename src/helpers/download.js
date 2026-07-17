import api from './api';

/**
 * Shared helpers for server-rendered files (PDFs, exports). All access goes
 * through the axios instance so the bearer token is attached and a 401 is
 * handled centrally. Two flavours:
 *   - downloadFile:    save the blob to disk (Content-Disposition filename).
 *   - openFileInNewTab: open the blob in a new browser tab (e.g. a PDF preview).
 */

// Pull the filename from a Content-Disposition header, else use the fallback.
function filenameFromResponse(response, fallbackName) {
    const disposition = response.headers['content-disposition'] ?? '';
    const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);

    return match ? decodeURIComponent(match[1]) : fallbackName;
}

/**
 * GET a server-rendered file as a blob and save it to disk. The server sets the
 * real filename via Content-Disposition; we fall back to `fallbackName`.
 *
 * @param {string} url                Request path relative to VITE_API_URL.
 * @param {object} [opts]
 * @param {string} [opts.fallbackName] Filename to use if the server omits one.
 * @param {object} [opts.config]       Extra axios config (e.g. `{ params }`).
 */
export async function downloadFile(url, { fallbackName, config = {} } = {}) {
    const response = await api.get(url, { responseType: 'blob', ...config });
    const filename = filenameFromResponse(response, fallbackName);

    const objectUrl = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(objectUrl);
}

/**
 * GET a server-rendered file as a blob and open it in a new browser tab instead
 * of downloading it (e.g. previewing a PDF). The tab is opened synchronously so
 * pop-up blockers don't kill it, then pointed at the blob once it arrives.
 *
 * @param {string} url          Request path relative to VITE_API_URL.
 * @param {object} [opts]
 * @param {object} [opts.config] Extra axios config (e.g. `{ params }`).
 * @param {string} [opts.type]   Blob MIME type when the server omits one.
 */
export async function openFileInNewTab(url, { config = {}, type = 'application/pdf' } = {}) {
    // Open within the click gesture (before any await) so it isn't blocked.
    const tab = window.open('', '_blank');

    try {
        const response = await api.get(url, { responseType: 'blob', ...config });
        const blob = response.data.type
            ? response.data
            : new Blob([response.data], { type });
        const objectUrl = URL.createObjectURL(blob);

        if (tab) {
            tab.location = objectUrl;
        } else {
            // Pop-up blocked — fall back to downloading the file.
            const link = document.createElement('a');
            link.href = objectUrl;
            link.target = '_blank';
            link.click();
        }

        // Revoke after the tab has had time to load the blob.
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
        tab?.close();
        throw error;
    }
}

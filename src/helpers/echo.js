import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { getToken } from './api';

// Laravel Echo speaks the Pusher protocol; Reverb is a Pusher-compatible
// WebSocket server. pusher-js must be reachable as window.Pusher.
window.Pusher = Pusher;

/**
 * A single shared Echo instance connected to the Reverb WebSocket server.
 * Its lifecycle is tied to auth: created once we hold a bearer token (see the
 * auth store) and torn down on logout. Config comes from VITE_REVERB_* vars,
 * which — like all VITE_* vars — are inlined at BUILD time.
 */
let echo = null;

// Private/presence channel subscriptions must be authorized. Reverb only
// carries messages; the authorization itself is done by the platform API,
// which validates our bearer token. Defaults to '/broadcasting/auth' on the
// API's origin, overridable via VITE_REVERB_AUTH_ENDPOINT.
function authEndpoint() {
    if (import.meta.env.VITE_REVERB_AUTH_ENDPOINT) {
        return import.meta.env.VITE_REVERB_AUTH_ENDPOINT;
    }

    try {
        return new URL('/broadcasting/auth', import.meta.env.VITE_API_URL).toString();
    } catch {
        return '/broadcasting/auth';
    }
}

/**
 * Connect to Reverb using the current bearer token. Idempotent: returns the
 * existing instance if already connected, and does nothing without a token.
 */
export function connectEcho() {
    const token = getToken();

    if (!token || echo) {
        return echo;
    }

    const scheme = import.meta.env.VITE_REVERB_SCHEME ?? 'https';

    echo = new Echo({
        broadcaster: 'reverb',
        key: import.meta.env.VITE_REVERB_APP_KEY,
        wsHost: import.meta.env.VITE_REVERB_HOST,
        wsPort: Number(import.meta.env.VITE_REVERB_PORT ?? 80),
        wssPort: Number(import.meta.env.VITE_REVERB_PORT ?? 443),
        forceTLS: scheme === 'https',
        enabledTransports: ['ws', 'wss'],
        authEndpoint: authEndpoint(),
        auth: {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            },
        },
    });

    return echo;
}

/**
 * The active Echo instance, or null when disconnected. Use this from
 * components to subscribe, e.g.
 *   getEcho()?.private(`users.${id}`).listen('.BookingUpdated', handler)
 */
export function getEcho() {
    return echo;
}

/** Tear down the WebSocket connection (called on logout / token loss). */
export function disconnectEcho() {
    if (echo) {
        echo.disconnect();
        echo = null;
    }
}
// Idle auto-logout. After VITE_IDLE_TIMEOUT seconds without user activity, the
// onIdle callback fires (the app uses it to log the user out). Only meaningful
// while authenticated — start/stop is driven from main.js with auth state.

// Timeout in seconds, from the env (build-time). Defaults to 3 minutes.
export const idleTimeoutSeconds = Number(import.meta.env.VITE_IDLE_TIMEOUT) || 180;

const TIMEOUT_MS = idleTimeoutSeconds * 1000;

// Real user-activity signals that count as "still here".
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'wheel', 'scroll', 'touchstart'];

let timer = null;
let handler = null;
let onIdle = null;

function schedule() {
    if (timer) {
        clearTimeout(timer);
    }

    timer = setTimeout(() => onIdle?.(), TIMEOUT_MS);
}

/** Begin watching for inactivity. `callback` runs once, after the timeout. */
export function startIdleTimer(callback) {
    stopIdleTimer();
    onIdle = callback;
    handler = () => schedule();

    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, handler, { passive: true }));
    schedule();
}

/** Stop watching and clear any pending timeout. */
export function stopIdleTimer() {
    if (timer) {
        clearTimeout(timer);
        timer = null;
    }

    if (handler) {
        ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, handler));
        handler = null;
    }

    onIdle = null;
}

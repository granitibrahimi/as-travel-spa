import { defineStore } from 'pinia';

// Idle auto-logout with a countdown warning.
//
// Total inactivity budget comes from VITE_IDLE_TIMEOUT (seconds, build-time,
// default 3 minutes). For the final VITE_IDLE_WARNING seconds of that budget
// (default 30) a warning modal counts down; an "I'm here" click resets
// everything. If the countdown reaches zero the onLogout callback fires.
const TOTAL_SECONDS = Number(import.meta.env.VITE_IDLE_TIMEOUT) || 180;
// Never let the warning window exceed the total budget.
const WARNING_SECONDS = Math.min(Number(import.meta.env.VITE_IDLE_WARNING) || 30, TOTAL_SECONDS);

// Real user-activity signals that count as "still here" (before the warning).
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'wheel', 'scroll', 'touchstart'];

// Timers / listeners live at module scope so Pinia never wraps them in a
// reactivity proxy.
let idleTimer = null;
let countdown = null;
let activityHandler = null;
let onLogout = null;

export const useIdleStore = defineStore('idle', {
    state: () => ({
        // True while the countdown modal should be shown.
        warning: false,
        // Seconds remaining in the countdown.
        secondsLeft: WARNING_SECONDS,
    }),

    actions: {
        // Begin tracking inactivity. `logoutCallback` runs if the user lets the
        // countdown expire.
        start(logoutCallback) {
            this.stop();
            onLogout = logoutCallback;
            activityHandler = () => this.onActivity();

            ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, activityHandler, { passive: true }));
            this.arm();
        },

        // (Re)start the pre-warning inactivity timer.
        arm() {
            if (idleTimer) {
                clearTimeout(idleTimer);
            }

            idleTimer = setTimeout(() => this.beginWarning(), (TOTAL_SECONDS - WARNING_SECONDS) * 1000);
        },

        onActivity() {
            // Once the warning is up, only the explicit "I'm here" button counts
            // — otherwise a stray mouse move would silently cancel the countdown.
            if (this.warning) {
                return;
            }

            this.arm();
        },

        beginWarning() {
            this.warning = true;
            this.secondsLeft = WARNING_SECONDS;

            countdown = setInterval(() => {
                this.secondsLeft -= 1;

                if (this.secondsLeft <= 0) {
                    this.expire();
                }
            }, 1000);
        },

        // "I'm here" — dismiss the warning and reset the full inactivity budget.
        stayActive() {
            if (countdown) {
                clearInterval(countdown);
                countdown = null;
            }

            this.warning = false;
            this.secondsLeft = WARNING_SECONDS;
            this.arm();
        },

        expire() {
            const callback = onLogout;
            this.stop();
            callback?.();
        },

        // Stop all tracking and reset state (called on logout / when leaving).
        stop() {
            if (idleTimer) {
                clearTimeout(idleTimer);
                idleTimer = null;
            }

            if (countdown) {
                clearInterval(countdown);
                countdown = null;
            }

            if (activityHandler) {
                ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, activityHandler));
                activityHandler = null;
            }

            onLogout = null;
            this.warning = false;
            this.secondsLeft = WARNING_SECONDS;
        },
    },
});

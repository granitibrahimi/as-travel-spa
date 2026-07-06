import { defineStore } from 'pinia';
import { getEcho } from '../helpers/echo';
import { useAuthStore } from './auth';

// Real-time toast notifications.
//
// Delivery: the current user's PRIVATE channel `users.{id}`. Unlike the
// presence/whisper approach used for online-users, these are *server*-broadcast
// events (trustworthy), so they come from Laravel notifications
// (`ShouldBroadcast`) or custom broadcast events. The channel name and its
// authorization must match the server (/broadcasting/auth).
const DEFAULT_TIMEOUT = 6000;

// Kept out of Pinia state: the live channel object and the auto-dismiss timers.
let channel = null;
const timers = new Map();
let seq = 0;

function channelName(userId) {
    return `users.${userId}`;
}

export const useNotificationsStore = defineStore('notifications', {
    state: () => ({
        // Visible toasts: [{ id, type, title, message }].
        toasts: [],
        subscribed: false,
    }),

    actions: {
        // Subscribe to the current user's channel. Safe to call repeatedly;
        // a no-op until Echo is connected and we know the user id.
        subscribe() {
            const echo = getEcho();
            const auth = useAuthStore();

            if (!echo || this.subscribed || auth.user?.id == null) {
                return;
            }

            channel = echo.private(channelName(auth.user.id));

            // Laravel broadcast notifications (`Notification::send` with a
            // `broadcast` channel).
            channel.notification((payload) => this.fromBroadcast(payload));

            // Convenience: a custom broadcast event named ".notification".
            channel.listen('.notification', (payload) => this.fromBroadcast(payload));

            // Custom app events → purpose-built toasts.
            channel.listen('.task.assigned', (payload) => this.fromTaskAssigned(payload));

            // Swallow authorization failures (CORS / missing permission) so a
            // misconfigured server doesn't spam the console — nothing to show.
            channel.error?.(() => {});

            this.subscribed = true;
        },

        // Map a server payload onto a toast, tolerating field-name variations.
        fromBroadcast(payload = {}) {
            this.push({
                type: payload.type ?? payload.level ?? 'info',
                title: payload.title ?? payload.subject ?? null,
                message: payload.message ?? payload.body ?? payload.text ?? '',
                timeout: payload.timeout,
            });
        },

        // task.assigned event. Note `type` here is the task type name (not a
        // toast severity), so it's folded into the detail line.
        fromTaskAssigned(payload = {}) {
            const line = [
                payload.reference ? `#${payload.reference}` : null,
                payload.type,
                payload.customer,
                payload.assigned_by ? `by ${payload.assigned_by}` : null,
            ].filter(Boolean).join(' · ');

            this.push({
                type: 'info',
                title: payload.message ?? 'New task assigned',
                message: line || 'A new task was assigned to you.',
            });
        },

        // Add a toast. Also usable directly for local (non-realtime) toasts,
        // e.g. notifications.push({ type: 'success', message: 'Saved.' }).
        push({ type = 'info', title = null, message = '', timeout = DEFAULT_TIMEOUT } = {}) {
            const id = ++seq;
            this.toasts.push({ id, type, title, message });

            if (timeout > 0) {
                timers.set(id, setTimeout(() => this.dismiss(id), timeout));
            }

            return id;
        },

        dismiss(id) {
            const timer = timers.get(id);

            if (timer) {
                clearTimeout(timer);
                timers.delete(id);
            }

            this.toasts = this.toasts.filter((toast) => toast.id !== id);
        },

        // Unsubscribe and clear everything (on logout / token loss).
        unsubscribe() {
            const echo = getEcho();
            const auth = useAuthStore();

            if (auth.user?.id != null) {
                echo?.leave(channelName(auth.user.id));
            }

            channel = null;
            this.subscribed = false;

            timers.forEach((timer) => clearTimeout(timer));
            timers.clear();
            this.toasts = [];
        },
    },
});

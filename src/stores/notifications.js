import { defineStore } from 'pinia';
import api from '../helpers/api';
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
        // Persistent unread count of stored notifications (header bell badge).
        unread: 0,
    }),

    actions: {
        // Refresh the unread badge from the server (persistent notifications).
        async fetchUnread() {
            try {
                const { data } = await api.get('/user-notifications/unread-count');
                this.unread = data.count ?? 0;
            } catch {
                // Non-fatal: leave the badge as-is if the request fails.
            }
        },

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
            this.unread++;
            this.push({
                type: payload.type ?? payload.level ?? 'info',
                title: payload.title ?? payload.subject ?? null,
                message: payload.message ?? payload.body ?? payload.text ?? '',
                timeout: payload.timeout,
                notificationId: payload.notification_id ?? null,
            });
        },

        // task.assigned event. Note `type` here is the task type name (not a
        // toast severity), so it's folded into the detail line.
        fromTaskAssigned(payload = {}) {
            this.unread++;
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
                notificationId: payload.notification_id ?? null,
            });
        },

        // Add a toast. Also usable directly for local (non-realtime) toasts,
        // e.g. notifications.push({ type: 'success', message: 'Saved.' }).
        push({ type = 'info', title = null, message = '', timeout = DEFAULT_TIMEOUT, notificationId = null } = {}) {
            const id = ++seq;
            this.toasts.push({ id, type, title, message, notificationId });

            if (timeout > 0) {
                // Auto-dismiss does NOT mark the notification seen.
                timers.set(id, setTimeout(() => this.dismiss(id), timeout));
            }

            return id;
        },

        // Remove a toast. When the user dismisses it (markSeen), and it carries a
        // server notification id, tell the API it's been seen.
        dismiss(id, { markSeen = false } = {}) {
            const timer = timers.get(id);

            if (timer) {
                clearTimeout(timer);
                timers.delete(id);
            }

            const toast = this.toasts.find((t) => t.id === id);

            if (markSeen && toast?.notificationId != null) {
                // Fire-and-forget; a failed mark shouldn't block dismissal.
                api.post(`/user-notifications/${toast.notificationId}/read`).catch(() => {});
            }

            this.toasts = this.toasts.filter((t) => t.id !== id);
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
            this.unread = 0;
        },
    },
});

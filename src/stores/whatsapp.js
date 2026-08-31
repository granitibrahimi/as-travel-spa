import { defineStore } from 'pinia';
import api from '../helpers/api';
import { getEcho } from '../helpers/echo';
import { castPaginated, castMutation } from '../types/responses.js';

// WhatsApp inbox: the conversation list, the open thread and the live updates
// that keep both in sync. New-message + read events arrive on the shared
// private channel `whatsapp-inbox` (server-authorized via /broadcasting/auth
// against the bearer token — matches routes/channels.php on the platform).
const CHANNEL = 'whatsapp-inbox';

// Kept out of Pinia state on purpose: the live channel object holds
// non-serialisable socket internals.
let channel = null;

function upsert(list, conversation) {
    const index = list.findIndex((row) => row.id === conversation.id);

    if (index === -1) {
        list.unshift(conversation);
    } else {
        // Merge so a partial payload never wipes fields, then float to the top.
        list[index] = { ...list[index], ...conversation };
        list.unshift(list.splice(index, 1)[0]);
    }
}

export const useWhatsappStore = defineStore('whatsapp', {
    state: () => ({
        conversations: [],
        loadingList: false,
        subscribed: false,

        activeId: null,
        messages: [],
        loadingThread: false,
        olderPage: 1,
        hasOlder: false,
        sending: false,
    }),

    getters: {
        active: (state) => state.conversations.find((row) => row.id === state.activeId) ?? null,
        totalUnread: (state) => state.conversations.reduce((sum, row) => sum + (row.unread_count ?? 0), 0),
    },

    actions: {
        async loadConversations() {
            this.loadingList = true;

            try {
                const { data } = await api.get('/whatsapp/conversations');
                this.conversations = castPaginated(data).data;
            } finally {
                this.loadingList = false;
            }
        },

        async openConversation(id) {
            this.activeId = id;
            this.messages = [];
            this.olderPage = 1;
            this.loadingThread = true;

            try {
                const { data } = await api.get(`/whatsapp/conversations/${id}/messages`);
                const { data: rows, pagination } = castPaginated(data);
                // Endpoint returns newest-first; show oldest-first in the pane.
                this.messages = [...rows].reverse();
                this.hasOlder = (pagination.last_page ?? 1) > 1;
                this.markRead(id);
            } finally {
                this.loadingThread = false;
            }
        },

        async loadOlder() {
            if (!this.activeId || !this.hasOlder) {
                return;
            }

            const page = this.olderPage + 1;
            const { data } = await api.get(`/whatsapp/conversations/${this.activeId}/messages`, { params: { page } });
            const { data: rows, pagination } = castPaginated(data);

            this.messages = [...[...rows].reverse(), ...this.messages];
            this.olderPage = page;
            this.hasOlder = (pagination.current_page ?? page) < (pagination.last_page ?? page);
        },

        async sendReply(body, pauseAi = true) {
            if (!this.activeId || !body.trim() || this.sending) {
                return;
            }

            this.sending = true;

            try {
                await api.post(`/whatsapp/conversations/${this.activeId}/messages`, { body: body.trim(), pause_ai: pauseAi });
                // The broadcast event appends the message + updates the row.
                if (pauseAi && this.active) {
                    this.active.ai_enabled = false;
                }
            } finally {
                this.sending = false;
            }
        },

        async toggleAi(id, enabled) {
            await api.post(`/whatsapp/conversations/${id}/ai`, { enabled });
            const row = this.conversations.find((c) => c.id === id);
            if (row) {
                row.ai_enabled = enabled;
            }
        },

        async markRead(id) {
            const row = this.conversations.find((c) => c.id === id);

            if (!row || (row.unread_count ?? 0) === 0) {
                return;
            }

            row.unread_count = 0;

            try {
                await api.post(`/whatsapp/conversations/${id}/read`);
            } catch {
                // Non-fatal: the next list refresh will reconcile.
            }
        },

        // --- realtime ---------------------------------------------------------

        subscribe() {
            if (this.subscribed) {
                return;
            }

            const echo = getEcho();

            if (!echo) {
                // Echo connects on login/boot; retry once shortly after mount.
                setTimeout(() => this.subscribe(), 1200);
                return;
            }

            channel = echo.private(CHANNEL);
            channel.listen('.message', (payload) => this.onLiveMessage(payload));
            channel.listen('.read', (payload) => this.onLiveRead(payload));
            channel.error?.(() => {});

            this.subscribed = true;
        },

        unsubscribe() {
            if (channel) {
                getEcho()?.leave(`private-${CHANNEL}`);
                channel = null;
            }
            this.subscribed = false;
        },

        onLiveMessage({ message, conversation }) {
            if (!conversation) {
                return;
            }

            const isActive = conversation.id === this.activeId;
            const inbound = message?.direction === 1;

            // Don't let the server's unread bump land on the open conversation.
            const row = {
                ...conversation,
                unread_count: isActive ? 0 : (conversation.unread_count ?? 0),
            };
            upsert(this.conversations, row);

            if (isActive && message && !this.messages.some((m) => m.id === message.id)) {
                this.messages.push(message);

                if (inbound) {
                    this.markRead(this.activeId);
                }
            }
        },

        onLiveRead({ conversation_id: id }) {
            const row = this.conversations.find((c) => c.id === id);
            if (row) {
                row.unread_count = 0;
            }
        },
    },
});

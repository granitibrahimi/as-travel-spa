import { defineStore } from 'pinia';
import { getEcho } from '../helpers/echo';
import { useAuthStore } from './auth';

// A single presence channel everyone in the app subscribes to. Membership is
// authorized server-side (via /broadcasting/auth using our bearer token); the
// server decides who may join and what member payload — at minimum { id, name }
// — is shared with the rest of the channel.
const CHANNEL = 'online-users';

// The live Echo presence-channel object. Kept out of the Pinia state on purpose:
// it holds non-serialisable socket internals that must not be wrapped in a
// reactivity proxy.
let channel = null;

/**
 * Real-time roster of who is online and which page they are currently viewing.
 *
 * Presence membership (join/leave) comes from Reverb. The per-user *current
 * URL* is shared peer-to-peer using Pusher/Reverb client events ("whispers"):
 * every client re-announces its own location on navigation, and again whenever
 * someone new joins, so newcomers learn where everyone already is. This needs
 * client events enabled on the Reverb app (allow_client_messages / "Enable
 * client events").
 */
export const usePresenceStore = defineStore('presence', {
    state: () => ({
        joined: false,
        // Our own current location, mirrored into our own roster entry.
        currentUrl: null,
        // Roster keyed by user id: { id, name, url, self, at }.
        members: {},
    }),

    getters: {
        // Online users, self first, then alphabetical.
        users: (state) => Object.values(state.members).sort((a, b) => {
            if (a.self !== b.self) {
                return a.self ? -1 : 1;
            }

            return (a.name ?? '').localeCompare(b.name ?? '');
        }),

        count: (state) => Object.keys(state.members).length,
    },

    actions: {
        // Subscribe to the presence channel. Safe to call repeatedly; a no-op
        // until Echo is connected (i.e. until we hold a token).
        join() {
            const echo = getEcho();

            if (!echo || this.joined) {
                return;
            }

            channel = echo.join(CHANNEL);

            channel
                .here((members) => {
                    this.members = {};
                    members.forEach((member) => this.addMember(member));
                    // Tell everyone already here where we are.
                    this.broadcastLocation();
                })
                .joining((member) => {
                    this.addMember(member);
                    // A newcomer doesn't know our location yet — re-announce.
                    this.broadcastLocation();
                })
                .leaving((member) => {
                    delete this.members[member.id];
                })
                .listenForWhisper('location', (payload) => {
                    const member = this.members[payload?.id];

                    if (member) {
                        member.url = payload.url;
                        member.at = payload.at;
                    }
                })
                .error(() => {
                    // Authorization failed (no permission / auth endpoint down).
                    // Stay un-joined so the UI can show an empty/error state.
                    this.joined = false;
                    channel = null;
                });

            this.joined = true;
        },

        // Record our current location and share it with the channel.
        setLocation(url) {
            this.currentUrl = url;

            const auth = useAuthStore();
            const me = auth.user?.id != null ? this.members[auth.user.id] : null;

            if (me) {
                me.url = url;
                me.at = Date.now();
            }

            this.broadcastLocation();
        },

        broadcastLocation() {
            const auth = useAuthStore();

            if (!channel || !this.currentUrl || auth.user?.id == null) {
                return;
            }

            // Whisper = Pusher client event; delivered to every *other* member.
            channel.whisper('location', {
                id: auth.user.id,
                url: this.currentUrl,
                at: Date.now(),
            });
        },

        addMember(member) {
            const auth = useAuthStore();
            const isSelf = member.id === auth.user?.id;

            this.members[member.id] = {
                id: member.id,
                name: member.name ?? member.email ?? `User #${member.id}`,
                // We already know our own URL; others fill in via whispers.
                url: isSelf ? this.currentUrl : (this.members[member.id]?.url ?? null),
                self: isSelf,
                at: Date.now(),
            };
        },

        // Unsubscribe and clear the roster (called on logout / token loss).
        leave() {
            const echo = getEcho();
            echo?.leave(CHANNEL);
            channel = null;
            this.joined = false;
            this.members = {};
        },
    },
});
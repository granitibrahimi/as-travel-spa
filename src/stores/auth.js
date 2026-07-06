import { defineStore } from 'pinia';
import api, { getToken, setToken } from '../helpers/api';
import { connectEcho, disconnectEcho } from '../helpers/echo';

/**
 * Authentication state: the bearer token (persisted in localStorage) and the
 * current user with their permission hints from /api/v1/me.
 */
export const useAuthStore = defineStore('auth', {
    state: () => ({
        token: getToken(),
        user: null,
        ready: false,
    }),

    getters: {
        isAuthenticated: (state) => Boolean(state.token),
        isAdministrator: (state) => Boolean(state.user?.is_administrator),
    },

    actions: {
        can(permission) {
            const permissions = this.user?.permissions ?? [];

            return permissions.includes('*') || permissions.includes(permission);
        },

        canAny(permissions) {
            return permissions.some((permission) => this.can(permission));
        },

        async login(credentials) {
            const { data } = await api.post('/tokens', {
                ...credentials,
                device_name: 'spa',
            });

            this.token = data.token;
            setToken(data.token);
            this.user = data.user;
            connectEcho();
        },

        /**
         * Resolve the current user from a persisted token on app boot.
         * Clears the session if the token is no longer valid.
         */
        async bootstrap() {
            if (!this.token) {
                this.ready = true;

                return;
            }

            try {
                const { data } = await api.get('/me');
                this.user = data;
                connectEcho();
            } catch {
                this.reset();
            } finally {
                this.ready = true;
            }
        },

        async logout() {
            try {
                await api.delete('/tokens');
            } catch {
                // Even if the request fails, drop the local session.
            } finally {
                this.reset();
            }
        },

        reset() {
            this.token = null;
            this.user = null;
            setToken(null);
            disconnectEcho();
        },
    },
});

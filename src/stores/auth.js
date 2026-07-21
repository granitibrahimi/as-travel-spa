import { defineStore } from 'pinia';
import api, { getToken, setToken } from '../helpers/api';
import { connectEcho, disconnectEcho } from '../helpers/echo';
import { useFormOptionsStore } from './formOptions';
import { castResource } from '../types/responses.js';

/**
 * Authentication state: the bearer token (persisted in localStorage) and the
 * current user with their permission hints from /api/v1/users/me.
 */
export const useAuthStore = defineStore('auth', {
    state: () => ({
        token: getToken(),
        user: null,
        ready: false,
    }),

    getters: {
        isAuthenticated: (state) => Boolean(state.token),
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
            const { data } = await api.post('/users/tokens', {
                ...credentials,
                device_name: 'v-app',
            });

            // The tokens endpoint returns a resource envelope ({ data: { token, user } }).
            const payload = castResource(data);
            this.token = payload.token;
            setToken(payload.token);
            this.user = payload.user;
            connectEcho();

            // A real login is the one time we refresh shared form options from
            // the network; boot/refresh reuses the cache (see main.js).
            const formOptions = useFormOptionsStore();
            formOptions.hydrate();
            formOptions.sync({ showScreen: !formOptions.loaded });
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
                const { data } = await api.get('/users/me');
                // /me returns an API Resource ({ data: {...} }); unwrap so
                // permissions et al. sit at the top level of `user`.
                this.user = data.data ?? data;
                connectEcho();
            } catch {
                this.reset();
            } finally {
                this.ready = true;
            }
        },

        async logout() {
            try {
                await api.delete('/users/tokens');
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

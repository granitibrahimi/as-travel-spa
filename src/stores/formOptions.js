import { defineStore } from 'pinia';
import api from '../helpers/api';
import { useAuthStore } from './auth';

// Shared reference data used across forms (dropdown options). Cached in
// localStorage and refreshed from the form-options endpoint. Synced on login
// and on demand via the user-menu button; the SyncScreen overlay shows
// per-category progress.

export const CATEGORIES = [
    { key: 'payment_methods', label: 'Payment Methods' },
    { key: 'countries', label: 'Countries' },
    { key: 'meal_types', label: 'Meal Types' },
    { key: 'announcement_priorities', label: 'Announcement Priorities' },
    { key: 'customer_types', label: 'Customer Types' },
    { key: 'task_types', label: 'Task Types' },
];

// OPTIONS: GET /form-options?only=<key> -> resource collection { data: [ ...options ] }
const OPTIONS_URL = '/form-options';

const STORAGE_KEY = 'as.formOptions';

function readCache() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? null;
    } catch {
        return null;
    }
}

function writeCache(payload) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
        // Ignore quota / private-mode failures — cache is best-effort.
    }
}

function categoryOptions(response, key) {
    // The endpoint returns a resource collection: { data: [ ...options ] }.
    if (Array.isArray(response?.data)) {
        return response.data;
    }

    // Fallbacks for keyed / bare-array response shapes.
    if (Array.isArray(response)) {
        return response;
    }

    return response?.data?.[key] ?? response?.[key] ?? [];
}

export const useFormOptionsStore = defineStore('formOptions', {
    state: () => ({
        // Whose cache this is (options may be permission/tenant scoped).
        userId: null,
        data: {},       // { [key]: [...options] }
        loaded: false,

        // Sync UI state, consumed by SyncScreen.vue.
        status: 'idle', // 'idle' | 'syncing' | 'done' | 'error'
        showScreen: false,
        progress: [],   // [{ key, label, state: 'pending' | 'updating' | 'done' | 'error' }]
    }),

    getters: {
        paymentMethods: (state) => state.data.payment_methods ?? [],
        countries: (state) => state.data.countries ?? [],
        mealTypes: (state) => state.data.meal_types ?? [],
        announcementPriorities: (state) => state.data.announcement_priorities ?? [],
        customerTypes: (state) => state.data.customer_types ?? [],
        taskTypes: (state) => state.data.task_types ?? [],
        // Generic accessor: formOptions.options('payment_methods').
        options: (state) => (key) => state.data[key] ?? [],
    },

    actions: {
        // Load the cached snapshot into the store (fast paint), if it belongs to
        // the current user.
        hydrate() {
            const auth = useAuthStore();
            const cache = readCache();

            if (cache && cache.userId === auth.user?.id) {
                this.userId = cache.userId;
                this.data = cache.data ?? {};
                this.loaded = Object.keys(this.data).length > 0;
            }
        },

        persist() {
            writeCache({ userId: this.userId, data: this.data });
        },

        /**
         * Re-download all configured categories.
         * @param {object} opts
         * @param {boolean} opts.force      Show the screen for a manual "Update".
         * @param {boolean} opts.showScreen Render the progress overlay (default true).
         */
        async sync({ force = false, showScreen = true } = {}) {
            const auth = useAuthStore();
            const userId = auth.user?.id ?? null;

            // Cache belongs to a different user → drop it.
            if (this.userId !== userId) {
                this.userId = userId;
                this.data = {};
                this.loaded = false;
            }

            this.status = 'syncing';
            this.progress = CATEGORIES.map((category) => ({
                key: category.key,
                label: category.label,
                state: 'pending',
            }));
            this.showScreen = showScreen || force;

            // Fetch all categories in parallel; each ticks its own row so the
            // screen fills in progressively as responses land.
            await Promise.all(CATEGORIES.map(async (category) => {
                this.setState(category.key, 'updating');

                try {
                    const { data } = await api.get(OPTIONS_URL, { params: { only: category.key } });
                    this.data = { ...this.data, [category.key]: categoryOptions(data, category.key) };
                    this.setState(category.key, 'done');
                } catch {
                    this.setState(category.key, 'error');
                }
            }));

            this.status = this.progress.some((item) => item.state === 'error') ? 'error' : 'done';
            this.loaded = Object.keys(this.data).length > 0;
            this.persist();
        },

        setState(key, state) {
            this.progress = this.progress.map((item) => (item.key === key ? { ...item, state } : item));
        },

        dismiss() {
            this.showScreen = false;
        },

        // Drop everything (on logout / user switch).
        clear() {
            this.userId = null;
            this.data = {};
            this.loaded = false;
            this.status = 'idle';
            this.showScreen = false;
            this.progress = [];

            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch {
                // Ignore.
            }
        },
    },
});

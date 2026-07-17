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
    { key: 'user_roles', label: 'User Roles' },
    { key: 'products', label: 'Products' },
    { key: 'parent_destinations', label: 'Parent Destinations' },
    { key: 'customer_transactions_types', label: 'Customer Transaction Types' },
    { key: 'supplier_transactions_types', label: 'Supplier Transaction Types' },
    { key: 'person_contact_reference_types', label: 'Person Contact Reference Types' },
    { key: 'person_genders', label: 'Person Genders' },
    { key: 'person_classifications', label: 'Person Classifications' },
    { key: 'task_sources', label: 'Task Sources' },
    { key: 'destinations', label: 'Destinations' },
    { key: 'accounts', label: 'Accounts' },
    { key: 'tax_types', label: 'Tax Types' },
    { key: 'payment_method_types', label: 'Payment Method Types' },
    { key: 'cash_accounts', label: 'Cash Accounts' },
    { key: 'user_log_types', label: 'User Log Types' },
];

// Static (non-synced) option lists shared across pages. Kept here alongside the
// synced reference data so forms have one place to import option lists from.
export const TRANSACTION_STATUS_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'closed', label: 'Closed' },
];

// Normalize a raw option list into the { value, label } shape the Select /
// AsyncSelect components expect, tolerating the API's { id, name } variants.
export const toOptions = (list) => (list ?? []).map((option) => ({
    value: option.value ?? option.id,
    label: option.label ?? option.name,
}));

// OPTIONS: GET /form-options?only=<key> -> resource collection { data: [ ...options ] }
const OPTIONS_URL = '/form-options';

const STORAGE_KEY = 'as.formOptions';

// How long a cached snapshot is considered fresh. Within this window the boot
// sync is skipped so a page refresh doesn't re-download every category; after
// it, the next boot refreshes silently in the background. The user-menu
// "Update data" button always forces an immediate re-sync.
const TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

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
        syncedAt: null, // epoch ms of the last successful sync (for TTL/staleness)

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
        userRoles: (state) => state.data.user_roles ?? [],
        products: (state) => state.data.products ?? [],
        parentDestinations: (state) => state.data.parent_destinations ?? [],
        customerTransactionTypes: (state) => state.data.customer_transactions_types ?? [],
        supplierTransactionTypes: (state) => state.data.supplier_transactions_types ?? [],
        personContractReferenceTypes: (state) => state.data.person_contact_reference_types ?? [],
        personGenders: (state) => state.data.person_genders ?? [],
        personClassifications: (state) => state.data.person_classifications ?? [],
        taskSources: (state) => state.data.task_sources ?? [],
        destinations: (state) => state.data.destinations ?? [],
        accounts: (state) => state.data.accounts ?? [],
        taxTypes: (state) => state.data.tax_types ?? [],
        paymentMethodTypes: (state) => state.data.payment_method_types ?? [],
        cashAccounts: (state) => state.data.cash_accounts ?? [],
        userLogTypes: (state) => state.data.user_log_types ?? [],
        // Generic accessor: formOptions.options('payment_methods').
        options: (state) => (key) => state.data[key] ?? [],
        // Cache is stale when it was never synced or the TTL has elapsed.
        isStale: (state) => !state.syncedAt || (Date.now() - state.syncedAt) > TTL_MS,
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
                this.syncedAt = cache.syncedAt ?? null;
                this.loaded = Object.keys(this.data).length > 0;
            }
        },

        persist() {
            writeCache({ userId: this.userId, data: this.data, syncedAt: this.syncedAt });
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
                this.syncedAt = null;
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
            // Only stamp a fresh sync time when everything landed, so a partial
            // (errored) sync stays stale and is retried on the next boot.
            if (this.status === 'done') {
                this.syncedAt = Date.now();
            }
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
            this.syncedAt = null;
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

import { defineStore } from 'pinia';
import api from '../helpers/api';
import { useAuthStore } from './auth';

// Shared reference data used across forms (dropdown options). Cached in
// localStorage and refreshed from the form-options endpoint. Synced on login
// and on demand via the user-menu button; the SyncScreen overlay shows
// per-category progress. The endpoint is the single source of truth for which
// categories exist and their labels — see `titles` below.

// Fallback label for a category the endpoint gave no `title` for:
// 'payment_methods' → 'Payment Methods'.
const humanizeKey = (key) => String(key)
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

// Coerce a category value into a plain array. Accepts an array (returned as-is)
// or a keyed object — { "1": { value, label } } → its values, { all: "All" } →
// [{ value: 'all', label: 'All' }] — so a legacy/stale cache that stored the raw
// keyed shape can't blow up array consumers. Anything else → [].
function toArray(value) {
    if (Array.isArray(value)) {
        return value;
    }

    if (value && typeof value === 'object') {
        return Object.entries(value).map(([key, entry]) => (
            entry && typeof entry === 'object' ? entry : { value: key, label: entry }
        ));
    }

    return [];
}

// Normalize a raw option list into the { value, label } shape the Select /
// AsyncSelect components expect, tolerating the API's { id, name } variants.
// Defensive against non-array inputs (see toArray).
export const toOptions = (list) => toArray(list).map((option) => ({
    value: option.value ?? option.id,
    label: option.label ?? option.name,
}));


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

// Each category arrives wrapped as { title, data }. Its `data` is one of:
//   • a plain array of options ([{ id, name }, …] or richer rows),
//   • a keyed object of objects ({ "1": { value, label }, … }), or
//   • a keyed object of strings ({ all: "All", open: "Open", … }).
// Flatten every shape to a plain array so the getters and toOptions() see one
// consistent structure. Array rows are preserved verbatim (destinations /
// accounts carry extra fields beyond value/label).
function normalizeCategory(entry) {
    return toArray(entry?.data ?? entry);
}

export const useFormOptionsStore = defineStore('formOptions', {
    state: () => ({
        // Whose cache this is (options may be permission/tenant scoped).
        userId: null,
        data: {},       // { [key]: [...options] }
        titles: {},     // { [key]: display label } — from each category's `title`
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
        accountClassifications: (state) => state.data.account_classifications ?? [],
        accounts: (state) => state.data.accounts ?? [],
        billAccounts: (state) => state.data.bill_accounts ?? [],
        taxTypes: (state) => state.data.tax_types ?? [],
        paymentMethodTypes: (state) => state.data.payment_method_types ?? [],
        cashAccounts: (state) => state.data.cash_accounts ?? [],
        userLogTypes: (state) => state.data.user_log_types ?? [],
        customerInvoiceDocumentTypes: (state) => state.data.customer_invoice_document_types ?? [],
        transactionStatusOptions: (state) => state.data.transaction_status_options ?? [],
        vacationRequestTypes: (state) => state.data.vacation_request_types ?? [],
        // Generic accessor: formOptions.options('payment_methods').
        options: (state) => (key) => state.data[key] ?? [],
        // The cached categories as { key, label } — derived from the last sync
        // (label from the endpoint's `title`, else a humanized key). Replaces the
        // old static CATEGORIES list.
        categoryList: (state) => Object.keys(state.data).map((key) => ({
            key,
            label: state.titles[key] ?? humanizeKey(key),
        })),
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
                // Coerce every cached category to an array — snapshots written by
                // an earlier store version may hold the raw keyed-object shape.
                this.data = Object.fromEntries(
                    Object.entries(cache.data ?? {}).map(([key, value]) => [key, toArray(value)]),
                );
                this.titles = cache.titles ?? {};
                this.syncedAt = cache.syncedAt ?? null;
                this.loaded = Object.keys(this.data).length > 0;
            }
        },

        persist() {
            writeCache({
                userId: this.userId,
                data: this.data,
                titles: this.titles,
                syncedAt: this.syncedAt,
            });
        },

        /**
         * Re-download every category the endpoint offers.
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
                this.titles = {};
                this.loaded = false;
                this.syncedAt = null;
            }

            this.status = 'syncing';
            // Seed progress rows from what we already know (the previous cache);
            // on a cold first sync this is empty and fills once the response lands.
            this.progress = this.categoryList.map((category) => ({
                ...category,
                state: 'updating',
            }));
            this.showScreen = showScreen || force;

            try {
                // One request returns every category, each wrapped as
                // { title, data }: { data: { payment_methods: { title, data }, … } }.
                const { data: payload } = await api.get('/form-options');
                const categories = payload?.data ?? payload ?? {};

                // Normalize each category's `data` (array or keyed object) into a
                // plain array, and capture its `title` for labels. The endpoint is
                // the sole source of which categories exist.
                const nextData = { ...this.data };
                const nextTitles = { ...this.titles };
                Object.entries(categories).forEach(([key, entry]) => {
                    nextData[key] = normalizeCategory(entry);

                    if (entry?.title) {
                        nextTitles[key] = entry.title;
                    }
                });
                this.data = nextData;
                this.titles = nextTitles;

                // Rebuild progress from the actual response so a first (cold) sync
                // shows rows too, all resolved together (the fetch is atomic).
                this.progress = Object.keys(categories).map((key) => ({
                    key,
                    label: nextTitles[key] ?? humanizeKey(key),
                    state: 'done',
                }));
                this.status = 'done';
            } catch {
                // The bulk fetch is all-or-nothing; mark every row failed so the
                // snapshot stays stale and the next boot retries.
                this.progress = this.progress.map((item) => ({ ...item, state: 'error' }));
                this.status = 'error';
            }

            this.loaded = Object.keys(this.data).length > 0;
            // Only stamp a fresh sync time when everything landed, so a partial
            // (errored) sync stays stale and is retried on the next boot.
            if (this.status === 'done') {
                this.syncedAt = Date.now();
            }
            this.persist();
        },

        dismiss() {
            this.showScreen = false;
        },

        // Drop everything (on logout / user switch).
        clear() {
            this.userId = null;
            this.data = {};
            this.titles = {};
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

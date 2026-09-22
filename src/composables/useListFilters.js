import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

/**
 * State for a filtered, paginated list page, kept in the URL query string so
 * the browser's Back button (e.g. list → show → back) restores the same
 * filters and page instead of resetting to page 1.
 *
 *   const { filters, response, loading, apply, clear, goToPage, reload } = useListFilters(
 *       { q: '', from_account_id: null, date_from: '', cash_approvals: false },
 *       async (params, { signal }) => castPaginated((await api.get('/x', { params, signal })).data),
 *   );
 *
 * - `defaults` keys are the API param names. Their types drive parsing back
 *   from the URL: boolean → `1`/absent, string stays a string, null/number →
 *   number when numeric, array → list. Blank values (''/null/false/[]) are not
 *   sent to the API.
 * - `loader(params, { signal })` fetches with `{ ...appliedFilters, page }` and
 *   returns what ends up in `response`. Earlier requests are aborted.
 * - The URL only carries values that differ from `defaults` (plus `page` > 1);
 *   it's updated with `router.replace`, so filtering doesn't add history
 *   entries.
 * - `activeCount` counts the *applied* non-blank filters (for FiltersButton).
 * - `urlOnly` keys are kept in the URL but never sent or counted — e.g. the
 *   display label of an AsyncSelect value, so it can be shown again on Back.
 * - Filters are read from the URL synchronously, before the first render, so
 *   inputs that only read their initial value (AsyncSelect's initialOption)
 *   see the restored state.
 */
export function useListFilters(defaults, loader, { urlOnly = [] } = {}) {
    const keys = Object.keys(defaults);
    const route = useRoute();
    const router = useRouter();
    const ownPath = route.path;

    const filters = reactive(clone(defaults));
    const applied = ref({});
    const page = ref(1);
    const response = ref(null);
    const loading = ref(false);
    const showFilters = ref(false);

    const activeCount = computed(() => Object.keys(applied.value).length);

    let controller = null;
    let lastQuery = null;

    function apiParams() {
        return Object.fromEntries(
            keys
                .filter((key) => ! urlOnly.includes(key) && ! isBlank(filters[key]))
                .map((key) => [key, filters[key] === true ? 1 : filters[key]]),
        );
    }

    function buildQuery() {
        const query = {};

        for (const key of keys) {
            const value = toQueryValue(filters[key]);

            if (! sameValue(value, toQueryValue(defaults[key]))) {
                query[key] = value;
            }
        }

        if (page.value > 1) {
            query.page = String(page.value);
        }

        return query;
    }

    function readRoute() {
        for (const key of keys) {
            filters[key] = key in route.query
                ? fromQueryValue(route.query[key], defaults[key])
                : clone(defaults[key]);
        }

        page.value = Math.max(1, Number(route.query.page) || 1);
        lastQuery = serialize(route.query);
    }

    async function load() {
        controller?.abort();
        const current = new AbortController();
        controller = current;
        loading.value = true;
        applied.value = apiParams();

        try {
            response.value = await loader({ ...applied.value, page: page.value }, { signal: current.signal });
        } catch (error) {
            if (error.code !== 'ERR_CANCELED') {
                throw error;
            }
        } finally {
            if (controller === current) {
                loading.value = false;
            }
        }
    }

    function syncUrlAndLoad() {
        // Keep query params this list doesn't own (e.g. a `?supplier_id=` deep link).
        const foreign = Object.fromEntries(Object.entries(route.query).filter(([key]) => ! keys.includes(key) && key !== 'page'));
        const query = { ...foreign, ...buildQuery() };
        lastQuery = serialize(query);
        router.replace({ query });

        return load();
    }

    /** Apply the current filter inputs, starting from page 1. */
    function apply() {
        page.value = 1;

        return syncUrlAndLoad();
    }

    /** Reset every filter to its default and reload from page 1. */
    function clear() {
        Object.assign(filters, clone(defaults));

        return apply();
    }

    function goToPage(target) {
        page.value = target;

        return syncUrlAndLoad();
    }

    /** Re-fetch the current page with the applied filters (e.g. after a delete). */
    function reload() {
        return load();
    }

    // The URL changed under us (Back/Forward within the list, or clicking the
    // nav link again, which drops the query): follow it.
    watch(() => route.query, (query) => {
        if (route.path !== ownPath || serialize(query) === lastQuery) {
            return;
        }

        readRoute();
        load();
    });

    readRoute();
    onMounted(load);

    return { filters, applied, activeCount, page, response, loading, showFilters, apply, clear, goToPage, reload };
}

function isBlank(value) {
    return value === undefined || value === null || value === '' || value === false
        || (Array.isArray(value) && value.length === 0);
}

function clone(value) {
    return structuredClone(value);
}

function toQueryValue(value) {
    if (value === true) {
        return '1';
    }

    if (value === false || value === null || value === undefined) {
        return '';
    }

    if (Array.isArray(value)) {
        return value.map(String);
    }

    return String(value);
}

function fromQueryValue(raw, fallback) {
    if (Array.isArray(fallback)) {
        return [].concat(raw ?? []).filter((item) => item !== '').map(numberish);
    }

    const value = Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '');

    if (typeof fallback === 'boolean') {
        return value === '1' || value === 'true';
    }

    if (typeof fallback === 'string') {
        return value;
    }

    // null / number defaults: ids from selects.
    return value === '' ? null : numberish(value);
}

function numberish(value) {
    return /^-?\d+$/.test(value) ? Number(value) : value;
}

function sameValue(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

function serialize(query) {
    return JSON.stringify(Object.keys(query).sort().map((key) => [key, query[key]]));
}

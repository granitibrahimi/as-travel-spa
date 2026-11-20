import { onBeforeUnmount, watch } from 'vue';

/**
 * Applies a useListFilters list as its filters change: right away for
 * selects and dates, after a short pause while the search box is typed in.
 * Back/Forward also rewrite `filters`, but those match what was just
 * loaded (`applied`), so they don't trigger a second load.
 *
 *   const { filters, applied, apply } = useListFilters(...);
 *   useLiveFilters(filters, applied, apply);
 */
export function useLiveFilters(filters, applied, apply, { searchKey = 'q', delay = 300 } = {}) {
    let timer = null;
    let lastSearch = filters[searchKey];

    function currentParams() {
        return Object.fromEntries(Object.entries(filters)
            .filter(([, value]) => ! (value === '' || value === null || value === undefined || value === false || (Array.isArray(value) && value.length === 0)))
            .map(([key, value]) => [key, value === true ? 1 : value]));
    }

    watch(() => JSON.stringify(currentParams()), (now) => {
        clearTimeout(timer);

        const typing = filters[searchKey] !== lastSearch;
        lastSearch = filters[searchKey];

        if (now === JSON.stringify(applied.value)) {
            return;
        }

        timer = setTimeout(apply, typing ? delay : 0);
    });

    onBeforeUnmount(() => clearTimeout(timer));
}

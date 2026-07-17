<script setup>
import { computed } from 'vue';
import { normalizePagination } from '../types/pagination';

/**
 * Pagination for API-driven tables: same look as Pagination.vue but instead of
 * performing Inertia visits it emits the page number so the parent can refetch
 * over axios.
 *
 * Pass the paginator meta object directly (e.g. `invoices.pagination`); it is
 * normalized to a {@link import('../types/pagination').PaginationMeta} (see
 * src/types/pagination.js). Page buttons are derived from
 * current_page/last_page (no reliance on a server-built `links` array) and
 * windowed so large page counts stay compact.
 */
const props = defineProps({
    // The pagination meta object; normalized via normalizePagination().
    paginator: {
        type: Object,
        required: true,
        validator: (value) => value != null && typeof value === 'object',
    },
});

const emit = defineEmits(['page']);

/** @type {import('vue').ComputedRef<import('../types/pagination').PaginationMeta>} */
const meta = computed(() => normalizePagination(props.paginator));

const currentPage = computed(() => meta.value.current_page);
const lastPage = computed(() => meta.value.last_page);

const hasPages = computed(() => lastPage.value > 1);

// Windowed page list: first, last, and neighbours of the current page, with
// '…' gaps in between. e.g. 1 … 4 5 6 … 1874
const pages = computed(() => {
    const last = lastPage.value;
    const current = currentPage.value;

    if (last <= 1) {
        return [];
    }

    const delta = 1;
    const left = Math.max(2, current - delta);
    const right = Math.min(last - 1, current + delta);
    // Page numbers interleaved with '…' gaps.
    const result = [1];

    if (left > 2) {
        result.push('…');
    }

    for (let page = left; page <= right; page++) {
        result.push(page);
    }

    if (right < last - 1) {
        result.push('…');
    }

    result.push(last);

    return result;
});

function goTo(page) {
    if (page < 1 || page > lastPage.value || page === currentPage.value) {
        return;
    }

    emit('page', page);
}
</script>

<template>
    <div class="flex flex-wrap items-center justify-between gap-3">
        <div v-if="hasPages" class="flex flex-wrap gap-1">
            <button
                type="button"
                class="rounded border px-3 py-1 text-sm"
                :class="currentPage <= 1 ? 'border-gray-300 text-gray-400' : 'border-gray-300 hover:bg-gray-50'"
                :disabled="currentPage <= 1"
                @click="goTo(currentPage - 1)"
            >
                ‹
            </button>

            <component
                :is="typeof page === 'number' ? 'button' : 'span'"
                v-for="(page, i) in pages"
                :key="i"
                type="button"
                class="rounded border px-3 py-1 text-sm"
                :class="[
                    page === currentPage ? 'border-red-600 bg-red-600 text-white' : 'border-gray-300',
                    typeof page === 'number' && page !== currentPage ? 'hover:bg-gray-50' : '',
                    typeof page !== 'number' ? 'border-transparent text-gray-400' : '',
                ]"
                @click="typeof page === 'number' && goTo(page)"
            >
                {{ page }}
            </component>

            <button
                type="button"
                class="rounded border px-3 py-1 text-sm"
                :class="currentPage >= lastPage ? 'border-gray-300 text-gray-400' : 'border-gray-300 hover:bg-gray-50'"
                :disabled="currentPage >= lastPage"
                @click="goTo(currentPage + 1)"
            >
                ›
            </button>
        </div>
        <div v-else />

        <span class="text-sm text-gray-500">
            Page {{ meta.current_page }}. Per page: {{ meta.per_page }}. Total: {{ meta.total }}
        </span>
    </div>
</template>

<script setup>
import { computed } from 'vue';

/**
 * Pagination for API-driven tables: same look as Pagination.vue but instead of
 * performing Inertia visits it emits the page number so the parent can refetch
 * over axios.
 */
const props = defineProps({
    // A Laravel paginator as returned by a JSON endpoint (data, links, total, ...).
    paginator: { type: Object, required: true },
});

const emit = defineEmits(['page']);

const hasPages = computed(() => (props.paginator.links?.length ?? 0) > 3);

function visit(link) {
    if (! link.url) {
        return;
    }

    const page = new URL(link.url, window.location.origin).searchParams.get('page');

    if (page) {
        emit('page', Number(page));
    }
}
</script>

<template>
    <div class="flex flex-wrap items-center justify-between gap-3">
        <div v-if="hasPages" class="flex flex-wrap gap-1">
            <component
                :is="link.url ? 'button' : 'span'"
                v-for="(link, i) in paginator.links"
                :key="i"
                type="button"
                class="rounded border px-3 py-1 text-sm"
                :class="[
                    link.active ? 'border-red-600 bg-red-600 text-white' : 'border-gray-300',
                    link.url ? 'hover:bg-gray-50' : 'text-gray-400',
                ]"
                @click="visit(link)"
                v-html="link.label"
            />
        </div>
        <div v-else />

        <span class="text-sm text-gray-500">
            Page {{ paginator.current_page ?? 1 }}. Per page: {{ paginator.per_page ?? 0 }}. Total: {{ paginator.total ?? 0 }}
        </span>
    </div>
</template>

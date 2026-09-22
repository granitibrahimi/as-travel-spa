<script setup>
/**
 * Header toggle for a list's filter panel (pair with FiltersPanel). Put it in
 * FullWidthBox's #actions slot; `count` is the number of filters in use.
 */
const open = defineModel({ type: Boolean, default: false });

defineProps({
    count: {
        type: Number,
        default: 0,
    },
});
</script>

<template>
    <button
        type="button"
        class="inline-flex h-8 items-center gap-1.5 rounded border bg-white px-3 text-sm font-medium transition-colors hover:bg-gray-50"
        :class="open ? 'border-red-400 text-red-600' : 'border-gray-300 text-gray-700'"
        :aria-expanded="open"
        @click="open = ! open"
    >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 5h18l-7 8.5V19l-4 2v-7.5L3 5z" />
        </svg>
        Filters
        <span
            v-if="count"
            class="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-semibold text-white"
        >
            {{ count }}
        </span>
        <svg
            class="h-3.5 w-3.5 text-gray-400 transition-transform duration-300"
            :class="{ 'rotate-180': open }"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
        >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
    </button>
</template>

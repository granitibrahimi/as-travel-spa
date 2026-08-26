<script setup>
import { computed } from 'vue';

// Generic results table for report pages whose row shape isn't known yet
// (e.g. while the backend endpoint is still pending) — columns are derived
// from the first row's keys instead of being hardcoded, so it renders
// something sensible for whatever shape the real endpoint ends up returning.
// Once a report's columns are known, prefer a page-specific table instead.
const props = defineProps({
    rows: { type: Array, default: () => [] },
    emptyMessage: { type: String, default: 'No data for this range.' },
});

const columns = computed(() => (props.rows.length ? Object.keys(props.rows[0]) : []));

function humanize(key) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function isNumeric(value) {
    return typeof value === 'number';
}
</script>

<template>
    <div class="overflow-x-auto">
        <table class="w-full text-sm">
            <thead>
                <tr class="text-left text-xs uppercase text-gray-500">
                    <th v-for="col in columns" :key="col" class="border border-gray-300 px-2 py-2">{{ humanize(col) }}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(row, i) in rows" :key="i" class="hover:bg-gray-50">
                    <td
                        v-for="col in columns"
                        :key="col"
                        class="border border-gray-300 px-2 py-2"
                        :class="isNumeric(row[col]) ? 'text-right tabular-nums' : ''"
                    >{{ row[col] ?? '—' }}</td>
                </tr>
                <tr v-if="! rows.length">
                    <td :colspan="columns.length || 1" class="border border-gray-300 px-2 py-6 text-center text-gray-400">{{ emptyMessage }}</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

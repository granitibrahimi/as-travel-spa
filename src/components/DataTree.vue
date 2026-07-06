<script setup>
/**
 * Renders an arbitrary JSON value (object / array / primitive) as an indented
 * key/value tree. Recurses into itself for nested branches, so it can display
 * any shape without knowing the schema up front.
 */
defineProps({
    data: {
        // Any JSON value — no default type constraint on purpose.
        default: undefined,
    },
});

// A "branch" is a non-empty object or array we should recurse into. Everything
// else (primitives, null, empty object/array) is a leaf we print directly.
function isBranch(value) {
    return value !== null && typeof value === 'object' && Object.keys(value).length > 0;
}

function formatLeaf(value) {
    if (value === null) {
        return 'null';
    }

    if (value === undefined) {
        return '—';
    }

    if (typeof value === 'object') {
        // Empty object / array.
        return Array.isArray(value) ? '[ ]' : '{ }';
    }

    return String(value);
}

function leafClass(value) {
    if (value === null || value === undefined) {
        return 'text-gray-400 italic';
    }

    switch (typeof value) {
        case 'boolean':
            return value ? 'text-green-600 font-medium' : 'text-red-600 font-medium';
        case 'number':
            return 'text-blue-600';
        default:
            return 'text-gray-800 break-all';
    }
}
</script>

<template>
    <div v-if="isBranch(data)" class="space-y-1">
        <div v-for="(value, key) in data" :key="key">
            <div class="flex flex-wrap items-baseline gap-x-2">
                <span class="font-mono text-xs font-semibold text-gray-500">{{ key }}</span>
                <span v-if="!isBranch(value)" class="text-sm" :class="leafClass(value)">{{ formatLeaf(value) }}</span>
            </div>
            <div v-if="isBranch(value)" class="ml-3 border-l border-gray-200 pl-3">
                <DataTree :data="value" />
            </div>
        </div>
    </div>
    <span v-else class="text-sm" :class="leafClass(data)">{{ formatLeaf(data) }}</span>
</template>
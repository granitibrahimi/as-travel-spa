<script setup>
// The request type (Ticket, Hotel, Package, Tour, Unknown) as a small bordered chip.
const props = defineProps({
    type: { type: Object, default: null },
    size: { type: String, default: 'sm' }, // sm (cards, list) | md (request page)
});

const COLORS = {
    1: 'border-sky-300 text-sky-700',
    2: 'border-emerald-300 text-emerald-700',
    3: 'border-violet-300 text-violet-700',
    4: 'border-amber-300 text-amber-700',
    5: 'border-gray-300 text-gray-500',
};
</script>

<template>
    <span
        v-if="props.type"
        class="inline-flex items-center rounded border bg-white font-semibold uppercase"
        :class="[COLORS[props.type.id] ?? COLORS[5], props.size === 'md' ? 'px-2 py-0.5 text-xs' : 'px-1.5 py-0.5 text-[10px]']"
        :title="`Type: ${props.type.name}`"
    >{{ props.type.name }}</span>
</template>

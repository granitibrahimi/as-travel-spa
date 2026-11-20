<script setup>
// "From Flamur" / "From Vesa" label for requests passed on by them (highest priority).
defineProps({
    task: { type: Object, required: true },
    size: { type: String, default: 'sm' },
});
</script>

<template>
    <template v-for="name in [task.from_flamur ? 'Flamur' : null, task.from_vesa ? 'Vesa' : null].filter(Boolean)" :key="name">
        <span
            class="whitespace-nowrap rounded bg-red-700 font-bold uppercase text-white"
            :class="size === 'md' ? 'px-2 py-0.5 text-xs' : 'px-1.5 py-0.5 text-[10px]'"
        >From {{ name }}</span>
    </template>
</template>

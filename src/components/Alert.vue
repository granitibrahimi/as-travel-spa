<script setup>
import { computed } from 'vue';

const props = defineProps({
    type: {
        type: String,
        default: 'info',
        validator: (value) => ['info', 'warning', 'danger', 'success'].includes(value),
    },
});

const classes = computed(() => ({
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    danger: 'bg-red-50 border-red-200 text-red-800',
    success: 'bg-green-50 border-green-200 text-green-800',
}[props.type]));
</script>

<template>
    <div class="rounded-md border px-3 py-2 text-sm" :class="classes">
        <slot />
    </div>
</template>

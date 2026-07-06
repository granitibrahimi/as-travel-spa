<script setup>
import { computed } from 'vue';

const props = defineProps({
    variant: {
        type: String,
        default: 'secondary',
        validator: (value) => ['primary', 'secondary', 'danger'].includes(value),
    },
    // 'md' matches the 38px form controls; 'sm' is for compact spots (table rows, box footers).
    size: {
        type: String,
        default: 'md',
        validator: (value) => ['sm', 'md'].includes(value),
    },
    // When set the button renders as an anchor.
    href: { type: String, default: null },
    type: { type: String, default: 'button' },
    disabled: { type: Boolean, default: false },
});

const classes = computed(() => [
    'inline-flex items-center justify-center gap-1.5 rounded font-normal transition-colors disabled:opacity-60 disabled:pointer-events-none',
    {
        md: 'px-4 py-1.5 text-base leading-normal',
        sm: 'px-3 py-1 text-sm',
    }[props.size],
    {
        primary: 'bg-red-600 text-white hover:bg-red-700',
        secondary: 'border border-gray-300 bg-white hover:bg-gray-50',
        danger: 'bg-red-50 text-red-600 hover:bg-red-100',
    }[props.variant],
]);
</script>

<template>
    <a v-if="href" :href="href" :class="classes">
        <slot />
    </a>
    <button v-else :type="type" :disabled="disabled" :class="classes">
        <slot />
    </button>
</template>

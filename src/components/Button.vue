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
    // Shows an inline spinner and blocks interaction while an action runs.
    loading: { type: Boolean, default: false },
});

// Spinner inherits the button's text color (border-current) and matches its size.
const spinnerClass = computed(() => [
    'inline-block animate-spin rounded-full border-2 border-current border-t-transparent',
    props.size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4',
]);

// Border rule: every button keeps a `border` (width) on the base, and each
// variant sets its OWN border color exactly once — so there is never a
// `border-transparent`/`border-gray-300` conflict (whose winner would depend on
// stylesheet order, not class order). A white-background / dark-text button
// (secondary) therefore ALWAYS shows a visible border; the borderless variants
// (primary/danger) use a transparent border to keep the same height as the
// bordered ones and the 38px form controls. Any new white/dark button — here or
// hand-rolled elsewhere — must follow this: white background ⇒ visible border.
const classes = computed(() => [
    'inline-flex items-center justify-center gap-1.5 rounded border font-normal transition-colors disabled:opacity-60 disabled:pointer-events-none',
    {
        md: 'px-4 py-1.5 text-base leading-normal',
        sm: 'px-3 py-1 text-sm',
    }[props.size],
    {
        primary: 'border-transparent bg-red-600 text-white hover:bg-red-700',
        secondary: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
        danger: 'border-transparent bg-red-50 text-red-600 hover:bg-red-100',
    }[props.variant],
]);
</script>

<template>
    <a v-if="href" :href="href" :class="classes">
        <span v-if="loading" :class="spinnerClass" aria-hidden="true" />
        <slot />
    </a>
    <button v-else :type="type" :disabled="disabled || loading" :class="classes">
        <span v-if="loading" :class="spinnerClass" aria-hidden="true" />
        <slot />
    </button>
</template>

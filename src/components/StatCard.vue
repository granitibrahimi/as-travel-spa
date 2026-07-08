<script setup>
/**
 * A single dashboard KPI: a label, a primary value and an optional sub-line.
 * Set `accent` to highlight the headline figure (e.g. cash on hand).
 *
 * When `animate` is set and `value` is a number, the figure counts up (or down)
 * to its new target whenever it changes — pass a `format` function to render the
 * running number (e.g. `money`).
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps({
    label: { type: String, required: true },
    value: { type: [String, Number], required: true },
    sub: { type: String, default: '' },
    accent: { type: Boolean, default: false },
    animate: { type: Boolean, default: false },
    format: { type: Function, default: null },
    duration: { type: Number, default: 700 },
});

const current = ref(props.animate && typeof props.value === 'number' ? 0 : props.value);
let frame = null;
let startTime = null;

// Ease-out so the count decelerates as it approaches the target.
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

function animateTo(from, to) {
    cancelAnimationFrame(frame);
    startTime = null;

    const step = (now) => {
        if (startTime === null) {
            startTime = now;
        }

        const progress = Math.min((now - startTime) / props.duration, 1);
        current.value = from + (to - from) * easeOut(progress);

        if (progress < 1) {
            frame = requestAnimationFrame(step);
        } else {
            current.value = to;
        }
    };

    frame = requestAnimationFrame(step);
}

watch(
    () => props.value,
    (next, prev) => {
        if (! props.animate || typeof next !== 'number') {
            return;
        }

        animateTo(typeof prev === 'number' ? prev : 0, next);
    },
);

onMounted(() => {
    if (props.animate && typeof props.value === 'number') {
        animateTo(0, props.value);
    }
});

onBeforeUnmount(() => cancelAnimationFrame(frame));

function display() {
    if (! props.animate || typeof props.value !== 'number') {
        return props.value;
    }

    // Count in whole numbers while animating, but render the exact target on the
    // final frame so formatted values (e.g. money cents) aren't rounded away.
    const n = current.value === props.value ? props.value : Math.round(current.value);

    return props.format ? props.format(n) : n;
}
</script>

<template>
    <div
        class="rounded-lg border p-4 shadow-sm"
        :class="accent ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'"
    >
        <p class="text-xs font-medium uppercase tracking-wide text-gray-500">{{ label }}</p>
        <p class="mt-1 text-2xl font-bold" :class="accent ? 'text-red-700' : 'text-gray-900'">
            {{ display() }}
        </p>
        <p v-if="sub" class="mt-0.5 text-xs text-gray-400">{{ sub }}</p>
    </div>
</template>
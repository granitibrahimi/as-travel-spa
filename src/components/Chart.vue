<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Chart from 'chart.js/auto';

/**
 * Thin reusable wrapper around Chart.js. Pass a Chart.js `type`, `data` and
 * `options`; the chart re-renders when they change and is destroyed on unmount.
 * Give the parent element a height — the canvas fills its container.
 */
const props = defineProps({
    type: { type: String, required: true },
    data: { type: Object, required: true },
    options: { type: Object, default: () => ({}) },
});

const canvas = ref(null);
let chart = null;

const baseOptions = () => ({ responsive: true, maintainAspectRatio: false, ...props.options });

onMounted(() => {
    chart = new Chart(canvas.value, {
        type: props.type,
        data: props.data,
        options: baseOptions(),
    });
});

watch(
    () => [props.data, props.options],
    () => {
        if (! chart) {
            return;
        }

        chart.data = props.data;
        chart.options = baseOptions();
        chart.update();
    },
    { deep: true },
);

onBeforeUnmount(() => {
    chart?.destroy();
    chart = null;
});
</script>

<template>
    <div class="relative h-full w-full">
        <canvas ref="canvas" />
    </div>
</template>

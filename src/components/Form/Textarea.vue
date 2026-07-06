<script setup>
import { ref, onMounted, watch, nextTick } from 'vue';

defineOptions({ inheritAttrs: false });

const props = defineProps({
    modelValue: { type: String, default: '' },
    label: { type: String, default: '' },
    error: { type: String, default: '' },
    // Minimum visible rows; the field still auto-grows beyond this.
    rows: { type: Number, default: 1 },
});

const emit = defineEmits(['update:modelValue']);

const el = ref(null);

function resize() {
    const node = el.value;

    if (!node) {
        return;
    }

    node.style.height = 'auto';
    node.style.height = `${node.scrollHeight}px`;
}

function onInput(event) {
    emit('update:modelValue', event.target.value);
    resize();
}

onMounted(resize);
watch(() => props.modelValue, () => nextTick(resize));
</script>

<template>
    <div>
        <label v-if="label" class="mb-1 block text-sm font-medium text-gray-700">{{ label }}</label>
        <div class="relative">
            <textarea
                ref="el"
                v-bind="$attrs"
                :value="modelValue"
                :rows="rows"
                :style="rows > 1 ? { minHeight: `calc(${rows} * 1.5rem + 0.75rem)` } : null"
                class="block w-full resize-none overflow-hidden rounded border border-gray-300 px-2 py-1.5 pr-5 text-base font-normal leading-normal focus:border-red-500 focus:ring-1 focus:ring-red-500"
                @input="onInput"
            />
            <!-- Decorative resize-grip lines so it reads as a textarea. -->
            <svg
                class="pointer-events-none absolute bottom-1 right-1 h-3 w-3 text-gray-400"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                stroke-width="1.2"
                stroke-linecap="round"
            >
                <path d="M11 5L5 11" />
                <path d="M11 8.5L8.5 11" />
            </svg>
        </div>
        <p v-if="error" class="mt-1 text-xs text-red-600">{{ error }}</p>
    </div>
</template>

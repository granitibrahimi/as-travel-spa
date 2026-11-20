<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

// A select-style button that opens a list of checkboxes, for picking several
// values from a short fixed list (e.g. request sources). The v-model is the
// list of picked values; values are compared as strings, since ones read back
// from the URL arrive as strings or numbers.
const props = defineProps({
    modelValue: { type: Array, default: () => [] },
    // Options as [{ value, label }].
    options: { type: Array, default: () => [] },
    label: { type: String, default: '' },
    // Shown when nothing is picked.
    placeholder: { type: String, default: 'All' },
    disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);

const root = ref(null);
const open = ref(false);

const picked = computed(() => new Set(props.modelValue.map(String)));

const summary = computed(() => {
    const names = props.options.filter((option) => picked.value.has(String(option.value))).map((option) => option.label);

    if (names.length === 0) {
        return props.placeholder;
    }

    return names.length <= 2 ? names.join(', ') : `${names.length} selected`;
});

function toggle(option) {
    const key = String(option.value);
    // Keep the options' order, whatever order they were ticked in.
    const next = props.options
        .filter((candidate) => (String(candidate.value) === key ? ! picked.value.has(key) : picked.value.has(String(candidate.value))))
        .map((candidate) => candidate.value);

    emit('update:modelValue', next);
}

function clear() {
    emit('update:modelValue', []);
}

function onDocumentClick(event) {
    if (open.value && root.value && ! root.value.contains(event.target)) {
        open.value = false;
    }
}

onMounted(() => document.addEventListener('mousedown', onDocumentClick));
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocumentClick));
</script>

<template>
    <div ref="root" class="relative" @keydown.esc="open = false">
        <label v-if="label" class="mb-1 block text-sm font-medium text-gray-700">{{ label }}</label>
        <button
            type="button"
            class="flex w-full items-center justify-between gap-2 rounded border border-gray-300 bg-white py-1.5 pl-3 pr-2.5 text-left text-base font-normal leading-normal focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:bg-gray-100 disabled:text-gray-500"
            :disabled="disabled"
            :aria-expanded="open"
            aria-haspopup="listbox"
            @click="open = ! open"
        >
            <span class="truncate" :class="modelValue.length ? '' : 'text-gray-500'">{{ summary }}</span>
            <svg class="h-5 w-5 shrink-0 text-gray-500" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 8l4 4 4-4" />
            </svg>
        </button>
        <div
            v-if="open"
            class="absolute left-0 z-30 mt-1 w-full min-w-[12rem] rounded border border-gray-200 bg-white py-1 shadow-lg"
            role="listbox"
            aria-multiselectable="true"
        >
            <label
                v-for="option in options"
                :key="option.value"
                class="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
                <input
                    type="checkbox"
                    class="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    :checked="picked.has(String(option.value))"
                    @change="toggle(option)"
                >
                <slot name="option" :option="option">{{ option.label }}</slot>
            </label>
            <div v-if="modelValue.length" class="mt-1 border-t border-gray-100 px-3 pt-1.5 pb-1">
                <button type="button" class="text-xs text-red-600 hover:underline" @click="clear">Clear</button>
            </div>
        </div>
    </div>
</template>

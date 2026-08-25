<script setup>
import { ref, watch } from 'vue';

defineOptions({ inheritAttrs: false });

/**
 * A number field "pinned" to digits and a single decimal point — typing a
 * letter, comma, or a second "." is blocked outright rather than typed then
 * corrected. Renders as type="text" (not type="number") on purpose: native
 * number inputs re-render the decimal point using the OS/browser locale
 * (e.g. "1205,85" on a comma-locale machine) even though the value stays
 * dot-based underneath — confusing next to the rest of the app, which always
 * shows amounts with a period. Still emits a plain Number (or null when
 * empty) via v-model, so it's a drop-in replacement everywhere.
 */
const props = defineProps({
    modelValue: { type: [Number, String, null], default: null },
    label: { type: String, default: '' },
    error: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue']);

// A local text buffer decoupled from `modelValue` — otherwise casting to a
// Number on every keystroke (`Number("12.")` -> 12) would re-render the
// field without the trailing "." the user just typed, wiping it as they type.
const text = ref(props.modelValue === null || props.modelValue === undefined ? '' : String(props.modelValue));

// Stay in sync when the parent changes modelValue itself (e.g. resetting the
// form) — but not from our own emits, so mid-typing state is never clobbered.
watch(() => props.modelValue, (value) => {
    const next = value === null || value === undefined ? '' : String(value);

    if (next !== text.value) {
        text.value = next;
    }
});

// Block any keystroke/paste that would leave the field with something other
// than digits and at most one ".". Deletions (event.data === null) pass through.
function onBeforeInput(event) {
    if (event.data === null) {
        return;
    }

    const next = text.value.slice(0, event.target.selectionStart) + event.data + text.value.slice(event.target.selectionEnd);

    if (! /^\d*\.?\d*$/.test(next)) {
        event.preventDefault();
    }
}

function onInput(event) {
    text.value = event.target.value;
    emit('update:modelValue', text.value === '' ? null : Number(text.value));
}
</script>

<template>
    <div>
        <label v-if="label" class="mb-1 block text-sm font-medium text-gray-700">{{ label }}</label>
        <input
            v-bind="$attrs"
            :value="text"
            type="text"
            inputmode="decimal"
            class="w-full rounded border px-2 py-1.5 text-base font-normal leading-normal focus:border-red-500 focus:ring-1 focus:ring-red-500 disabled:bg-gray-100"
            :class="error ? 'border-red-500' : 'border-gray-300'"
            @beforeinput="onBeforeInput"
            @input="onInput"
        >
        <p v-if="error" class="mt-1 text-xs text-red-600">{{ error }}</p>
    </div>
</template>

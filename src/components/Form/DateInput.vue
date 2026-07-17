<script setup>
import { computed } from 'vue';
import { toInputDate, toApiDate } from '../../helpers/date';

// App-wide date field. The model value is the API's `d.m.Y` (e.g. 15.07.2026)
// so pages read/write dates in one format end-to-end — no per-page conversion.
// Internally it renders a native <input type="date"> (which speaks `Y-m-d` and
// shows the browser's own calendar picker); the d.m.Y <-> Y-m-d translation is
// hidden here.
defineOptions({ inheritAttrs: false });

const props = defineProps({
    modelValue: { type: [String, null], default: '' }, // d.m.Y
    label: { type: String, default: '' },
    error: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue']);

const inputValue = computed(() => toInputDate(props.modelValue));

function onInput(event) {
    emit('update:modelValue', toApiDate(event.target.value));
}
</script>

<template>
    <div>
        <label v-if="label" class="mb-1 block text-sm font-medium text-gray-700">{{ label }}</label>
        <input
            v-bind="$attrs"
            :value="inputValue"
            type="date"
            class="w-full rounded border border-gray-300 px-2 py-1.5 text-base font-normal leading-normal focus:border-red-500 focus:ring-1 focus:ring-red-500 disabled:bg-gray-100"
            @input="onInput"
        >
        <p v-if="error" class="mt-1 text-xs text-red-600">{{ error }}</p>
    </div>
</template>

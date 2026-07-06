<script setup>
defineOptions({ inheritAttrs: false });

const props = defineProps({
    modelValue: { type: [Number, String, null], default: null },
    // Options as [{ value, label }].
    options: { type: Array, default: () => [] },
    label: { type: String, default: '' },
    error: { type: String, default: '' },
    // Text for the empty option; pass null to omit the empty option entirely.
    placeholder: { type: String, default: 'Choose…' },
    disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);

function onChange(event) {
    const raw = event.target.value;

    if (raw === '') {
        emit('update:modelValue', null);
        return;
    }

    // Native selects yield strings — emit the original (typed) option value.
    const option = props.options.find((candidate) => String(candidate.value) === raw);
    emit('update:modelValue', option ? option.value : raw);
}
</script>

<template>
    <div>
        <label v-if="label" class="mb-1 block text-sm font-medium text-gray-700">{{ label }}</label>
        <select
            v-bind="$attrs"
            :value="modelValue ?? ''"
            :disabled="disabled"
            class="w-full appearance-none rounded border border-gray-300 bg-white py-1.5 pl-3 pr-10 text-base font-normal leading-normal focus:border-red-500 focus:ring-1 focus:ring-red-500 disabled:bg-gray-100 disabled:text-gray-500"
            @change="onChange"
        >
            <option v-if="placeholder !== null" value="">{{ placeholder }}</option>
            <option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
        <p v-if="error" class="mt-1 text-xs text-red-600">{{ error }}</p>
    </div>
</template>

<style scoped>
/* Custom chevron — appearance-none removes the native arrow (needed so the
   select follows the same padding/line-height box model as text inputs). */
select {
    background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E");
    background-position: right 0.625rem center;
    background-repeat: no-repeat;
    background-size: 1.25rem 1.25rem;
}
</style>

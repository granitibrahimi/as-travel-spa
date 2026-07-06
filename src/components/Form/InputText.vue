<script setup>
defineOptions({ inheritAttrs: false });

defineProps({
    modelValue: { type: [String, Number, null], default: '' },
    label: { type: String, default: '' },
    error: { type: String, default: '' },
    type: { type: String, default: 'text' },
});

defineEmits(['update:modelValue']);
</script>

<template>
    <div>
        <label v-if="label" class="mb-1 block text-sm font-medium text-gray-700">{{ label }}</label>
        <input
            v-bind="$attrs"
            :value="modelValue"
            :type="type"
            class="w-full rounded border border-gray-300 px-2 py-1.5 text-base font-normal leading-normal focus:border-red-500 focus:ring-1 focus:ring-red-500 disabled:bg-gray-100"
            @input="$emit('update:modelValue', $event.target.value)"
        >
        <p v-if="error" class="mt-1 text-xs text-red-600">{{ error }}</p>
    </div>
</template>

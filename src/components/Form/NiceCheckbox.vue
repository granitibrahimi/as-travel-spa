<script setup>
defineProps({
    modelValue: { type: Boolean, default: false },
    label: { type: String, default: '' },
    error: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
});

defineEmits(['update:modelValue']);
</script>

<template>
    <div>
        <label class="inline-flex items-center gap-2" :class="disabled ? 'cursor-not-allowed' : 'cursor-pointer'">
            <button
                type="button"
                role="switch"
                :aria-checked="modelValue"
                class="relative h-6 w-11 shrink-0 rounded-full align-middle transition-colors disabled:opacity-60"
                :class="modelValue ? 'bg-green-500' : 'bg-gray-300'"
                :disabled="disabled"
                @click="$emit('update:modelValue', !modelValue)"
            >
                <span
                    class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                    :class="modelValue ? 'translate-x-5' : ''"
                />
            </button>
            <span v-if="label" class="text-sm text-gray-700">{{ label }}</span>
        </label>
        <p v-if="error" class="mt-1 text-xs text-red-600">{{ error }}</p>
    </div>
</template>

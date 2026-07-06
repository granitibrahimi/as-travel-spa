<script setup>
import { ref } from 'vue';

const props = defineProps({
    modelValue: { type: Number, default: 0 },
    max: { type: Number, default: 6 },
});

const emit = defineEmits(['update:modelValue']);

const hover = ref(0);

function set(value) {
    // Clicking the current rating again clears it.
    emit('update:modelValue', value === props.modelValue ? 0 : value);
}
</script>

<template>
    <div class="flex items-center gap-1" @mouseleave="hover = 0">
        <button
            v-for="n in max"
            :key="n"
            type="button"
            class="text-2xl leading-none"
            :class="(hover || modelValue) >= n ? 'text-amber-400' : 'text-gray-300'"
            @mouseenter="hover = n"
            @click="set(n)"
        >
            ★
        </button>
        <span class="ml-2 text-sm text-gray-500">{{ modelValue || '—' }}</span>
    </div>
</template>

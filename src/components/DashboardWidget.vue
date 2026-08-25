<script setup>
import { ref } from 'vue';
import FullWidthBox from './FullWidthBox.vue';

/**
 * Card chrome for the admin dashboard: a FullWidthBox with a collapse/expand
 * control on the right — instead of FullWidthBox's own left-side chevron.
 * Reuse this for any new dashboard widget so the cards read as one system.
 */
defineProps({
    title: { type: String, required: true },
});

const collapsed = ref(false);
</script>

<template>
    <FullWidthBox :title="title" :collapsible="false" :collapsed="collapsed">
        <template #actions>
            <button
                type="button"
                class="text-gray-400 hover:text-gray-600"
                :aria-label="collapsed ? 'Expand' : 'Collapse'"
                @click="collapsed = ! collapsed"
            >
                <svg class="h-4 w-4 transition-transform" :class="collapsed ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
        </template>

        <slot />
    </FullWidthBox>
</template>

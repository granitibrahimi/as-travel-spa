<script setup>
import { ref } from 'vue';
import FullWidthBox from './FullWidthBox.vue';

/**
 * Card chrome for the admin dashboard: a FullWidthBox with two header
 * controls on the right — expand to fullscreen, and collapse/expand the
 * body — instead of FullWidthBox's own left-side collapse chevron. Reuse
 * this for any new dashboard widget so the cards read as one system.
 */
defineProps({
    title: { type: String, required: true },
});

const collapsed = ref(false);
const maximized = ref(false);
</script>

<template>
    <div :class="maximized ? 'fixed inset-4 z-50 overflow-auto' : ''">
        <div v-if="maximized" class="fixed inset-0 -z-10 bg-black/50" @click="maximized = false" />

        <FullWidthBox :title="title" :collapsible="false" :collapsed="collapsed">
            <template #actions>
                <button
                    type="button"
                    class="text-gray-400 hover:text-gray-600"
                    :aria-label="maximized ? 'Restore' : 'Expand'"
                    @click="maximized = ! maximized"
                >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9M20.25 20.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                    </svg>
                </button>
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
    </div>
</template>

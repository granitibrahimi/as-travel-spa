<script setup>
/**
 * Slide-down container for a list's filters, toggled by FiltersButton.
 * Animates via grid-template-rows (0fr ↔ 1fr), so no fixed height is needed.
 * Overflow is only clipped while moving/closed, so select dropdowns inside
 * can spill out once it has settled open.
 */
import { ref, watch } from 'vue';

const props = defineProps({
    open: {
        type: Boolean,
        default: false,
    },
});

const settled = ref(props.open);

watch(() => props.open, () => {
    settled.value = false;
});
</script>

<template>
    <div
        class="grid transition-[grid-template-rows] duration-300 ease-out"
        :class="open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
        @transitionend.self="settled = open"
    >
        <div class="min-h-0" :class="open && settled ? 'overflow-visible' : 'overflow-hidden'" :inert="! open">
            <div
                class="mb-4 rounded-md border border-gray-200 bg-gray-50 p-4 transition-opacity duration-300"
                :class="open ? 'opacity-100' : 'opacity-0'"
            >
                <slot />
            </div>
        </div>
    </div>
</template>

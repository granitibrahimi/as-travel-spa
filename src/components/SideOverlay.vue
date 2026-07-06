<script setup>
import { onBeforeUnmount, onMounted, watch } from 'vue';

/**
 * Right-hand slide-over panel — the Inertia counterpart of the legacy
 * #side-overlay aside. Teleported to <body>, so any page can use it without
 * layout wiring:
 *
 *   <SideOverlay :show="Boolean(selected)" :title="selected?.name" @close="selected = null">
 *       ...anything...
 *   </SideOverlay>
 */
const props = defineProps({
    show: { type: Boolean, required: true },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
});

const emit = defineEmits(['close']);

function onKeydown(event) {
    if (event.key === 'Escape' && props.show) {
        emit('close');
    }
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown);
    document.body.style.overflow = '';
});

// Lock page scroll while the overlay is open.
watch(() => props.show, (open) => {
    document.body.style.overflow = open ? 'hidden' : '';
});
</script>

<template>
    <Teleport to="body">
        <Transition name="overlay-fade">
            <div v-if="show" class="fixed inset-0 z-40 bg-black/30" @click="emit('close')" />
        </Transition>

        <Transition name="overlay-slide">
            <aside
                v-if="show"
                class="fixed inset-y-0 right-0 z-50 flex w-96 max-w-[90vw] flex-col bg-white shadow-2xl"
                role="dialog"
                aria-modal="true"
            >
                <header class="flex items-start justify-between gap-3 border-b border-gray-200 px-5 py-4">
                    <div class="min-w-0">
                        <h2 class="truncate text-base font-semibold text-gray-900">{{ title }}</h2>
                        <p v-if="subtitle" class="mt-0.5 truncate text-xs text-gray-500">{{ subtitle }}</p>
                    </div>
                    <button
                        type="button"
                        class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        aria-label="Close"
                        @click="emit('close')"
                    >
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>

                <div class="flex-1 overflow-y-auto px-5 py-4">
                    <slot />
                </div>

                <footer v-if="$slots.footer" class="border-t border-gray-200 px-5 py-3">
                    <slot name="footer" />
                </footer>
            </aside>
        </Transition>
    </Teleport>
</template>

<style scoped>
.overlay-fade-enter-active,
.overlay-fade-leave-active {
    transition: opacity 0.2s ease;
}

.overlay-fade-enter-from,
.overlay-fade-leave-to {
    opacity: 0;
}

.overlay-slide-enter-active,
.overlay-slide-leave-active {
    transition: transform 0.25s ease;
}

.overlay-slide-enter-from,
.overlay-slide-leave-to {
    transform: translateX(100%);
}
</style>

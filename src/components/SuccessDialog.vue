<script setup>
import { watch, onBeforeUnmount } from 'vue';
import Button from './Button.vue';

const props = defineProps({
    show: { type: Boolean, default: false },
    title: { type: String, default: 'Success' },
    message: { type: String, default: '' },
    closeLabel: { type: String, default: 'OK' },
});

const emit = defineEmits(['close']);

const close = () => emit('close');

// Enter or Escape dismisses — active only while the dialog is open.
function onKeydown(event) {
    if (['Enter', 'Escape'].includes(event.key)) {
        event.preventDefault();
        close();
    }
}

watch(() => props.show, (open) => {
    if (open) {
        document.addEventListener('keydown', onKeydown);
    } else {
        document.removeEventListener('keydown', onKeydown);
    }
});

onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));
</script>

<template>
    <Teleport to="body">
        <Transition name="success-dialog">
            <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div class="absolute inset-0 bg-black/50" @click="close" />

                <div
                    role="alertdialog"
                    aria-modal="true"
                    class="success-dialog-card relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
                >
                    <div class="flex items-start gap-3">
                        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
                            <svg class="h-5 w-5 text-green-600" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </span>
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900">{{ title }}</h3>
                            <p v-if="message" class="mt-2 text-sm text-gray-600">{{ message }}</p>
                        </div>
                    </div>

                    <div class="mt-6 flex justify-end">
                        <Button variant="primary" @click="close">{{ closeLabel }}</Button>
                    </div>

                    <p class="mt-4 text-xs text-gray-400">
                        Press <kbd class="rounded border border-gray-300 px-1">Enter</kbd> or
                        <kbd class="rounded border border-gray-300 px-1">Esc</kbd> to close
                    </p>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.success-dialog-enter-active,
.success-dialog-leave-active {
    transition: opacity 0.15s ease;
}

.success-dialog-enter-active .success-dialog-card,
.success-dialog-leave-active .success-dialog-card {
    transition: transform 0.15s ease;
}

.success-dialog-enter-from,
.success-dialog-leave-to {
    opacity: 0;
}

.success-dialog-enter-from .success-dialog-card,
.success-dialog-leave-to .success-dialog-card {
    transform: scale(0.95);
}
</style>

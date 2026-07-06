<script setup>
import { watch, onBeforeUnmount } from 'vue';
import Button from './Button.vue';

const props = defineProps({
    show: { type: Boolean, default: false },
    title: { type: String, default: 'Are you sure?' },
    message: { type: String, default: '' },
    confirmLabel: { type: String, default: 'Yes' },
    cancelLabel: { type: String, default: 'Cancel' },
    // Variant of the confirm button ('primary' | 'secondary' | 'danger').
    confirmVariant: { type: String, default: 'primary' },
    // While true the whole dialog is locked: buttons disabled, keys and backdrop ignored.
    processing: { type: Boolean, default: false },
});

const emit = defineEmits(['confirm', 'cancel']);

function confirm() {
    if (! props.processing) {
        emit('confirm');
    }
}

function cancel() {
    if (! props.processing) {
        emit('cancel');
    }
}

// Enter confirms, Escape cancels — active only while the dialog is open.
function onKeydown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        confirm();
    } else if (event.key === 'Escape') {
        cancel();
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
        <Transition name="confirm-dialog">
            <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div class="absolute inset-0 bg-black/50" @click="cancel" />

                <div
                    role="dialog"
                    aria-modal="true"
                    class="confirm-dialog-card relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
                    :class="{ 'pointer-events-none opacity-75': processing }"
                >
                    <h3 class="text-lg font-semibold text-gray-900">{{ title }}</h3>
                    <p v-if="message" class="mt-2 text-sm text-gray-600">{{ message }}</p>
                    <slot />

                    <div class="mt-6 flex justify-end gap-3">
                        <Button :disabled="processing" @click="cancel">{{ cancelLabel }}</Button>
                        <Button :variant="confirmVariant" :disabled="processing" @click="confirm">
                            {{ processing ? 'Working…' : confirmLabel }}
                        </Button>
                    </div>

                    <p class="mt-4 text-xs text-gray-400">
                        Press <kbd class="rounded border border-gray-300 px-1">Enter</kbd> to confirm ·
                        <kbd class="rounded border border-gray-300 px-1">Esc</kbd> to cancel
                    </p>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.confirm-dialog-enter-active,
.confirm-dialog-leave-active {
    transition: opacity 0.15s ease;
}

.confirm-dialog-enter-active .confirm-dialog-card,
.confirm-dialog-leave-active .confirm-dialog-card {
    transition: transform 0.15s ease;
}

.confirm-dialog-enter-from,
.confirm-dialog-leave-to {
    opacity: 0;
}

.confirm-dialog-enter-from .confirm-dialog-card,
.confirm-dialog-leave-to .confirm-dialog-card {
    transform: scale(0.95);
}
</style>

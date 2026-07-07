<script setup>
import { useNotificationsStore } from '../stores/notifications';

// Renders the live toast stack. Toasts are added by the notifications store
// (from real-time broadcasts or local push() calls) and auto-dismiss.
const notifications = useNotificationsStore();

// Left accent + icon color per toast type.
const accents = {
    success: 'border-l-green-500 text-green-600',
    error: 'border-l-red-500 text-red-600',
    warning: 'border-l-amber-500 text-amber-600',
    info: 'border-l-blue-500 text-blue-600',
};

const accent = (type) => accents[type] ?? accents.info;

// Clicking a toast with an action URL opens it (new tab) and marks it seen.
function open(toast) {
    if (!toast.url) {
        return;
    }

    window.open(toast.url, '_blank', 'noopener');
    notifications.dismiss(toast.id, { markSeen: true });
}
</script>

<template>
    <Teleport to="body">
        <div class="pointer-events-none fixed right-4 top-4 z-[110] flex w-full max-w-sm flex-col gap-2">
            <TransitionGroup
                enter-active-class="transition duration-200 ease-out"
                enter-from-class="translate-x-4 opacity-0"
                enter-to-class="translate-x-0 opacity-100"
                leave-active-class="transition duration-150 ease-in"
                leave-from-class="opacity-100"
                leave-to-class="translate-x-4 opacity-0"
            >
                <div
                    v-for="toast in notifications.toasts"
                    :key="toast.id"
                    class="pointer-events-auto flex items-start gap-3 rounded-md border border-l-4 border-gray-200 bg-white p-3 shadow-lg"
                    :class="[accent(toast.type), toast.url ? 'cursor-pointer hover:bg-gray-50' : '']"
                    role="status"
                    @click="open(toast)"
                >
                    <div class="min-w-0 flex-1">
                        <p v-if="toast.title" class="text-sm font-semibold text-gray-900">{{ toast.title }}</p>
                        <p v-if="toast.message" class="break-words text-sm text-gray-600">{{ toast.message }}</p>
                        <p v-if="toast.by" class="mt-0.5 text-xs text-gray-400">by {{ toast.by }}</p>
                    </div>
                    <button
                        type="button"
                        class="-mr-1 -mt-1 shrink-0 rounded p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                        aria-label="Dismiss"
                        @click.stop="notifications.dismiss(toast.id, { markSeen: true })"
                    >
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M6 18L18 6" />
                        </svg>
                    </button>
                </div>
            </TransitionGroup>
        </div>
    </Teleport>
</template>

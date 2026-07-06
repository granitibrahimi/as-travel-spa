<script setup>
import { useIdleStore } from '../stores/idle';

// A blocking modal shown for the final seconds before idle auto-logout. The
// "I'm here" button resets the inactivity timer.
const idle = useIdleStore();
</script>

<template>
    <Teleport to="body">
        <div
            v-if="idle.warning"
            class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="idle-warning-title"
        >
            <div class="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-2xl">
                <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-2xl font-bold text-amber-600">
                    {{ idle.secondsLeft }}
                </div>

                <h2 id="idle-warning-title" class="text-lg font-bold text-gray-900">Still there?</h2>
                <p class="mt-1 text-sm text-gray-600">
                    You'll be signed out in
                    <span class="font-semibold text-gray-900">{{ idle.secondsLeft }}</span>
                    second<span v-if="idle.secondsLeft !== 1">s</span> due to inactivity.
                </p>

                <button
                    type="button"
                    class="mt-5 w-full rounded bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
                    @click="idle.stayActive"
                >
                    I'm here
                </button>
            </div>
        </div>
    </Teleport>
</template>

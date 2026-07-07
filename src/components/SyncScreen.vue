<script setup>
import { computed, watch } from 'vue';
import { useFormOptionsStore } from '../stores/formOptions';

// Progressive "syncing reference data" overlay. Driven entirely by the
// formOptions store's sync state; shown on first login and on the manual
// "Update data" action.
const formOptions = useFormOptionsStore();

const heading = computed(() => {
    if (formOptions.status === 'syncing') {
        return 'Updating data…';
    }

    if (formOptions.status === 'error') {
        return 'Some updates failed';
    }

    return 'Up to date';
});

const finished = computed(() => formOptions.status === 'done' || formOptions.status === 'error');

// Auto-dismiss shortly after a fully successful sync; leave it up on error so
// the user can read it and close manually.
watch(() => formOptions.status, (status) => {
    if (status === 'done' && formOptions.showScreen) {
        setTimeout(() => {
            if (formOptions.status === 'done') {
                formOptions.dismiss();
            }
        }, 500);
    }
});
</script>

<template>
    <Teleport to="body">
        <div
            v-if="formOptions.showScreen"
            class="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Updating data"
        >
            <div class="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
                <h2 class="mb-4 text-center text-lg font-bold text-gray-900">{{ heading }}</h2>

                <ul class="space-y-2">
                    <li
                        v-for="item in formOptions.progress"
                        :key="item.key"
                        class="flex items-center gap-3 text-sm"
                    >
                        <!-- Pending -->
                        <span v-if="item.state === 'pending'" class="h-4 w-4 shrink-0 rounded-full border-2 border-gray-200" />
                        <!-- Updating (spinner) -->
                        <svg v-else-if="item.state === 'updating'" class="h-4 w-4 shrink-0 animate-spin text-red-500" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        <!-- Done -->
                        <svg v-else-if="item.state === 'done'" class="h-4 w-4 shrink-0 text-green-500" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <!-- Error -->
                        <svg v-else class="h-4 w-4 shrink-0 text-red-500" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M6 18L18 6" />
                        </svg>

                        <span
                            class="flex-1"
                            :class="item.state === 'done' ? 'text-gray-700' : item.state === 'error' ? 'text-red-600' : 'text-gray-500'"
                        >
                            {{ item.state === 'done' ? 'Updated ' : item.state === 'updating' ? 'Updating ' : '' }}{{ item.label }}
                        </span>
                    </li>
                </ul>

                <button
                    v-if="finished"
                    type="button"
                    class="mt-5 w-full rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                    @click="formOptions.dismiss()"
                >
                    Done
                </button>
            </div>
        </div>
    </Teleport>
</template>

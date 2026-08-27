<script setup>
import { computed, watch } from 'vue';
import { useFormOptionsStore } from '../stores/formOptions';
import Loader from './Loader.vue';

// "Loading data" overlay shown while the shared reference data syncs — on first
// login and on the manual "Update data" action. Driven entirely by the
// formOptions store's sync state.
const formOptions = useFormOptionsStore();

const failed = computed(() => formOptions.status === 'error');

// Auto-dismiss once a sync finishes cleanly; on error leave it up with a Done
// button so the user can read it and close it manually.
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
            aria-label="Loading data"
        >
            <div class="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
                <h2 class="text-center text-lg font-bold text-gray-900">
                    {{ failed ? 'Some updates failed' : 'Loading Data' }}
                </h2>

                <Loader v-if="! failed" />

                <button
                    v-if="failed"
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

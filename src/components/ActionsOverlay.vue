<script setup>
import { ref } from 'vue';
import api from '../helpers/api';
import SideOverlay from './SideOverlay.vue';
import ConfirmDialog from './ConfirmDialog.vue';

/**
 * SideOverlay rendering grouped record actions as served by the API. Each item
 * is { label, url, type, reference?, confirm?, blank? } where type is one of:
 *   - link      navigate (Inertia is not used; plain anchor). `blank` opens a tab.
 *   - external  open in a new tab with an ↗ marker
 *   - post      confirm, then Inertia POST { reference } (follows redirects)
 *   - copy      POST to url, copy the returned { url } to the clipboard
 *   - delete    confirm, then Inertia DELETE { reference }
 * Extra content goes in the default slot.
 */
const props = defineProps({
    show: { type: Boolean, required: true },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    groups: { type: Array, default: () => [] },
    deleteMessage: { type: String, default: 'This record will be permanently deleted.' },
});

const emit = defineEmits(['close', 'done']);

// Pending confirmable action (delete or post).
const pending = ref(null);
const processing = ref(false);

// Transient per-action label overrides (e.g. "Copied!").
const feedback = ref({});

async function runPending() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    const action = pending.value;

    try {
        if (action.type === 'delete') {
            await api.delete(action.url, { data: { reference: action.reference } });
        } else {
            await api.post(action.url, { reference: action.reference });
        }

        emit('done');
        emit('close');
    } finally {
        processing.value = false;
        pending.value = null;
    }
}

async function copyLink(action) {
    try {
        const { data } = await api.post(action.url);
        await navigator.clipboard.writeText(data.url);
        feedback.value = { ...feedback.value, [action.label]: 'Copied!' };
    } catch {
        feedback.value = { ...feedback.value, [action.label]: 'Failed — retry' };
    } finally {
        setTimeout(() => {
            const next = { ...feedback.value };
            delete next[action.label];
            feedback.value = next;
        }, 2500);
    }
}
</script>

<template>
    <SideOverlay :show="show" :title="title" :subtitle="subtitle" @close="emit('close')">
        <div class="space-y-6">
            <slot />

            <div v-for="(group, i) in groups" :key="i">
                <p v-if="group.label" class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{{ group.label }}</p>
                <div class="space-y-1.5">
                    <template v-for="action in group.items" :key="action.label">
                        <button
                            v-if="action.type === 'delete'"
                            type="button"
                            class="block w-full rounded border border-red-200 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                            @click="pending = action"
                        >
                            {{ action.label }}
                        </button>
                        <button
                            v-else-if="action.type === 'post'"
                            type="button"
                            class="block w-full rounded border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                            @click="pending = action"
                        >
                            {{ action.label }}
                        </button>
                        <button
                            v-else-if="action.type === 'copy'"
                            type="button"
                            class="block w-full rounded border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                            @click="copyLink(action)"
                        >
                            {{ feedback[action.label] ?? action.label }}
                        </button>
                        <a
                            v-else
                            :href="action.url"
                            :target="action.type === 'external' || action.blank ? '_blank' : undefined"
                            class="block w-full rounded border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                        >
                            {{ action.label }}
                            <span v-if="action.type === 'external'" class="text-gray-400">↗</span>
                        </a>
                    </template>
                </div>
            </div>
        </div>
    </SideOverlay>

    <ConfirmDialog
        :show="Boolean(pending)"
        title="Are you sure?"
        :message="pending?.confirm ?? deleteMessage"
        :confirm-label="pending?.type === 'delete' ? 'Yes, delete' : 'Yes, continue'"
        :processing="processing"
        @confirm="runPending"
        @cancel="pending = null"
    />
</template>
